// Admin catalogue operations. Every call runs as the signed-in staff member, so the database's
// row-level security decides what is allowed; nothing here can exceed the user's role.
import { supabase } from './supabase';
import { sanitizeSearch } from './catalogParams';
import { copySku, copySlug, friendlyDbError, imageExtension, validateImageFile, variantSku } from './adminCatalog';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

function db() {
  if (!supabase) throw new Error('Not connected to the database.');
  return supabase;
}
function check<T>(res: { data: T; error: { code?: string; message?: string } | null }): T {
  if (res.error) throw new Error(friendlyDbError(res.error));
  return res.data;
}

/** Best-effort audit trail; never blocks the action it describes. */
export async function logAdmin(action: string, entityType: string, entityId: string, details: Record<string, unknown> = {}) {
  try {
    await db().rpc('log_admin_action', { p_action: action, p_entity_type: entityType, p_entity_id: entityId, p_details: details });
  } catch {
    /* ignore */
  }
}

/** For single-row inserts/selects that must return a row. */
function one<T>(res: { data: T; error: { code?: string; message?: string } | null }): NonNullable<T> {
  const data = check(res);
  if (data === null || data === undefined) throw new Error('Could not save. Please try again.');
  return data as NonNullable<T>;
}

export const PRODUCT_STATUSES = ['draft', 'active', 'inactive', 'archived'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

// ---------- categories ----------
export interface AdminCategory {
  id: string;
  parent_id: string | null;
  slug: string;
  name: string;
  gender: 'women' | 'men' | 'unisex' | null;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

export async function adminListCategories(): Promise<AdminCategory[]> {
  return check(await db().from('categories').select('id, parent_id, slug, name, gender, description, is_active, sort_order').order('sort_order').order('name')) as AdminCategory[];
}

export type CategoryInput = Omit<AdminCategory, 'id'>;

export async function adminSaveCategory(input: CategoryInput, id?: string): Promise<string> {
  if (id) {
    check(await db().from('categories').update(input).eq('id', id));
    void logAdmin('category.updated', 'category', id, { name: input.name });
    return id;
  }
  const row = one(await db().from('categories').insert(input).select('id').single());
  void logAdmin('category.created', 'category', row.id, { name: input.name });
  return row.id as string;
}

export async function adminDeleteCategory(id: string, name: string): Promise<void> {
  check(await db().from('categories').delete().eq('id', id));
  void logAdmin('category.deleted', 'category', id, { name });
}

// ---------- products ----------
export interface AdminProductFilters {
  q?: string;
  status?: ProductStatus | '';
  categoryId?: string;
  page: number;
  pageSize: number;
}

export interface AdminProductListRow {
  id: string;
  name: string;
  slug: string;
  sku: string;
  status: ProductStatus;
  regular_price: number;
  selling_price: number;
  is_featured: boolean;
  category_id: string | null;
  updated_at: string;
  thumb: string | null;
}

function productQuery(f: Omit<AdminProductFilters, 'page' | 'pageSize'>, columns: string, count = false) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = db().from('products').select(columns, count ? { count: 'exact' } : undefined);
  const t = sanitizeSearch(f.q ?? '');
  if (t) q = q.or(`name.ilike.%${t}%,sku.ilike.%${t}%`);
  if (f.status) q = q.eq('status', f.status);
  if (f.categoryId) q = q.eq('category_id', f.categoryId);
  return q.order('updated_at', { ascending: false });
}

export async function adminListProducts(f: AdminProductFilters): Promise<{ rows: AdminProductListRow[]; total: number }> {
  const from = (f.page - 1) * f.pageSize;
  const { data, error, count } = await productQuery(f, 'id, name, slug, sku, status, regular_price, selling_price, is_featured, category_id, updated_at', true).range(from, from + f.pageSize - 1);
  if (error) throw new Error(friendlyDbError(error));
  const rows = (data ?? []) as Row[];
  const ids = rows.map((r) => r.id);
  const thumbs = new Map<string, string>();
  if (ids.length) {
    const imgs = check(await db().from('product_images').select('product_id, url, is_main, sort_order').in('product_id', ids).order('is_main', { ascending: false }).order('sort_order')) as Row[];
    for (const i of imgs) if (!thumbs.has(i.product_id)) thumbs.set(i.product_id, i.url);
  }
  return {
    rows: rows.map((r) => ({ ...r, regular_price: Number(r.regular_price), selling_price: Number(r.selling_price), thumb: thumbs.get(r.id) ?? null })) as AdminProductListRow[],
    total: count ?? 0,
  };
}

export async function adminExportProducts(f: Omit<AdminProductFilters, 'page' | 'pageSize'>, categoryNames: Map<string, string>): Promise<{ headers: string[]; rows: unknown[][] }> {
  const { data, error } = await productQuery(f, 'sku, name, slug, status, gender, category_id, regular_price, selling_price, is_featured, is_bestseller, is_new_arrival, is_trending, created_at').range(0, 4999);
  if (error) throw new Error(friendlyDbError(error));
  return {
    headers: ['SKU', 'Name', 'Slug', 'Status', 'Gender', 'Category', 'Regular price', 'Selling price', 'Featured', 'Bestseller', 'New arrival', 'Trending', 'Created'],
    rows: ((data ?? []) as Row[]).map((r) => [r.sku, r.name, r.slug, r.status, r.gender, categoryNames.get(r.category_id) ?? '', r.regular_price, r.selling_price, r.is_featured, r.is_bestseller, r.is_new_arrival, r.is_trending, r.created_at]),
  };
}

export async function adminBulkUpdate(ids: string[], patch: { status?: ProductStatus; is_featured?: boolean }): Promise<void> {
  if (!ids.length) return;
  check(await db().from('products').update(patch).in('id', ids));
  void logAdmin('product.bulk_updated', 'product', ids.join(',').slice(0, 200), { count: ids.length, ...patch });
}

export async function adminBulkDelete(ids: string[]): Promise<void> {
  if (!ids.length) return;
  check(await db().from('products').delete().in('id', ids));
  void logAdmin('product.bulk_deleted', 'product', ids.join(',').slice(0, 200), { count: ids.length });
}

export interface ProductForm {
  name: string;
  slug: string;
  sku: string;
  short_description: string | null;
  description: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  gender: 'women' | 'men' | 'unisex';
  regular_price: number;
  selling_price: number;
  status: ProductStatus;
  is_featured: boolean;
  is_bestseller: boolean;
  is_new_arrival: boolean;
  is_trending: boolean;
  seo_title: string | null;
  seo_description: string | null;
}

export async function adminGetProduct(id: string): Promise<{ product: Row; collectionIds: string[] } | null> {
  const p = check(await db().from('products').select('*').eq('id', id).maybeSingle());
  if (!p) return null;
  const cols = check(await db().from('product_collections').select('collection_id').eq('product_id', id)) as Row[];
  return { product: p, collectionIds: cols.map((c) => c.collection_id) };
}

export async function adminSaveProduct(input: ProductForm, collectionIds: string[], id?: string): Promise<string> {
  let productId = id;
  if (id) {
    check(await db().from('products').update(input).eq('id', id));
  } else {
    productId = one(await db().from('products').insert(input).select('id').single()).id as string;
  }
  // replace collection membership
  check(await db().from('product_collections').delete().eq('product_id', productId!));
  if (collectionIds.length) {
    check(await db().from('product_collections').insert(collectionIds.map((c) => ({ product_id: productId, collection_id: c }))));
  }
  void logAdmin(id ? 'product.updated' : 'product.created', 'product', productId!, { name: input.name, sku: input.sku, status: input.status });
  return productId!;
}

export async function adminDeleteProduct(id: string, name: string): Promise<void> {
  check(await db().from('products').delete().eq('id', id));
  void logAdmin('product.deleted', 'product', id, { name });
}

/** Copy a product as a draft, with its variants (stock 0), images and collections. */
export async function adminDuplicateProduct(id: string): Promise<string> {
  const c = db();
  const src = one(await c.from('products').select('*').eq('id', id).single()) as Row;
  const taken = check(await c.from('products').select('slug, sku').or(`slug.like.${src.slug}-copy%,sku.like.${src.sku}-COPY%`)) as Row[];
  const slug = copySlug(src.slug, new Set(taken.map((t) => t.slug)));
  const sku = copySku(src.sku, new Set(taken.map((t) => t.sku)));

  const { id: _id, created_at: _c, updated_at: _u, sales_count: _s, ...rest } = src;
  void _id; void _c; void _u; void _s;
  const newId = one(await c.from('products').insert({ ...rest, name: `${src.name} (Copy)`, slug, sku, status: 'draft', is_featured: false }).select('id').single()).id as string;

  const variants = check(await c.from('product_variants').select('size, color, color_hex, price, is_active').eq('product_id', id)) as Row[];
  if (variants.length) {
    check(await c.from('product_variants').insert(variants.map((v) => ({ ...v, product_id: newId, sku: variantSku(sku, v.size, v.color) }))));
  }
  const imgs = check(await c.from('product_images').select('url, alt, sort_order, is_main').eq('product_id', id)) as Row[];
  if (imgs.length) check(await c.from('product_images').insert(imgs.map((i) => ({ ...i, product_id: newId }))));
  const cols = check(await c.from('product_collections').select('collection_id').eq('product_id', id)) as Row[];
  if (cols.length) check(await c.from('product_collections').insert(cols.map((x) => ({ product_id: newId, collection_id: x.collection_id }))));

  void logAdmin('product.duplicated', 'product', newId, { from: id });
  return newId;
}

// ---------- images ----------
export interface AdminImage {
  id: string;
  url: string;
  alt: string | null;
  sort_order: number;
  is_main: boolean;
}
const BUCKET = 'product-images';

export async function adminListImages(productId: string): Promise<AdminImage[]> {
  return check(await db().from('product_images').select('id, url, alt, sort_order, is_main').eq('product_id', productId).order('is_main', { ascending: false }).order('sort_order')) as AdminImage[];
}

export async function adminUploadImage(productId: string, file: File, existing: AdminImage[]): Promise<void> {
  const problem = validateImageFile(file);
  if (problem) throw new Error(problem);
  const path = `${productId}/${crypto.randomUUID()}.${imageExtension(file.type)}`;
  const up = await db().storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false });
  if (up.error) throw new Error('Upload failed. Check your connection and the file, then try again.');
  const url = db().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const next = existing.length ? Math.max(...existing.map((i) => i.sort_order)) + 1 : 0;
  const ins = await db().from('product_images').insert({ product_id: productId, url, alt: null, sort_order: next, is_main: existing.length === 0 });
  if (ins.error) {
    await db().storage.from(BUCKET).remove([path]); // do not leave an orphan file
    throw new Error(friendlyDbError(ins.error));
  }
}

