-- VAYORA FASHION — 0005 storage buckets and policies
--
-- Public buckets serve files by URL without any SELECT policy, so there is
-- deliberately no anonymous SELECT policy (that would also allow listing).
-- payment-proofs is private: owner uploads, payment staff read, nobody edits.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('product-images', 'product-images', true,  5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('banners',        'banners',        true,  5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('site-assets',    'site-assets',    true,  2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']),
  ('review-images',  'review-images',  true,  3145728, array['image/jpeg', 'image/png', 'image/webp']),
  ('payment-proofs', 'payment-proofs', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------- product-images ----------
create policy "catalogue staff manage product images" on storage.objects
  for all to authenticated
  using (bucket_id = 'product-images' and public.has_any_role('super_admin', 'admin', 'product_manager'))
  with check (bucket_id = 'product-images' and public.has_any_role('super_admin', 'admin', 'product_manager'));

-- ---------- banners & site-assets ----------
create policy "admin manage banners and site assets" on storage.objects
  for all to authenticated
  using (bucket_id in ('banners', 'site-assets') and public.has_any_role('super_admin', 'admin'))
  with check (bucket_id in ('banners', 'site-assets') and public.has_any_role('super_admin', 'admin'));

-- ---------- review-images: customers upload into their own folder ----------
create policy "customers upload own review images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'review-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "customers delete own review images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'review-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "admin manage review images" on storage.objects
  for all to authenticated
  using (bucket_id = 'review-images' and public.has_any_role('super_admin', 'admin'))
  with check (bucket_id = 'review-images' and public.has_any_role('super_admin', 'admin'));

-- ---------- payment-proofs (private) ----------
-- Path convention: <user_id>/<order_number>/<file>. Guests upload through an
-- Edge Function (signed upload URL) in Phase 6; they never get direct access.
create policy "customers upload own payment proofs" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "customers read own payment proofs" on storage.objects
  for select to authenticated
  using (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "payment staff read proofs" on storage.objects
  for select to authenticated
  using (bucket_id = 'payment-proofs' and public.has_any_role('super_admin', 'admin', 'payment_manager', 'order_manager'));
create policy "admin delete proofs" on storage.objects
  for delete to authenticated
  using (bucket_id = 'payment-proofs' and public.has_any_role('super_admin', 'admin'));
