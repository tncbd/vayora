-- VAYORA FASHION — OPTIONAL DEMO PRODUCTS (for testing the storefront and admin)
--
-- NOT a migration. Run manually in the SQL Editor ONLY if you want sample products
-- to look at. Every demo SKU starts with DEMO- so supabase/demo/remove_demo_products.sql
-- can delete them cleanly. Prices and names are invented for testing: do not launch with them.
-- Safe to run more than once.

with cat as (select slug, id from public.categories),
seed (sku, slug, name, short_description, cat_slug, gender, reg, sell, featured, best, new_arr, trending, sales) as (
  values
  ('DEMO-TEE-001',    'demo-premium-cotton-t-shirt', 'Premium Cotton T-Shirt (demo)', 'Soft everyday cotton tee.',   't-shirt',   'men',   799,  599,  false, true,  true,  false, 320),
  ('DEMO-POLO-001',   'demo-classic-pique-polo',     'Classic Pique Polo (demo)',     'Breathable pique polo.',       'polo-shirt','men',   1199, 999,  true,  true,  false, false, 280),
  ('DEMO-PANJ-001',   'demo-embroidered-panjabi',    'Embroidered Cotton Panjabi (demo)', 'Festive cotton panjabi.',  'panjabi',   'men',   2490, 1990, true,  false, false, true,  410),
  ('DEMO-HOOD-001',   'demo-fleece-hoodie',          'Fleece Pullover Hoodie (demo)', 'Warm fleece hoodie.',          'hoodie',    'men',   1890, 1490, false, false, true,  true,  150),
  ('DEMO-SAREE-001',  'demo-handloom-saree',         'Handloom Cotton Saree (demo)',  'Handloom drape.',              'saree',     'women', 3290, 2690, true,  true,  false, false, 340),
  ('DEMO-KURTI-001',  'demo-everyday-kurti',         'Everyday Cotton Kurti (demo)',  'Light everyday kurti.',        'kurti',     'women', 1390, 1090, false, true,  false, true,  360),
  ('DEMO-3PC-001',    'demo-printed-three-piece',    'Printed Three Piece Set (demo)','Printed three-piece set.',     'three-piece','women',2790, 2290, false, false, true,  true,  270),
  ('DEMO-LEG-001',    'demo-stretch-leggings',       'High-Rise Stretch Leggings (demo)','Stretch leggings.',         'leggings',  'women', 699,  699,  false, false, false, false, 90)
)
insert into public.products (sku, slug, name, short_description, category_id, gender, regular_price, selling_price,
                             status, is_featured, is_bestseller, is_new_arrival, is_trending, sales_count)
select s.sku, s.slug, s.name, s.short_description, c.id, s.gender::public.gender_type, s.reg, s.sell,
       'active', s.featured, s.best, s.new_arr, s.trending, s.sales
from seed s join cat c on c.slug = s.cat_slug
on conflict (sku) do nothing;

-- variants: sizes x colours, with 12 in stock each (the lowest-priced demo item is sold out)
insert into public.product_variants (product_id, sku, size, color, color_hex)
select p.id, p.sku || '-' || upper(sz) || '-' || upper(left(col.name, 3)), sz, col.name, col.hex
from public.products p
cross join (values ('M'), ('L'), ('XL')) as sizes(sz)
cross join (values ('Black', '#171717'), ('Navy', '#1F2A44')) as col(name, hex)
where p.sku like 'DEMO-%'
on conflict (sku) do nothing;

update public.inventory i
   set quantity = case when p.sku = 'DEMO-LEG-001' then 0 else 12 end
  from public.product_variants v
  join public.products p on p.id = v.product_id
 where i.variant_id = v.id and p.sku like 'DEMO-%';

insert into public.product_collections (product_id, collection_id)
select p.id, c.id
from public.products p
join public.collections c on c.slug = 'featured'
where p.sku in ('DEMO-POLO-001', 'DEMO-PANJ-001', 'DEMO-SAREE-001')
on conflict do nothing;