export async function adminSetMainImage(productId: string, imageId: string): Promise<void> {
  // the unique index allows one main image, so clear first
  check(await db().from('product_images').update({ is_main: false }).eq('product_id', productId).eq('is_main', true));
  check(await db().from('product_images').update({ is_main: true }).eq('id', imageId));
}

export async function adminMoveImage(a: AdminImage, b: AdminImage): Promise<void> {
  // swap sort positions; if equal, separate them
  const [sa, sb] = a.sort_order === b.sort_order ? [b.sort_order + 1, a.sort_order] : [b.sort_order, a.sort_order];
  check(await db().from('product_images').update({ sort_order: sa }).eq('id', a.id));
  check(await db().from('product_images').update({ sort_order: sb }).eq('id', b.id));
}

export async function adminUpdateImageAlt(id: string, alt: string): Promise<void> {
  check(await db().from('product_images').update({ alt: alt.trim() || null }).eq('id', id));
}

export async function adminDeleteImage(img: AdminImage, remaining: AdminImage[]): Promise<void> {
  check(await db().from('product_images').delete().eq('id', img.id));
  const marker = `/${BUCKET}/`;
  const i = img.url.indexOf(marker);
  if (i >= 0) await db().storage.from(BUCKET).remove([decodeURIComponent(img.url.slice(i + marker.length).split('?')[0])]);
  if (img.is_main && remaining.length) await adminSetMainImage(img.id, remaining[0].id).catch(() => undefined);
}

