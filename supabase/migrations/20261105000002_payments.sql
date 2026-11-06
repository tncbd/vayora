-- Phase 6: manual advance delivery-charge payment (bKash / Nagad / Upay), unpaid-order expiry.
-- Payments are NEVER verified automatically: staff compare the transaction and call verify_payment().
-- Additive; replaces place_order() and quote_order() from Phase 5 (create or replace).

insert into public.site_settings (key, value) values ('advance_payment_window_hours', '24')
on conflict (key) do nothing;

-- quote now also reports how the total splits between advance payment and cash on delivery
create or replace function public.quote_order(
  p_items jsonb, p_district text default null, p_coupon text default null, p_phone text default null
) returns jsonb
language sql
security definer
set search_path = ''
as $$
  select q || jsonb_build_object(
           'advance_amount', case when (q ->> 'advance_required')::boolean then (q ->> 'delivery_charge')::numeric else 0 end,
           'cod_amount', (q ->> 'total')::numeric - case when (q ->> 'advance_required')::boolean then (q ->> 'delivery_charge')::numeric else 0 end)
  from (select public._quote(p_items, p_district, p_coupon, auth.uid(), p_phone) - 'coupon_id' as q) s;
$$;
revoke all on function public.quote_order(jsonb, text, text, text) from public;
grant execute on function public.quote_order(jsonb, text, text, text) to anon, authenticated;

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
  v_adv_amt numeric(12, 2) := 0;
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
  if (v_q ->> 'advance_required')::boolean and not exists (
       select 1 from public.payment_methods where is_enabled and merchant_number is not null) then
    raise exception 'Advance payment is temporarily unavailable. Please try again later.';
  end if;
  if p_expected_total is not null and p_expected_total <> (v_q ->> 'total')::numeric then
    raise exception 'Prices changed. Please review your updated total.';
  end if;

  select value #>> '{}' into v_status_setting from public.site_settings where key = 'order_status_without_advance';
  if v_status_setting in ('pending_order_review', 'confirmed') then v_status := v_status_setting::public.order_status; end if;
  -- advance delivery-charge payment: the order waits for a manually verified bKash/Nagad/Upay payment
  if (v_q ->> 'advance_required')::boolean then
    v_adv_amt := (v_q ->> 'delivery_charge')::numeric;
    v_status := 'pending_payment_verification';
  end if;

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
    (v_q ->> 'total')::numeric, v_adv_amt, (v_q ->> 'total')::numeric - v_adv_amt, v_status, p_idempotency_key
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

revoke all on function public.place_order(uuid, jsonb, jsonb, text, numeric, text) from public, anon, authenticated;
grant execute on function public.place_order(uuid, jsonb, jsonb, text, numeric, text) to service_role;

