// Live catalogue reads from Supabase. Everything here goes through public views / RLS-protected
// tables, so it only ever returns data an anonymous visitor is allowed to see.
import { supabase } from './supabase';
import { DEFAULT_PARAMS, PAGE_SIZE, applyListFilters, applySort, pageRange, sanitizeSearch, sortSizes, type ListParams } from './catalogParams';
import type { Category, Product, ProductColor, ProductDetail, ProductVariant, PublicReview } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function client() {
  if (!supabase) throw new Error('The store is not connected to its database.');
  return supabase;
}

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

export function mapProduct(r: Row): Product {
  const colors: ProductColor[] = Array.isArray(r.colors)
    ? r.colors.filter((c: Row) => c && c.name).map((c: Row) => ({ name: String(c.name), hex: c.hex ? String(c.hex) : null }))
    : [];
  return {
    id: r.id,
    slug: r.slug,
    sku: r.sku,
    name: r.name,
    shortDescription: r.short_description ?? '',
    gender: r.gender,
    categorySlug: r.category_slug ?? null,
    categoryName: r.category_name ?? null,
    regularPrice: num(r.regular_price),
    sellingPrice: num(r.selling_price),
    discountPct: num(r.discount_pct),
    imageUrl: r.image_url ?? null,
    hoverImageUrl: r.hover_image_url ?? null,
    colors,
    sizes: sortSizes(r.sizes ?? []),
    isFeatured: !!r.is_featured,
    isBestseller: !!r.is_bestseller,
    isNewArrival: !!r.is_new_arrival,
    isTrending: !!r.is_trending,
    createdAt: r.created_at,
    salesCount: num(r.sales_count),
    inStock: !!r.in_stock,
    avgRating: r.avg_rating === null || r.avg_rating === undefined ? null : Number(r.avg_rating),
    reviewCount: num(r.review_count),
  };
}

export async function listProducts(params: ListParams, pageSize = PAGE_SIZE): Promise<{ items: Product[]; total: number }> {
  const [from, to] = pageRange(params.page, pageSize);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = client().from('storefront_products').select('*', { count: 'exact' });
  q = applySort(applyListFilters(q, params), params.sort).range(from, to);
  const { data, error, count } = await q;
  if (error) throw new Error(error.message);
  return { items: (data ?? []).map(mapProduct), total: count ?? 0 };
}

/** Convenience for homepage rails. */
export async function listCollection(slug: string, limit = 4): Promise<Product[]> {
  const sort = slug === 'best-sellers' ? 'best_selling' : 'latest';
  const { items } = await listProducts({ ...DEFAULT_PARAMS, sort, collectionSlug: slug }, limit);
  return items;
}

export async function searchSuggestions(text: string, limit = 5): Promise<Product[]> {
  const t = sanitizeSearch(text);
  if (t.length < 2) return [];
  const { items } = await listProducts({ ...DEFAULT_PARAMS, sort: 'best_selling', q: t }, limit);
  return items;
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const { data, error } = await client().from('storefront_products').select('*').in('id', ids.slice(0, 100));
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapProduct);
}

export async function getProductsBySlugs(slugs: string[]): Promise<Product[]> {
  if (slugs.length === 0) return [];
  const { data, error } = await client().from('storefront_products').select('*').in('slug', slugs.slice(0, 20));
  if (error) throw new Error(error.message);
  const by = new Map((data ?? []).map((r) => [r.slug as string, mapProduct(r)]));
  return slugs.map((s) => by.get(s)).filter((p): p is Product => !!p); // keep recency order
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const c = client();
  const { data: row, error } = await c.from('storefront_products').select('*').eq('slug', slug).maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return null;

  const [imgs, vars] = await Promise.all([
    c.from('product_images').select('id, url, alt, sort_order, is_main').eq('product_id', row.id).order('is_main', { ascending: false }).order('sort_order'),
    c.from('product_variants').select('id, sku, size, color, color_hex, price').eq('product_id', row.id).eq('is_active', true),
  ]);
  if (imgs.error) throw new Error(imgs.error.message);
  if (vars.error) throw new Error(vars.error.message);

  const ids = (vars.data ?? []).map((v) => v.id as string);
  const avail = ids.length ? await c.from('variant_availability').select('variant_id, in_stock, available_qty').in('variant_id', ids) : { data: [], error: null };
  if (avail.error) throw new Error(avail.error.message);
  const stock = new Map((avail.data ?? []).map((a) => [a.variant_id as string, a]));

  const variants: ProductVariant[] = (vars.data ?? []).map((v) => ({
    id: v.id,
    sku: v.sku,
    size: v.size ?? null,
    color: v.color ?? null,
    colorHex: v.color_hex ?? null,
    price: v.price === null || v.price === undefined ? null : Number(v.price),
    inStock: !!stock.get(v.id)?.in_stock,
    availableQty: num(stock.get(v.id)?.available_qty),
  }));

  return {
    ...mapProduct(row),
    description: row.description ?? '',
    seoTitle: row.seo_title ?? null,
    seoDescription: row.seo_description ?? null,
    images: (imgs.data ?? []).map((i) => ({ id: i.id, url: i.url, alt: i.alt ?? null })),
    variants,
  };
}