// ---------- variants & stock ----------
export interface AdminVariant {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  color_hex: string | null;
  price: number | null;
  is_active: boolean;
  quantity: number;
  reserved: number;
  low_stock_threshold: number;
}

export async function adminListVariants(productId: string): Promise<AdminVariant[]> {
  const vs = check(await db().from('product_variants').select('id, sku, size, color, color_hex, price, is_active').eq('product_id', productId).order('created_at')) as Row[];
  if (!vs.length) return [];
  const inv = check(await db().from('inventory').select('variant_id, quantity, reserved, low_stock_threshold').in('variant_id', vs.map((v) => v.id))) as Row[];
  const by = new Map(inv.map((i) => [i.variant_id, i]));
  return vs.map((v) => ({
    ...v,
    price: v.price === null ? null : Number(v.price),
    quantity: by.get(v.id)?.quantity ?? 0,
    reserved: by.get(v.id)?.reserved ?? 0,
    low_stock_threshold: by.get(v.id)?.low_stock_threshold ?? 5,
  })) as AdminVariant[];
}

export interface VariantInput {
  sku: string;
  size: string | null;
  color: string | null;
  color_hex: string | null;
  price: number | null;
  is_active: boolean;
}

export async function adminCreateVariants(productId: string, list: VariantInput[], quantity = 0): Promise<void> {
  if (!list.length) return;
  const rows = check(await db().from('product_variants').insert(list.map((v) => ({ ...v, product_id: productId }))).select('id')) as Row[];
  if (quantity > 0) {
    // inventory rows are created by a trigger; set the starting quantity
    for (const r of rows) check(await db().from('inventory').update({ quantity }).eq('variant_id', r.id));
  }
  void logAdmin('variant.created', 'product', productId, { count: list.length });
}

