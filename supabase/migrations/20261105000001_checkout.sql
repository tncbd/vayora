-- Phase 5: server-side cart pricing, coupons and order placement.
-- Additive and safe on a project that already has Phases 2-4 applied.
--
--   quote_order()  public, read-only: prices a cart from the database (never from the browser)
--   place_order()  service_role only: called by the `place-order` Edge Function; atomically
--                  re-prices, validates coupon + stock, reserves stock and writes the order.

alter table public.orders add column if not exists idempotency_key text;
create unique index if not exists orders_idempotency_idx
  on public.orders (idempotency_key) where idempotency_key is not null;

-- ---------- internal pricing engine ----------
create or replace function public._quote(
  p_items jsonb, p_district text, p_coupon text, p_user_id uuid, p_phone text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lines jsonb;
  v_subtotal numeric(12, 2);
  v_all_ok boolean;
  v_discount numeric(12, 2) := 0;
  v_zone record;
  v_zone_id uuid;
  v_zone_name text;
  v_dmin integer;
  v_dmax integer;
  v_coupon_id uuid;
  v_coupon record;
  v_charge numeric(12, 2) := 0;
  v_free boolean := false;
  v_coupon_err text;
  v_delivery_err text;
  v_adv boolean;
  v_code text := upper(trim(coalesce(p_coupon, '')));
  v_ok boolean;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'Your cart is empty or invalid.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) e
    where jsonb_typeof(e) <> 'object'
       or coalesce(e ->> 'variant_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or case when coalesce(e ->> 'quantity', '') ~ '^[0-9]{1,2}$' then (e ->> 'quantity')::int else 0 end not between 1 and 50
  ) then
    raise exception 'Your cart is empty or invalid.';
  end if;

  with req as (
    select (e ->> 'variant_id')::uuid as vid, least(sum((e ->> 'quantity')::int), 50)::int as qty
    from jsonb_array_elements(p_items) e
    group by 1
  ),
  l as (
    select r.vid, r.qty, p.id as pid, p.name, p.slug, v.sku, v.size, v.color,
           coalesce(v.price, p.selling_price) as price,
           greatest(coalesce(i.quantity, 0) - coalesce(i.reserved, 0), 0) as avail,
           (v.id is not null and v.is_active and p.status = 'active') as sellable,
           (select im.url from public.product_images im where im.product_id = p.id
             order by im.is_main desc, im.sort_order limit 1) as img
    from req r
    left join public.product_variants v on v.id = r.vid
    left join public.products p on p.id = v.product_id
    left join public.inventory i on i.variant_id = v.id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'variant_id', vid, 'product_id', pid, 'product_name', coalesce(name, 'Unavailable item'),
           'slug', slug, 'sku', sku, 'size', size, 'color', color, 'image_url', img,
           'unit_price', case when sellable then price else 0 end,
           'quantity', qty,
           'line_total', case when sellable then price * qty else 0 end,
           'available', case when sellable then avail else 0 end,
           'status', case when not sellable then 'unavailable' when avail < qty then 'insufficient' else 'ok' end
         ) order by name, size, color), '[]'::jsonb),
         coalesce(sum(case when sellable and avail >= qty then price * qty end), 0),
         coalesce(bool_and(sellable and avail >= qty), false)
    into v_lines, v_subtotal, v_all_ok
  from l;

  -- coupon
  if v_code <> '' then
    select * into v_coupon from public.coupons where code = v_code;
    if not found then
      v_coupon_err := 'This coupon is not valid.';
    elsif not v_coupon.is_active
       or (v_coupon.starts_at is not null and v_coupon.starts_at > now())
       or (v_coupon.expires_at is not null and v_coupon.expires_at <= now())
       or (v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit) then
      v_coupon_err := 'This coupon is not valid.';
    elsif v_subtotal < v_coupon.min_order_value then
      v_coupon_err := 'This coupon needs a minimum order of ৳' || trim(to_char(v_coupon.min_order_value, 'FM999999990.##')) || '.';
    elsif v_coupon.per_customer_limit is not null and (
      select count(*) from public.coupon_usages cu
      where cu.coupon_id = v_coupon.id
        and ((p_user_id is not null and cu.user_id = p_user_id) or (p_phone is not null and cu.phone = p_phone))
    ) >= v_coupon.per_customer_limit then
      v_coupon_err := 'You have already used this coupon.';
    else
      v_coupon_id := v_coupon.id;
      if v_coupon.type = 'percentage' then
        v_discount := round(v_subtotal * v_coupon.value / 100, 2);
        if v_coupon.max_discount is not null then v_discount := least(v_discount, v_coupon.max_discount); end if;
      else
        v_discount := v_coupon.value;
      end if;
      v_discount := least(v_discount, v_subtotal);
    end if;
  end if;

  -- delivery zone: highest priority active zone that lists the district, or an all-districts zone
  if nullif(trim(coalesce(p_district, '')), '') is not null then
    select * into v_zone
    from public.delivery_zones z
    where z.is_active
      and (cardinality(z.districts) = 0
           or lower(trim(p_district)) = any (select lower(d) from unnest(z.districts) d))
    order by z.priority desc, z.sort_order, z.created_at
    limit 1;
    if not found then
      v_delivery_err := 'We do not deliver to this district yet.';
    else
      v_zone_id := v_zone.id; v_zone_name := v_zone.name;
      v_dmin := v_zone.estimated_days_min; v_dmax := v_zone.estimated_days_max;
      v_charge := v_zone.charge;
      if v_zone.free_delivery_threshold is not null and v_subtotal - v_discount >= v_zone.free_delivery_threshold then
        v_charge := 0;
        v_free := true;
      end if;
    end if;
  end if;

  v_adv := coalesce((select value = 'true'::jsonb from public.site_settings where key = 'delivery_advance_required'), false)
           and v_charge > 0;
  v_ok := v_all_ok and v_coupon_err is null and v_delivery_err is null;

  return jsonb_build_object(
    'ok', v_ok,
    'lines', v_lines,
    'subtotal', v_subtotal,
    'discount_total', case when v_coupon_err is null then v_discount else 0 end,
    'delivery_charge', v_charge,
    'free_delivery', v_free,
    'delivery_zone_id', v_zone_id,
    'delivery_zone_name', v_zone_name,
    'estimated_days_min', v_dmin,
    'estimated_days_max', v_dmax,
    'delivery_error', v_delivery_err,
    'coupon_code', case when v_code <> '' and v_coupon_err is null then v_code else null end,
    'coupon_id', case when v_code <> '' and v_coupon_err is null then v_coupon_id else null end,
    'coupon_error', v_coupon_err,
    'total', v_subtotal - case when v_coupon_err is null then v_discount else 0 end + v_charge,
    'advance_required', v_adv
  );
