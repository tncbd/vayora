-- VAYORA FASHION — 0004 row level security
--
-- Model
--   * Public storefront data: read-only for everyone, active/published rows only.
--   * Private customer data: owner-only.
--   * Staff access is by role (checked in the database, not just the UI):
--       catalogue  -> super_admin, admin, product_manager
--       orders     -> super_admin, admin, order_manager (+ payment_manager read)
--       payments   -> read: super_admin, admin, payment_manager, order_manager
--                     verify/reject: verify_payment() only
--       content    -> super_admin, admin
--       roles      -> super_admin only
--   * There is NO anonymous write access anywhere. Orders, payments, newsletter
--     and contact submissions are created by Edge Functions (service role) that
--     validate input, recalculate money and rate-limit (later phases).

-- Defence in depth: the API roles get no destructive privileges they never need.
revoke insert, update, delete, truncate on all tables in schema public from anon;
revoke truncate on all tables in schema public from authenticated;
revoke usage, select, update on all sequences in schema public from anon, authenticated;

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end
$$;

-- ---------- roles ----------
create policy "read own roles" on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.has_any_role('super_admin'));
create policy "super admin grants roles" on public.user_roles
  for insert to authenticated
  with check (public.has_any_role('super_admin'));
create policy "super admin changes roles" on public.user_roles
  for update to authenticated
  using (public.has_any_role('super_admin'))
  with check (public.has_any_role('super_admin'));
create policy "super admin revokes roles" on public.user_roles
  for delete to authenticated
  using (public.has_any_role('super_admin'));

-- ---------- profiles & addresses ----------
create policy "own profile read" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "staff read profiles" on public.profiles
  for select to authenticated
  using (public.has_any_role('super_admin', 'admin', 'order_manager'));
create policy "own profile update" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "own addresses" on public.addresses
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "staff read addresses" on public.addresses
  for select to authenticated
  using (public.has_any_role('super_admin', 'admin', 'order_manager'));

-- ---------- catalogue: public read ----------
create policy "public read categories" on public.categories
  for select to anon, authenticated using (is_active);
create policy "public read collections" on public.collections
  for select to anon, authenticated using (is_active);
create policy "public read products" on public.products
  for select to anon, authenticated using (status = 'active');
create policy "public read product collections" on public.product_collections
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'active'));
create policy "public read product images" on public.product_images
  for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.status = 'active'));
create policy "public read variants" on public.product_variants
  for select to anon, authenticated
  using (is_active and exists (select 1 from public.products p where p.id = product_id and p.status = 'active'));

-- ---------- catalogue: staff write (product managers and above) ----------
do $$
declare t text;
begin
  foreach t in array array[
    'categories', 'collections', 'products', 'product_collections',
    'product_images', 'product_variants', 'inventory'
  ] loop
    execute format(
      'create policy "catalogue staff all" on public.%I for all to authenticated
         using (public.has_any_role(''super_admin'', ''admin'', ''product_manager''))
         with check (public.has_any_role(''super_admin'', ''admin'', ''product_manager''))', t);
  end loop;
end
$$;

-- Inventory is not public. Storefront reads availability through this view,
-- which exposes only a capped figure (never exact stock or reservations).
create view public.variant_availability as
  select i.variant_id,
         (i.quantity - i.reserved) > 0 as in_stock,
         least(greatest(i.quantity - i.reserved, 0), 10) as available_qty
    from public.inventory i
    join public.product_variants v on v.id = i.variant_id and v.is_active
    join public.products p on p.id = v.product_id and p.status = 'active';
grant select on public.variant_availability to anon, authenticated;

-- ---------- cart & wishlist (owner only) ----------
create policy "own cart" on public.carts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own cart items" on public.cart_items
  for all to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));
create policy "own wishlist" on public.wishlists
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own wishlist items" on public.wishlist_items
  for all to authenticated
  using (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid()))
  with check (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid()));

-- ---------- delivery, coupons ----------
create policy "public read active zones" on public.delivery_zones
  for select to anon, authenticated using (is_active);
create policy "admin all zones" on public.delivery_zones
  for all to authenticated
  using (public.has_any_role('super_admin', 'admin'))
  with check (public.has_any_role('super_admin', 'admin'));

-- Coupons are never readable by customers (codes would leak); validated server-side.
create policy "admin all coupons" on public.coupons
  for all to authenticated
  using (public.has_any_role('super_admin', 'admin'))
  with check (public.has_any_role('super_admin', 'admin'));