export async function getRelatedProducts(p: { id: string; categorySlug: string | null; gender: string }, limit = 4): Promise<Product[]> {
  const base: ListParams = { ...DEFAULT_PARAMS, sort: 'best_selling' };
  const { items } = await listProducts(
    p.categorySlug ? { ...base, categorySlug: p.categorySlug } : { ...base, gender: p.gender as ListParams['gender'] },
    limit + 1,
  );
  return items.filter((x) => x.id !== p.id).slice(0, limit);
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await client().from('categories').select('id, slug, name, gender, parent_id, image_url, sort_order').order('sort_order').order('name');
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({ id: c.id, slug: c.slug, name: c.name, gender: c.gender, parentId: c.parent_id, imageUrl: c.image_url, sortOrder: c.sort_order }));
}

export async function getCollections(): Promise<{ slug: string; name: string }[]> {
  const { data, error } = await client().from('collections').select('slug, name').order('sort_order');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getFilterOptions(): Promise<{ sizes: string[]; colors: ProductColor[] }> {
  const { data, error } = await client().from('product_variants').select('size, color, color_hex').eq('is_active', true).limit(2000);
  if (error) throw new Error(error.message);
  const sizes = new Set<string>();
  const colors = new Map<string, ProductColor>();
  for (const v of data ?? []) {
    if (v.size) sizes.add(v.size);
    if (v.color && !colors.has(v.color.toLowerCase())) colors.set(v.color.toLowerCase(), { name: v.color, hex: v.color_hex ?? null });
  }
  return { sizes: sortSizes([...sizes]), colors: [...colors.values()].sort((a, b) => a.name.localeCompare(b.name)) };
}

export async function getMaxDiscount(): Promise<number> {
  const { data, error } = await client().from('storefront_products').select('discount_pct').order('discount_pct', { ascending: false }).limit(1);
  if (error) throw new Error(error.message);
  return data?.[0] ? num(data[0].discount_pct) : 0;
}

// ---------- reviews ----------
export async function getReviews(productId: string, limit = 20): Promise<PublicReview[]> {
  const { data, error } = await client().from('public_reviews').select('id, rating, title, comment, created_at, reviewer_name').eq('product_id', productId).order('created_at', { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ id: r.id, rating: r.rating, title: r.title, comment: r.comment, createdAt: r.created_at, reviewerName: r.reviewer_name }));
}

export async function getLatestReviews(limit = 3): Promise<(PublicReview & { productId: string })[]> {
  const { data, error } = await client().from('public_reviews').select('id, product_id, rating, title, comment, created_at, reviewer_name').not('comment', 'is', null).order('created_at', { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ id: r.id, productId: r.product_id, rating: r.rating, title: r.title, comment: r.comment, createdAt: r.created_at, reviewerName: r.reviewer_name }));
}

/** The signed-in customer's own review for this product (any status), if any. */
export async function getMyReview(productId: string, userId: string): Promise<{ status: string; rating: number } | null> {
  const { data, error } = await client().from('reviews').select('status, rating').eq('product_id', productId).eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export async function submitReview(input: { productId: string; userId: string; rating: number; title: string; comment: string }): Promise<void> {
  const { error } = await client().from('reviews').insert({
    product_id: input.productId,
    user_id: input.userId,
    rating: input.rating,
    title: input.title.trim() || null,
    comment: input.comment.trim() || null,
    status: 'pending',
  });
  if (error) throw new Error(error.code === '23505' ? 'You have already reviewed this product.' : 'Could not submit your review. Please try again.');
}