end
$$;

-- ---------- public quote (read-only) ----------
create or replace function public.quote_order(
  p_items jsonb, p_district text default null, p_coupon text default null, p_phone text default null
) returns jsonb
language sql
security definer
set search_path = ''
as $$
  select (public._quote(p_items, p_district, p_coupon, auth.uid(), p_phone)) - 'coupon_id';
$$;

-- ---------- order placement (Edge Function only) ----------
create or replace function public.place_order(
  p_user_id uuid, p_customer jsonb, p_items jsonb, p_coupon text,
  p_expected_total numeric default null, p_idempotency_key text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c jsonb := coalesce(p_customer, '{}'::jsonb);
  v_name text := trim(coalesce(c ->> 'name', ''));
  v_phone text := coalesce(c ->> 'phone', '');
  v_alt text := nullif(coalesce(c ->> 'alt_phone', ''), '');
  v_email text := nullif(trim(coalesce(c ->> 'email', '')), '');
  v_district text := trim(coalesce(c ->> 'district', ''));
  v_area text := trim(coalesce(c ->> 'area', ''));
  v_address text := trim(coalesce(c ->> 'address', ''));
  v_instr text := nullif(trim(coalesce(c ->> 'delivery_instructions', '')), '');
  v_notes text := nullif(trim(coalesce(c ->> 'notes', '')), '');
  v_guest_ok boolean;
  v_q jsonb;
  v_line jsonb;
  v_status public.order_status := 'pending_order_review';
  v_status_setting text;
  v_order public.orders;
  v_existing public.orders;
  v_code text := upper(trim(coalesce(p_coupon, '')));
begin
  if p_idempotency_key is not null then
    if p_idempotency_key !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Invalid request.';
    end if;
    select * into v_existing from public.orders where idempotency_key = p_idempotency_key;
    if found then
      return jsonb_build_object('order_id', v_existing.id, 'order_number', v_existing.order_number,
        'tracking_token', v_existing.tracking_token, 'subtotal', v_existing.subtotal,
        'discount_total', v_existing.discount_total, 'delivery_charge', v_existing.delivery_charge,
        'total', v_existing.total, 'advance_amount', v_existing.advance_amount,
        'cod_amount', v_existing.cod_amount, 'status', v_existing.status, 'duplicate', true);
    end if;
  end if;

  v_guest_ok := coalesce((select value = 'true'::jsonb from public.site_settings where key = 'allow_guest_checkout'), true);
  if p_user_id is null and not v_guest_ok then
    raise exception 'Please sign in to place an order.';
  end if;

  if length(v_name) < 2 or length(v_name) > 120 then raise exception 'Enter your full name.'; end if;
  if v_phone !~ '^01[3-9][0-9]{8}$' then raise exception 'Enter a valid Bangladeshi mobile number.'; end if;
  if v_alt is not null and v_alt !~ '^01[3-9][0-9]{8}$' then raise exception 'The alternative phone number is not valid.'; end if;
  if v_email is not null and (length(v_email) > 200 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then raise exception 'Enter a valid email address.'; end if;
  if v_district = '' then raise exception 'Select your district.'; end if;
  if length(v_area) < 2 or length(v_area) > 120 then raise exception 'Enter your area.'; end if;
  if length(v_address) < 5 or length(v_address) > 300 then raise exception 'Enter your full delivery address.'; end if;
  if length(coalesce(v_instr, '')) > 500 or length(coalesce(v_notes, '')) > 500 then raise exception 'Notes are too long (max 500 characters).'; end if;

  -- serialise concurrent use of the same coupon so usage limits cannot be exceeded
  if v_code <> '' then
    perform 1 from public.coupons where code = v_code for update;
  end if;

  v_q := public._quote(p_items, v_district, v_code, p_user_id, v_phone);

  if v_q ->> 'delivery_error' is not null then raise exception '%', v_q ->> 'delivery_error'; end if;
  if v_q ->> 'coupon_error' is not null then raise exception '%', v_q ->> 'coupon_error'; end if;
  if not (v_q ->> 'ok')::boolean then
    raise exception 'Some items are no longer available in the quantity you chose. Please review your cart.';
  end if;
  if (v_q ->> 'advance_required')::boolean then
    raise exception 'Advance delivery-charge payment is not available yet. Please try again later.';
  end if;
  if p_expected_total is not null and p_expected_total <> (v_q ->> 'total')::numeric then
    raise exception 'Prices changed. Please review your updated total.';
  end if;

  select value #>> '{}' into v_status_setting from public.site_settings where key = 'order_status_without_advance';
  if v_status_setting in ('pending_order_review', 'confirmed') then v_status := v_status_setting::public.order_status; end if;

  -- reserve stock (atomic: any failure rolls the whole order back)
  begin
    for v_line in select * from jsonb_array_elements(v_q -> 'lines') loop
      perform public.reserve_stock((v_line ->> 'variant_id')::uuid, (v_line ->> 'quantity')::int);
    end loop;
  exception when others then
    raise exception 'Some items just went out of stock. Please review your cart.';
  end;

  insert into public.orders (
    user_id, customer_name, phone, alt_phone, email, district, area, address,
    delivery_instructions, notes, delivery_zone_id, coupon_id, coupon_code,
    subtotal, discount_total, delivery_charge, total, advance_amount, cod_amount, status, idempotency_key
  ) values (
    p_user_id, v_name, v_phone, v_alt, v_email, v_district, v_area, v_address,
    v_instr, v_notes, nullif(v_q ->> 'delivery_zone_id', '')::uuid, nullif(v_q ->> 'coupon_id', '')::uuid,
    v_q ->> 'coupon_code',
    (v_q ->> 'subtotal')::numeric, (v_q ->> 'discount_total')::numeric, (v_q ->> 'delivery_charge')::numeric,
    (v_q ->> 'total')::numeric, 0, (v_q ->> 'total')::numeric, v_status, p_idempotency_key
  ) returning * into v_order;

  insert into public.order_items (order_id, product_id, variant_id, product_name, sku, size, color, image_url, unit_price, quantity, line_total)
  select v_order.id, (l ->> 'product_id')::uuid, (l ->> 'variant_id')::uuid, l ->> 'product_name', l ->> 'sku',
         l ->> 'size', l ->> 'color', l ->> 'image_url', (l ->> 'unit_price')::numeric, (l ->> 'quantity')::int,
         (l ->> 'line_total')::numeric
  from jsonb_array_elements(v_q -> 'lines') l;

  if v_q ->> 'coupon_id' is not null then
    insert into public.coupon_usages (coupon_id, order_id, user_id, phone, discount_amount)
    values ((v_q ->> 'coupon_id')::uuid, v_order.id, p_user_id, v_phone, v_order.discount_total);
    update public.coupons set used_count = used_count + 1 where id = (v_q ->> 'coupon_id')::uuid;
  end if;

  return jsonb_build_object('order_id', v_order.id, 'order_number', v_order.order_number,
    'tracking_token', v_order.tracking_token, 'subtotal', v_order.subtotal,
    'discount_total', v_order.discount_total, 'delivery_charge', v_order.delivery_charge,
    'total', v_order.total, 'advance_amount', v_order.advance_amount,
    'cod_amount', v_order.cod_amount, 'status', v_order.status, 'duplicate', false);
end
$$;

-- ---------- privileges ----------
revoke all on function public._quote(jsonb, text, text, uuid, text) from public, anon, authenticated;
revoke all on function public.quote_order(jsonb, text, text, text) from public;
grant execute on function public.quote_order(jsonb, text, text, text) to anon, authenticated;
revoke all on function public.place_order(uuid, jsonb, jsonb, text, numeric, text) from public, anon, authenticated;
grant execute on function public.place_order(uuid, jsonb, jsonb, text, numeric, text) to service_role;
