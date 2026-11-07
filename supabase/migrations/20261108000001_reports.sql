-- Phase 9: sales and order reports for admins. Read-only, additive.
-- "Sales" excludes cancelled, returned and refunded orders. Dates are Bangladesh time (Asia/Dhaka).
create or replace function public.admin_sales_report(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_from timestamptz;
  v_to timestamptz;
  r jsonb;
begin
  if not public.has_any_role('super_admin', 'admin') then raise exception 'Not authorised'; end if;
  if p_from is null or p_to is null or p_to < p_from then raise exception 'Choose a valid date range'; end if;
  if p_to - p_from > 366 then raise exception 'Choose a range of at most one year'; end if;
  v_from := (p_from::timestamp) at time zone 'Asia/Dhaka';
  v_to := ((p_to + 1)::timestamp) at time zone 'Asia/Dhaka';

  select jsonb_build_object(
    'summary', (select jsonb_build_object(
        'orders', count(*),
        'sales', coalesce(sum(total) filter (where status not in ('cancelled', 'returned', 'refunded')), 0),
        'sales_orders', count(*) filter (where status not in ('cancelled', 'returned', 'refunded')),
        'delivered_sales', coalesce(sum(total) filter (where status = 'delivered'), 0),
        'discounts', coalesce(sum(discount_total) filter (where status not in ('cancelled', 'returned', 'refunded')), 0),
        'delivery_charges', coalesce(sum(delivery_charge) filter (where status not in ('cancelled', 'returned', 'refunded')), 0),
        'cancelled', count(*) filter (where status = 'cancelled'),
        'returned', count(*) filter (where status in ('returned', 'refunded')))
      from public.orders where placed_at >= v_from and placed_at < v_to),
    'advance_verified', (select coalesce(sum(p.amount), 0) from public.payments p join public.orders o on o.id = p.order_id
        where p.status = 'verified' and o.placed_at >= v_from and o.placed_at < v_to),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('date', d::date,
        'orders', (select count(*) from public.orders o where o.placed_at >= (d::date::timestamp) at time zone 'Asia/Dhaka' and o.placed_at < ((d::date + 1)::timestamp) at time zone 'Asia/Dhaka'),
        'sales', (select coalesce(sum(o.total), 0) from public.orders o where o.placed_at >= (d::date::timestamp) at time zone 'Asia/Dhaka' and o.placed_at < ((d::date + 1)::timestamp) at time zone 'Asia/Dhaka' and o.status not in ('cancelled', 'returned', 'refunded'))
      ) order by d), '[]'::jsonb) from generate_series(p_from, p_to, interval '1 day') d),
    'by_status', (select coalesce(jsonb_agg(jsonb_build_object('status', status, 'orders', n) order by n desc), '[]'::jsonb)
        from (select status, count(*) n from public.orders where placed_at >= v_from and placed_at < v_to group by status) s),
    'products', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select oi.product_name as name, sum(oi.quantity)::int as units, sum(oi.line_total) as sales
        from public.order_items oi join public.orders o on o.id = oi.order_id
        where o.placed_at >= v_from and o.placed_at < v_to and o.status not in ('cancelled', 'returned', 'refunded')
        group by oi.product_name order by units desc, sales desc, name limit 50) t),
    'districts', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select district, count(*) as orders, sum(total) as sales from public.orders
        where placed_at >= v_from and placed_at < v_to and status not in ('cancelled', 'returned', 'refunded')
        group by district order by orders desc, district limit 30) t),
    'coupons', (select coalesce(jsonb_agg(t), '[]'::jsonb) from (
        select coupon_code as code, count(*) as uses, sum(discount_total) as discount from public.orders
        where placed_at >= v_from and placed_at < v_to and coupon_code is not null and status not in ('cancelled', 'returned', 'refunded')
        group by coupon_code order by uses desc, code limit 30) t)
  ) into r;
  return r;
end
$$;

revoke all on function public.admin_sales_report(date, date) from public, anon;
grant execute on function public.admin_sales_report(date, date) to authenticated;