-- ---------- customer: payment status (order id + secret tracking token, or the signed-in owner) ----------
create or replace function public.get_payment_info(p_order_id uuid, p_tracking_token uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  o public.orders;
  p public.payments;
  v_count integer;
  v_limit integer := coalesce((select (value #>> '{}')::integer from public.site_settings where key = 'payment_resubmission_limit'), 3);
  v_hours integer := coalesce((select (value #>> '{}')::integer from public.site_settings where key = 'advance_payment_window_hours'), 24);
begin
  select * into o from public.orders where id = p_order_id;
  if not found or not coalesce((p_tracking_token is not null and o.tracking_token = p_tracking_token)
                               or (auth.uid() is not null and o.user_id is not null and o.user_id = auth.uid()), false) then
    raise exception 'Order not found.';
  end if;
  select count(*) into v_count from public.payments where order_id = o.id;
  select * into p from public.payments where order_id = o.id order by created_at desc limit 1;
  return jsonb_build_object(
    'order_number', o.order_number, 'order_status', o.status,
    'total', o.total, 'advance_amount', o.advance_amount, 'cod_amount', o.cod_amount,
    'payment_status', p.status, 'payment_method', p.method, 'rejection_reason', p.rejection_reason,
    'attempts', v_count, 'attempts_left', greatest(v_limit - v_count, 0),
    'expires_at', o.placed_at + make_interval(hours => v_hours),
    'methods', coalesce((select jsonb_agg(jsonb_build_object('code', m.code, 'display_name', m.display_name,
                 'merchant_number', m.merchant_number, 'instructions', m.instructions) order by m.code)
               from public.payment_methods m where m.is_enabled and m.merchant_number is not null), '[]'::jsonb));
end
$$;

-- ---------- customer: submit the advance payment details (staff verify them manually) ----------
create or replace function public.submit_payment(
  p_order_id uuid, p_tracking_token uuid, p_method public.payment_method_code,
  p_sender text, p_txn text, p_proof_path text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  v_txn text := upper(trim(coalesce(p_txn, '')));
  v_sender text := trim(coalesce(p_sender, ''));
  v_count integer;
  v_limit integer := coalesce((select (value #>> '{}')::integer from public.site_settings where key = 'payment_resubmission_limit'), 3);
  v_pay public.payments;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found or not coalesce((p_tracking_token is not null and o.tracking_token = p_tracking_token)
                               or (auth.uid() is not null and o.user_id is not null and o.user_id = auth.uid()), false) then
    raise exception 'Order not found.';
  end if;
  if o.status <> 'pending_payment_verification' or o.advance_amount <= 0 then
    raise exception 'This order is not waiting for an advance payment.';
  end if;
  if exists (select 1 from public.payments where order_id = o.id and status in ('submitted', 'verified')) then
    raise exception 'A payment has already been submitted for this order.';
  end if;
  select count(*) into v_count from public.payments where order_id = o.id;
  if v_count >= v_limit then
    raise exception 'You have reached the maximum number of payment attempts. Please contact us.';
  end if;
  if not exists (select 1 from public.payment_methods where code = p_method and is_enabled and merchant_number is not null) then
    raise exception 'This payment method is not available.';
  end if;
  if v_sender !~ '^01[3-9][0-9]{8}$' then raise exception 'Enter the mobile number you sent the money from.'; end if;
  if v_txn !~ '^[A-Z0-9]{6,40}$' then raise exception 'Enter a valid Transaction ID (letters and numbers, 6-40 characters).'; end if;
  if p_proof_path is not null and not (
       auth.uid() is not null and o.user_id = auth.uid()
       and p_proof_path like auth.uid()::text || '/%' and length(p_proof_path) <= 200 and position('..' in p_proof_path) = 0) then
    raise exception 'Invalid payment proof.';
  end if;

  begin
    insert into public.payments (order_id, method, amount, status, sender_number, transaction_id, proof_path, attempt, submitted_at)
    values (o.id, p_method, o.advance_amount, 'submitted', v_sender, v_txn, p_proof_path, v_count + 1, now())
    returning * into v_pay;
  exception when unique_violation then
    raise exception 'This Transaction ID has already been used. Please check it and try again.';
  end;
  return jsonb_build_object('payment_id', v_pay.id, 'status', v_pay.status, 'attempt', v_pay.attempt);
end
$$;

-- ---------- release stock held by orders whose advance payment never arrived ----------
create or replace function public.expire_unpaid_orders(p_hours integer default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hours integer := coalesce(p_hours, (select (value #>> '{}')::integer from public.site_settings where key = 'advance_payment_window_hours'), 24);
  r record;
  i record;
  n integer := 0;
begin
  -- staff, the service role, or direct database access (scheduled job) only
  if coalesce(auth.role(), '') in ('anon', 'authenticated')
     and not public.has_any_role('super_admin', 'admin', 'order_manager', 'payment_manager') then
    raise exception 'Not authorised';
  end if;
  if v_hours < 1 then raise exception 'Window must be at least 1 hour'; end if;

  for r in
    select id from public.orders
    where status = 'pending_payment_verification' and advance_amount > 0
      and placed_at < now() - make_interval(hours => v_hours)
      and not exists (select 1 from public.payments p where p.order_id = orders.id and p.status in ('submitted', 'verified'))
    for update skip locked
  loop
    update public.orders set status = 'cancelled' where id = r.id;
    for i in select variant_id, quantity from public.order_items where order_id = r.id and variant_id is not null loop
      perform public.release_stock(i.variant_id, i.quantity);
    end loop;
    n := n + 1;
  end loop;
  return n;
end
$$;

revoke all on function public.get_payment_info(uuid, uuid) from public;
revoke all on function public.submit_payment(uuid, uuid, public.payment_method_code, text, text, text) from public;
revoke all on function public.expire_unpaid_orders(integer) from public, anon;
grant execute on function public.get_payment_info(uuid, uuid) to anon, authenticated;
grant execute on function public.submit_payment(uuid, uuid, public.payment_method_code, text, text, text) to anon, authenticated;
grant execute on function public.expire_unpaid_orders(integer) to authenticated, service_role;
