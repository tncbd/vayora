-- Phase 10: security hardening. Additive; no data is changed.
--  1. throttling for public lookups that could be guessed at (order tracking, coupon codes)
--  2. anonymous visitors lose table privileges they never needed (row-level security stays as the second lock)
--  3. trigger / internal functions can no longer be called as RPC

-- ---------- 1. throttling ----------
create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  hits integer not null default 0
);
alter table public.rate_limits enable row level security; -- no policies: only the definer functions below touch it
revoke all on public.rate_limits from public, anon, authenticated;

create or replace function public._client_ip()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(nullif(trim(split_part(coalesce((nullif(current_setting('request.headers', true), '')::json) ->> 'x-forwarded-for', ''), ',', 1)), ''), 'unknown');
$$;

-- Counts one hit for p_key; raises once p_limit hits happen inside the window.
create or replace function public._throttle(p_key text, p_limit integer, p_window_seconds integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_hits integer;
begin
  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
  insert into public.rate_limits as r (key, window_start, hits) values (left(p_key, 200), now(), 1)
  on conflict (key) do update
    set hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
        window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;
  if v_hits > p_limit then
    raise exception 'Too many attempts. Please wait a few minutes and try again.';
  end if;
end
$$;
revoke all on function public._throttle(text, integer, integer) from public, anon, authenticated;
revoke all on function public._client_ip() from public, anon, authenticated;

-- order tracking: per visitor and per order number, so neither one browser nor many can guess phone numbers
create or replace function public.track_order(p_order_number text, p_phone text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  o public.orders;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '^(\+?88)', '');
  v_num text := upper(trim(coalesce(p_order_number, '')));
begin
  perform public._throttle('track:ip:' || public._client_ip(), 30, 600);
  perform public._throttle('track:order:' || v_num, 10, 600);
  select * into o from public.orders where order_number = v_num and phone = v_phone;
  -- A miss returns null instead of raising: an exception would roll back this call's throttle count,
  -- so failed guesses would never be counted.
  if not found then return null; end if;
  return jsonb_build_object(
    'order_id', o.id, 'order_number', o.order_number, 'status', o.status, 'placed_at', o.placed_at,
    'district', o.district, 'area', o.area,
    'subtotal', o.subtotal, 'discount_total', o.discount_total, 'delivery_charge', o.delivery_charge,
    'total', o.total, 'advance_amount', o.advance_amount, 'cod_amount', o.cod_amount,
    'courier_company', o.courier_company, 'tracking_number', o.tracking_number,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.product_name, 'size', i.size, 'color', i.color,
                         'quantity', i.quantity, 'line_total', i.line_total, 'image_url', i.image_url) order by i.product_name)
                       from public.order_items i where i.order_id = o.id), '[]'::jsonb),
    'history', coalesce((select jsonb_agg(jsonb_build_object('status', h.to_status, 'note', h.note, 'at', h.created_at) order by h.created_at, h.id)
                         from public.order_status_history h where h.order_id = o.id and h.is_public), '[]'::jsonb));
end
$$;
revoke all on function public.track_order(text, text) from public;
grant execute on function public.track_order(text, text) to anon, authenticated;

-- coupon guessing: any quote that carries a coupon code counts against the visitor.
-- Keeps the Phase 6 advance/COD fields; only the throttle is new.
create or replace function public.quote_order(
  p_items jsonb, p_district text default null, p_coupon text default null, p_phone text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare q jsonb;
begin
  if nullif(trim(coalesce(p_coupon, '')), '') is not null then
    perform public._throttle('coupon:ip:' || public._client_ip(), 60, 600);
  end if;
  q := public._quote(p_items, p_district, p_coupon, auth.uid(), p_phone) - 'coupon_id';
  return q || jsonb_build_object(
           'advance_amount', case when (q ->> 'advance_required')::boolean then (q ->> 'delivery_charge')::numeric else 0 end,
           'cod_amount', (q ->> 'total')::numeric - case when (q ->> 'advance_required')::boolean then (q ->> 'delivery_charge')::numeric else 0 end);
end
$$;
revoke all on function public.quote_order(jsonb, text, text, text) from public;
grant execute on function public.quote_order(jsonb, text, text, text) to anon, authenticated;

-- ---------- 2. anonymous table privileges: only what the public storefront reads ----------
revoke all on all tables in schema public from anon;
grant select on
  public.categories, public.collections, public.products, public.product_collections, public.product_images,
  public.product_variants, public.delivery_zones, public.payment_methods, public.banners, public.hero_slides,
  public.homepage_sections, public.pages, public.menus, public.site_settings, public.blog_posts, public.reviews,
  public.storefront_products, public.public_reviews, public.variant_availability
to anon;

-- ---------- 3. trigger and internal functions are not RPC endpoints ----------
revoke all on function public.audit_content_change() from public, anon, authenticated;
revoke all on function public.create_inventory_for_variant() from public, anon, authenticated;
revoke all on function public.generate_order_number() from public, anon, authenticated;
revoke all on function public.guard_order_changes() from public, anon, authenticated;
revoke all on function public.guard_order_status() from public, anon, authenticated;
revoke all on function public.guard_payment_changes() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.protect_last_super_admin() from public, anon, authenticated;
revoke all on function public.record_order_status() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.stamp_role_grant() from public, anon, authenticated;
