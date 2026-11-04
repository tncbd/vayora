-- VAYORA FASHION — 0006 baseline seed (idempotent)
-- Structural defaults only: categories, collections, settings, section layout and
-- DRAFT policy text. No products, no prices, no merchant numbers, no delivery rates
-- are invented — those are business decisions made in the admin panel.

-- ---------- categories ----------
insert into public.categories (slug, name, gender, sort_order) values
  ('women', 'Women', 'women', 1),
  ('men', 'Men', 'men', 2)
on conflict (slug) do nothing;

insert into public.categories (parent_id, slug, name, gender, sort_order)
select p.id, c.slug, c.name, p.gender, c.sort_order
from (values
  ('women', 'saree', 'Saree', 1),
  ('women', 'three-piece', 'Three Piece', 2),
  ('women', 'kurti', 'Kurti', 3),
  ('women', 'tops', 'Tops', 4),
  ('women', 'womens-t-shirt', 'Women''s T-Shirt', 5),
  ('women', 'womens-shirt', 'Women''s Shirt', 6),
  ('women', 'salwar-kameez', 'Salwar Kameez', 7),
  ('women', 'leggings', 'Leggings', 8),
  ('women', 'womens-jeans', 'Women''s Jeans', 9),
  ('women', 'womens-winter', 'Winter Collection', 10),
  ('women', 'other-womens', 'Other Women''s Clothing', 11),
  ('men', 't-shirt', 'T-Shirt', 1),
  ('men', 'polo-shirt', 'Polo Shirt', 2),
  ('men', 'casual-shirt', 'Casual Shirt', 3),
  ('men', 'formal-shirt', 'Formal Shirt', 4),
  ('men', 'panjabi', 'Panjabi', 5),
  ('men', 'jeans', 'Jeans', 6),
  ('men', 'trousers', 'Trousers', 7),
  ('men', 'shorts', 'Shorts', 8),
  ('men', 'jacket', 'Jacket', 9),
  ('men', 'hoodie', 'Hoodie', 10),
  ('men', 'sweater', 'Sweater', 11),
  ('men', 'mens-winter', 'Winter Collection', 12),
  ('men', 'other-mens', 'Other Men''s Clothing', 13)
) as c (parent_slug, slug, name, sort_order)
join public.categories p on p.slug = c.parent_slug
on conflict (slug) do nothing;

-- ---------- collections ----------
insert into public.collections (slug, name, sort_order) values
  ('new-arrivals', 'New Arrivals', 1),
  ('best-sellers', 'Best Sellers', 2),
  ('trending', 'Trending Products', 3),
  ('featured', 'Featured Products', 4),
  ('special-offers', 'Special Offers', 5),
  ('winter', 'Winter Collection', 6),
  ('clearance', 'Clearance Sale', 7)
on conflict (slug) do nothing;

-- ---------- payment methods (disabled until the owner adds real numbers) ----------
insert into public.payment_methods (code, display_name, instructions, is_enabled) values
  ('bkash', 'bKash', 'Send Money to the number shown, then enter your number and Transaction ID.', false),
  ('nagad', 'Nagad', 'Send Money to the number shown, then enter your number and Transaction ID.', false),
  ('upay',  'Upay',  'Send Money to the number shown, then enter your number and Transaction ID.', false)
on conflict (code) do nothing;

-- ---------- delivery zones (charges are 0 and inactive: set real rates in admin) ----------
insert into public.delivery_zones (name, description, districts, charge, priority, is_active, sort_order)
select 'Inside Dhaka', 'Set the charge and activate in admin.', array['Dhaka'], 0, 10, false, 1
where not exists (select 1 from public.delivery_zones where name = 'Inside Dhaka');
insert into public.delivery_zones (name, description, charge, priority, is_active, sort_order)
select 'Outside Dhaka', 'Set the charge and activate in admin. Applies to all other districts.', 0, 0, false, 2
where not exists (select 1 from public.delivery_zones where name = 'Outside Dhaka');

-- ---------- site settings ----------
insert into public.site_settings (key, value) values
  ('store_name', '"VAYORA FASHION"'),
  ('tagline', '"Style for Everyone. Fashion for Every Moment."'),
  ('currency', '"BDT"'),
  ('contact_phone', '""'),
  ('whatsapp_number', '""'),
  ('contact_email', '""'),
  ('address', '""'),
  ('facebook_url', '""'),
  ('instagram_url', '""'),
  ('tiktok_url', '""'),
  ('youtube_url', '""'),
  ('announcement_text', '"Cash on Delivery available all over Bangladesh"'),
  ('announcement_enabled', 'true'),
  ('footer_text', '"Premium men''s and women''s fashion, delivered to your door across Bangladesh."'),
  ('copyright_text', '"© VAYORA FASHION. All rights reserved."'),
  ('delivery_advance_required', 'false'),
  ('allow_guest_checkout', 'true'),
  ('order_status_without_advance', '"pending_order_review"'),
  ('payment_resubmission_limit', '3')
on conflict (key) do nothing;

-- ---------- homepage layout ----------
insert into public.homepage_sections (key, title, description, sort_order) values
  ('hero', null, null, 1),
  ('trust_bar', null, null, 2),
  ('collections', 'Collections', 'Fashion curated for every wardrobe.', 3),
  ('new_arrivals', 'New Arrivals', 'The latest additions to our wardrobe.', 4),
  ('best_sellers', 'Best Sellers', 'Customer favourites, back in demand.', 5),
  ('promo_banners', null, null, 6),
  ('trending', 'Trending Products', null, 7),
  ('winter', 'Winter Collection', 'Warm, layered and effortlessly stylish.', 8),
  ('discount', 'Special Offers', null, 9),
  ('featured', 'Featured Products', null, 10),
  ('reviews', 'What Our Customers Say', null, 11),
  ('newsletter', 'Join the VAYORA List', 'Be first to hear about new arrivals and offers.', 12),
  ('social', 'Follow us', 'Style inspiration from our community.', 13)
on conflict (key) do nothing;

-- ---------- draft policy pages (edit and review before launch) ----------
insert into public.pages (slug, title, content) values
  ('about', 'About Us', 'VAYORA FASHION is a Bangladesh-based fashion retailer offering men''s and women''s clothing for every moment. DRAFT: edit in admin.'),
  ('privacy-policy', 'Privacy Policy', 'DRAFT: replace with your reviewed privacy policy.'),
  ('terms-and-conditions', 'Terms and Conditions', 'DRAFT: replace with your reviewed terms.'),
  ('return-refund-policy', 'Return and Refund Policy', 'DRAFT: replace with your return and refund policy.'),
  ('shipping-policy', 'Shipping Policy', 'DRAFT: replace with your shipping policy.')
on conflict (slug) do nothing;