create policy "admin read coupon usages" on public.coupon_usages
  for select to authenticated using (public.has_any_role('super_admin', 'admin'));

-- ---------- orders (created only by Edge Functions) ----------
create policy "own orders" on public.orders
  for select to authenticated using (user_id = auth.uid());
create policy "staff read orders" on public.orders
  for select to authenticated
  using (public.has_any_role('super_admin', 'admin', 'order_manager', 'payment_manager'));
create policy "staff update orders" on public.orders
  for update to authenticated
  using (public.has_any_role('super_admin', 'admin', 'order_manager'))
  with check (public.has_any_role('super_admin', 'admin', 'order_manager'));

create policy "own order items" on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "staff read order items" on public.order_items
  for select to authenticated
  using (public.has_any_role('super_admin', 'admin', 'order_manager', 'payment_manager'));

create policy "own order history" on public.order_status_history
  for select to authenticated
  using (is_public and exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "staff read order history" on public.order_status_history
  for select to authenticated
  using (public.has_any_role('super_admin', 'admin', 'order_manager', 'payment_manager'));

-- ---------- payments ----------
create policy "own payments" on public.payments
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "staff read payments" on public.payments
  for select to authenticated
  using (public.has_any_role('super_admin', 'admin', 'order_manager', 'payment_manager'));
-- no insert/update policies: payments are written by Edge Functions and verify_payment()

-- Merchant numbers are meant to be shown to customers who must pay; only enabled
-- methods are exposed. Only admins and payment managers can change them.
create policy "public read enabled payment methods" on public.payment_methods
  for select to anon, authenticated using (is_enabled);
create policy "payment staff manage methods" on public.payment_methods
  for all to authenticated
  using (public.has_any_role('super_admin', 'admin', 'payment_manager'))
  with check (public.has_any_role('super_admin', 'admin', 'payment_manager'));

-- ---------- storefront content ----------
create policy "public read banners" on public.banners
  for select to anon, authenticated
  using (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
create policy "public read hero slides" on public.hero_slides
  for select to anon, authenticated
  using (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()));
create policy "public read homepage sections" on public.homepage_sections
  for select to anon, authenticated using (is_enabled);
create policy "public read published pages" on public.pages
  for select to anon, authenticated using (is_published);
create policy "public read active menus" on public.menus
  for select to anon, authenticated using (is_active);
create policy "public read public settings" on public.site_settings
  for select to anon, authenticated using (is_public);
create policy "public read published posts" on public.blog_posts
  for select to anon, authenticated using (is_published and (published_at is null or published_at <= now()));

do $$
declare t text;
begin
  foreach t in array array[
    'banners', 'hero_slides', 'homepage_sections', 'pages', 'menus', 'site_settings', 'blog_posts'
  ] loop
    execute format(
      'create policy "admin all" on public.%I for all to authenticated
         using (public.has_any_role(''super_admin'', ''admin''))
         with check (public.has_any_role(''super_admin'', ''admin''))', t);
  end loop;
end
$$;

-- ---------- reviews ----------
create policy "public read approved reviews" on public.reviews
  for select to anon, authenticated using (status = 'approved');
create policy "own reviews read" on public.reviews
  for select to authenticated using (user_id = auth.uid());
create policy "customers write pending reviews" on public.reviews
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
create policy "customers edit own pending reviews" on public.reviews
  for update to authenticated
  using (user_id = auth.uid() and status = 'pending')
  with check (user_id = auth.uid() and status = 'pending');
create policy "customers delete own reviews" on public.reviews
  for delete to authenticated using (user_id = auth.uid());
create policy "admin moderate reviews" on public.reviews
  for all to authenticated
  using (public.has_any_role('super_admin', 'admin'))
  with check (public.has_any_role('super_admin', 'admin'));

-- ---------- private operational data ----------
create policy "admin newsletter" on public.newsletter_subscribers
  for all to authenticated
  using (public.has_any_role('super_admin', 'admin'))
  with check (public.has_any_role('super_admin', 'admin'));
create policy "admin contact messages" on public.contact_messages
  for all to authenticated
  using (public.has_any_role('super_admin', 'admin'))
  with check (public.has_any_role('super_admin', 'admin'));
create policy "admin read activity logs" on public.admin_activity_logs
  for select to authenticated using (public.has_any_role('super_admin', 'admin'));
-- no insert policy on logs: rows are written by log_admin_action()/verify_payment()
