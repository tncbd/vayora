-- VAYORA FASHION — 0007 catalogue functions (Phase 4)
--
-- list_products   : storefront search/filter/sort/pagination, done in the database so
--                   it scales to unlimited products. SECURITY DEFINER only so that the
--                   "in stock" filter can consult inventory; it returns product IDs and a
--                   total count, never stock figures, and only for ACTIVE products.
-- catalog_facets  : sizes / colours / price range available for the filter UI.
-- duplicate_product, set_main_image : atomic admin operations with role checks.

create or replace function public.list_products(
  p_gender public.gender_type default null,
  p_category text default null,
  p_collection text default null,
  p_q text default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_sizes text[] default null,
  p_colors text[] default null,
  p_in_stock boolean default false,
  p_new_only boolean default false,
  p_on_sale boolean default false,
  p_sort text default 'latest',
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (product_id uuid, total_count bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_q text := nullif(trim(coalesce(p_q, '')), '');
  v_like text;
  v_sizes boolean := coalesce(cardinality(p_sizes), 0) > 0;
  v_colors boolean := coalesce(cardinality(p_colors), 0) > 0;
begin
  if v_q is not null then
    v_like := '%' || replace(replace(replace(left(v_q, 80), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  return query
  with cat as (
    select c.id
      from public.categories c
     where p_category is not null
       and c.is_active
       and (c.slug = p_category
            or c.parent_id in (select c2.id from public.categories c2 where c2.slug = p_category))
  ),
  filtered as (
    select p.*
      from public.products p
     where p.status = 'active'
       and (p_gender is null or p.gender = p_gender or p.gender = 'unisex')
       and (p_category is null
            or p.category_id in (select id from cat)
            or p.subcategory_id in (select id from cat))
       and (p_collection is null or case p_collection
              when 'new-arrivals' then p.is_new_arrival
              when 'best-sellers' then p.is_bestseller
              when 'trending' then p.is_trending
              when 'featured' then p.is_featured
              when 'special-offers' then p.selling_price < p.regular_price
              else exists (
                select 1
                  from public.product_collections pc
                  join public.collections c on c.id = pc.collection_id
                 where pc.product_id = p.id and c.slug = p_collection and c.is_active)
            end)
       and (v_q is null
            or p.name ilike v_like
            or p.sku ilike v_like
            or coalesce(p.short_description, '') ilike v_like
            or exists (select 1 from public.categories c
                        where c.id in (p.category_id, p.subcategory_id) and c.name ilike v_like))
       and (p_min_price is null or p.selling_price >= p_min_price)
       and (p_max_price is null or p.selling_price <= p_max_price)
       and (not p_new_only or p.is_new_arrival)
       and (not p_on_sale or p.selling_price < p.regular_price)
       and (
         (not v_sizes and not v_colors and not p_in_stock)
         or exists (
           select 1
             from public.product_variants v
             left join public.inventory i on i.variant_id = v.id
            where v.product_id = p.id
              and v.is_active
              and (not v_sizes or v.size = any (p_sizes))
              and (not v_colors or v.color = any (p_colors))
              and (not p_in_stock or coalesce(i.quantity - i.reserved, 0) > 0)
         )
       )
  )
  select f.id, count(*) over ()
    from filtered f
   order by
     case when p_sort = 'price_asc' then f.selling_price end asc,
     case when p_sort = 'price_desc' then f.selling_price end desc,
     case when p_sort = 'best_selling' then f.sales_count end desc,
     case when p_sort = 'popular'
          then f.sales_count + case when f.is_trending then 1000000 else 0 end end desc,
     f.created_at desc,
     f.id
   limit least(greatest(coalesce(p_limit, 24), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end
$$;

revoke execute on function public.list_products(public.gender_type, text, text, text, numeric, numeric, text[], text[], boolean, boolean, boolean, text, integer, integer) from public;
grant execute on function public.list_products(public.gender_type, text, text, text, numeric, numeric, text[], text[], boolean, boolean, boolean, text, integer, integer) to anon, authenticated, service_role;

-- Facets use RLS-visible rows only (active products, active variants).
create or replace function public.catalog_facets()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'sizes', coalesce((
      select jsonb_agg(distinct v.size)
        from public.product_variants v join public.products p on p.id = v.product_id
       where v.size is not null and v.is_active and p.status = 'active'), '[]'::jsonb),
    'colors', coalesce((
      select jsonb_agg(distinct jsonb_build_object('name', v.color, 'hex', v.color_hex))
        from public.product_variants v join public.products p on p.id = v.product_id
       where v.color is not null and v.is_active and p.status = 'active'), '[]'::jsonb),
    'min_price', (select min(selling_price) from public.products where status = 'active'),
    'max_price', (select max(selling_price) from public.products where status = 'active')
  );
$$;

revoke execute on function public.catalog_facets() from public;
grant execute on function public.catalog_facets() to anon, authenticated, service_role;

-- ---------- admin: duplicate a product (as a DRAFT, with zero stock) ----------
create or replace function public.duplicate_product(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.products;
  v_new uuid;
  v_suffix text := substr(md5(random()::text || clock_timestamp()::text), 1, 5);
begin
  if not public.has_any_role('super_admin', 'admin', 'product_manager') then
    raise exception 'Not authorised';
  end if;
  select * into p from public.products where id = p_id;
  if not found then
    raise exception 'Product not found';
  end if;

  insert into public.products (
    slug, sku, name, short_description, description, category_id, subcategory_id, gender,
    regular_price, selling_price, status, is_featured, is_bestseller, is_new_arrival, is_trending,
    seo_title, seo_description)
  values (
    p.slug || '-copy-' || v_suffix, p.sku || '-C' || upper(v_suffix), p.name || ' (Copy)',
    p.short_description, p.description, p.category_id, p.subcategory_id, p.gender,
    p.regular_price, p.selling_price, 'draft', p.is_featured, p.is_bestseller, p.is_new_arrival,
    p.is_trending, p.seo_title, p.seo_description)
  returning id into v_new;

  insert into public.product_images (product_id, url, alt, sort_order, is_main)
    select v_new, url, alt, sort_order, is_main from public.product_images where product_id = p_id;
  insert into public.product_collections (product_id, collection_id)
    select v_new, collection_id from public.product_collections where product_id = p_id;
  insert into public.product_variants (product_id, sku, size, color, color_hex, price, is_active)
    select v_new, sku || '-C' || upper(v_suffix), size, color, color_hex, price, is_active
      from public.product_variants where product_id = p_id;

  insert into public.admin_activity_logs (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'product.duplicated', 'product', v_new::text, jsonb_build_object('source', p_id));
  return v_new;
end
$$;

-- ---------- admin: atomically choose the main image ----------
create or replace function public.set_main_image(p_image_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product uuid;
begin
  if not public.has_any_role('super_admin', 'admin', 'product_manager') then
    raise exception 'Not authorised';
  end if;
  select product_id into v_product from public.product_images where id = p_image_id;
  if not found then
    raise exception 'Image not found';
  end if;
  update public.product_images set is_main = false where product_id = v_product and is_main and id <> p_image_id;
  update public.product_images set is_main = true where id = p_image_id;
end
$$;

revoke execute on function public.duplicate_product(uuid) from public, anon;
revoke execute on function public.set_main_image(uuid) from public, anon;
grant execute on function public.duplicate_product(uuid) to authenticated;
grant execute on function public.set_main_image(uuid) to authenticated;
