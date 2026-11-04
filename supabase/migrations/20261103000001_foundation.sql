-- VAYORA FASHION — 0001 foundation: enums and generic helpers

create type public.app_role as enum
  ('super_admin', 'admin', 'order_manager', 'product_manager', 'payment_manager');
create type public.gender_type as enum ('women', 'men', 'unisex');
create type public.product_status as enum ('draft', 'active', 'inactive', 'archived');
create type public.order_status as enum (
  'pending_payment_verification', 'pending_order_review', 'confirmed', 'processing',
  'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned', 'refunded'
);
create type public.payment_status as enum ('pending', 'submitted', 'verified', 'rejected');
create type public.payment_method_code as enum ('bkash', 'nagad', 'upay');
create type public.coupon_type as enum ('fixed', 'percentage');
create type public.review_status as enum ('pending', 'approved', 'rejected');
create type public.message_status as enum ('new', 'read', 'resolved');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end
$$;