export async function adminUpdateVariant(id: string, v: VariantInput, stock: { quantity: number; low_stock_threshold: number }): Promise<void> {
  check(await db().from('product_variants').update(v).eq('id', id));
  check(await db().from('inventory').update(stock).eq('variant_id', id));
  void logAdmin('variant.updated', 'variant', id, { sku: v.sku, quantity: stock.quantity });
}

export async function adminDeleteVariant(id: string, sku: string): Promise<void> {
  check(await db().from('product_variants').delete().eq('id', id));
  void logAdmin('variant.deleted', 'variant', id, { sku });
}

// ---------- inventory overview ----------
export interface InventoryRow {
  variant_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  size: string | null;
  color: string | null;
  is_active: boolean;
  quantity: number;
  reserved: number;
  low_stock_threshold: number;
}

export async function adminListInventory(): Promise<InventoryRow[]> {
  const c = db();
  const inv = check(await c.from('inventory').select('variant_id, quantity, reserved, low_stock_threshold').limit(2000)) as Row[];
  if (!inv.length) return [];
  const vs = check(await c.from('product_variants').select('id, sku, size, color, is_active, product_id').limit(2000)) as Row[];
  const prods = check(await c.from('products').select('id, name').limit(2000)) as Row[];
  const vBy = new Map(vs.map((v) => [v.id, v]));
  const pBy = new Map(prods.map((p) => [p.id, p.name]));
  return inv
    .map((i) => {
      const v = vBy.get(i.variant_id);
      return v ? ({ variant_id: i.variant_id, product_id: v.product_id, product_name: pBy.get(v.product_id) ?? '—', sku: v.sku, size: v.size, color: v.color, is_active: v.is_active, quantity: i.quantity, reserved: i.reserved, low_stock_threshold: i.low_stock_threshold } as InventoryRow) : null;
    })
    .filter((r): r is InventoryRow => !!r)
    .sort((a, b) => a.product_name.localeCompare(b.product_name) || a.sku.localeCompare(b.sku));
}

export async function adminUpdateStock(variantId: string, sku: string, quantity: number, threshold: number): Promise<void> {
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error('Quantity must be a whole number, 0 or more.');
  if (!Number.isInteger(threshold) || threshold < 0) throw new Error('Low-stock level must be a whole number, 0 or more.');
  check(await db().from('inventory').update({ quantity, low_stock_threshold: threshold }).eq('variant_id', variantId));
  void logAdmin('inventory.updated', 'variant', variantId, { sku, quantity, threshold });
}

// ---------- collections (for product assignment) ----------
export async function adminListCollections(): Promise<{ id: string; slug: string; name: string }[]> {
  return check(await db().from('collections').select('id, slug, name').eq('is_active', true).order('sort_order')) as { id: string; slug: string; name: string }[];
}
