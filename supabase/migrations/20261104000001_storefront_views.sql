-- VAYORA FASHION — 0007 storefront read models (Phase 4)
--
-- These views are owned by the migration role, so they can read inventory and
-- profiles that anonymous visitors cannot, while exposing ONLY what the public
-- storefront needs:
--   * active products only (drafts/inactive/archived never appear)
--   * stock as a boolean (never exact quantities or reservations)
--   * reviewer first name only (never email, phone, or full name)
-- Supabase's linter flags "security definer view" for these: that is intentional.

create or replace view public.storefront_products as
select
  p.id,
  p.slug,
  p.sku,
  p.name,
  p.short_description,
  p.description,
  p.gender,
  p.regular_price,
  p.selling_price,
  case when p.regular_price > 0 and p.selling_price < p.regular_price
       then round((p.regular_price - p.selling_price) / p.regular_price * 100)::int
       else 0 end as discount_pct,
  p.is_featured,
  p.is_bestseller,
  p.is_new_arrival,
  p.is_trending,
  p.sales_count,
  p.seo_title,
  p.seo_description,
  p.created_at,
  c.slug  as category_slug,
  c.name  as category_name,
  pc.slug as parent_category_slug,
  sc.slug as subcategory_slug,
  img.url  as image_url,
  img2.url as hover_image_url,
  coalesce(v.sizes, '{}'::text[])   as sizes,
  coalesce(v.colors, '[]'::jsonb)   as colors,
  coalesce(v.in_stock, false)       as in_stock,
  coalesce(r.review_count, 0)::int  as review_count,
  r.avg_rating,
  coalesce(col.slugs, '{}'::text[]) as collection_slugs
from public.products p
left join public.categories c  on c.id  = p.category_id
left join public.categories pc on pc.id = c.parent_id
left join public.categories sc on sc.id = p.subcategory_id
left join lateral (
  select i.url from public.product_images i
  where i.product_id = p.id
  order by i.is_main desc, i.sort_order, i.created_at
  limit 1
) img on true
left join lateral (
  select i.url from public.product_images i
  where i.product_id = p.id
  order by i.is_main desc, i.sort_order, i.created_at
  offset 1 limit 1
) img2 on true
left join lateral (
  select array_agg(distinct vv.size) filter (where vv.size is not null) as sizes,
         jsonb_agg(distinct jsonb_build_object('name', vv.color, 'hex', vv.color_hex))
           filter (where vv.color is not null) as colors,
         bool_or(coalesce(inv.quantity - inv.reserved, 0) > 0) as in_stock
  from public.product_variants vv
  left join public.inventory inv on inv.variant_id = vv.id
  where vv.product_id = p.id and vv.is_active
) v on true
left join lateral (
  select count(*) as review_count, round(avg(rv.rating), 1) as avg_rating
  from public.reviews rv
  where rv.product_id = p.id and rv.status = 'approved'
) r on true
left join lateral (
  select array_agg(co.slug) as slugs
  from public.product_collections pcx
  join public.collections co on co.id = pcx.collection_id and co.is_active
  where pcx.product_id = p.id
) col on true
where p.status = 'active';

-- read-only for every API role (Supabase grants new views ALL by default)
revoke all on public.storefront_products from anon, authenticated;
grant select on public.storefront_products to anon, authenticated;

create or replace view public.public_reviews as
select
  r.id,
  r.product_id,
  r.rating,
  r.title,
  r.comment,
  r.created_at,
  coalesce(nullif(split_part(trim(pr.full_name), ' ', 1), ''), 'Customer') as reviewer_name
from public.reviews r
left join public.profiles pr on pr.id = r.user_id
where r.status = 'approved'
  and exists (select 1 from public.products p where p.id = r.product_id and p.status = 'active');

revoke all on public.public_reviews from anon, authenticated;
grant select on public.public_reviews to anon, authenticated;

-- same hardening for the stock-flag view created in 0004
revoke all on public.variant_availability from anon, authenticated;
grant select on public.variant_availability to anon, authenticated;
