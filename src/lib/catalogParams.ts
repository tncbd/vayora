// Pure helpers for catalogue browsing: URL <-> filter state, query building, sizes.
// No network code here so everything is unit-testable.

export const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'best_selling', label: 'Best Selling' },
  { value: 'popular', label: 'Most Popular' },
] as const;
export type SortValue = (typeof SORT_OPTIONS)[number]['value'];

export const PAGE_SIZE = 12;

export interface ListParams {
  gender?: 'men' | 'women' | 'unisex';
  categorySlug?: string;
  collectionSlug?: string;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  sizes: string[];
  colors: string[];
  inStockOnly: boolean;
  newOnly: boolean;
  discountOnly: boolean;
  sort: SortValue;
  page: number;
}

export const DEFAULT_PARAMS: ListParams = {
  sizes: [],
  colors: [],
  inStockOnly: false,
  newOnly: false,
  discountOnly: false,
  sort: 'latest',
  page: 1,
};

const isSort = (v: string | null): v is SortValue => SORT_OPTIONS.some((o) => o.value === v);
const num = (v: string | null): number | undefined => {
  if (v === null || v.trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};
const list = (v: string | null) =>
  (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);

/** Read user-controlled filters from the URL. Anything malformed falls back to a safe default. */
export function parseFilters(sp: URLSearchParams): Pick<ListParams, 'gender' | 'q' | 'minPrice' | 'maxPrice' | 'sizes' | 'colors' | 'inStockOnly' | 'newOnly' | 'discountOnly' | 'sort' | 'page'> {
  const g = sp.get('gender');
  const page = Math.floor(Number(sp.get('page')));
  const sort = sp.get('sort');
  return {
    gender: g === 'men' || g === 'women' || g === 'unisex' ? g : undefined,
    q: sanitizeSearch(sp.get('q') ?? '') || undefined,
    minPrice: num(sp.get('min')),
    maxPrice: num(sp.get('max')),
    sizes: list(sp.get('sizes')),
    colors: list(sp.get('colors')),
    inStockOnly: sp.get('stock') === '1',
    newOnly: sp.get('new') === '1',
    discountOnly: sp.get('sale') === '1',
    sort: isSort(sort) ? sort : 'latest',
    page: Number.isFinite(page) && page >= 1 ? Math.min(page, 1000) : 1,
  };
}

/** Inverse of parseFilters; omits defaults so URLs stay clean. */
export function filtersToSearchParams(f: Partial<ListParams>, keepQ = true): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.gender) sp.set('gender', f.gender);
  if (keepQ && f.q) sp.set('q', f.q);
  if (f.minPrice !== undefined) sp.set('min', String(f.minPrice));
  if (f.maxPrice !== undefined) sp.set('max', String(f.maxPrice));
  if (f.sizes?.length) sp.set('sizes', f.sizes.join(','));
  if (f.colors?.length) sp.set('colors', f.colors.join(','));
  if (f.inStockOnly) sp.set('stock', '1');
  if (f.newOnly) sp.set('new', '1');
  if (f.discountOnly) sp.set('sale', '1');
  if (f.sort && f.sort !== 'latest') sp.set('sort', f.sort);
  if (f.page && f.page > 1) sp.set('page', String(f.page));
  return sp;
}

/** Remove characters that have meaning in PostgREST filter syntax / LIKE patterns. */
export function sanitizeSearch(input: string): string {
  return input
    .replace(/[%_,()*\\"'`;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

// ---------- query building (against any PostgREST-like builder) ----------
export interface FilterBuilder<T> {
  eq(column: string, value: unknown): T;
  gte(column: string, value: unknown): T;
  lte(column: string, value: unknown): T;
  gt(column: string, value: unknown): T;
  or(filters: string): T;
  overlaps(column: string, value: unknown): T;
  order(column: string, opts?: { ascending?: boolean; nullsFirst?: boolean }): T;
}

const WINTER = ['womens-winter', 'mens-winter'];

/** Translate a collection slug into a PostgREST `or(...)` expression. */
export function collectionFilter(slug: string): string {
  const inCollection = `collection_slugs.cs.{${slug}}`;
  switch (slug) {
    case 'new-arrivals':
      return `is_new_arrival.eq.true,${inCollection}`;
    case 'best-sellers':
      return `is_bestseller.eq.true,${inCollection}`;
    case 'trending':
      return `is_trending.eq.true,${inCollection}`;
    case 'featured':
      return `is_featured.eq.true,${inCollection}`;
    case 'special-offers':
      return `discount_pct.gt.0,${inCollection}`;
    case 'winter':
      return `${inCollection},${WINTER.map((s) => `category_slug.eq.${s}`).join(',')}`;
    default:
      return inCollection;
  }
}

/** Slugs are lowercase-hyphenated in the database; reject anything else before it reaches a filter string. */
export const isSafeSlug = (s: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);

export function applyListFilters<T extends FilterBuilder<T>>(query: T, p: ListParams): T {
  let q = query;
  if (p.gender) q = q.eq('gender', p.gender);
  if (p.categorySlug && isSafeSlug(p.categorySlug)) {
    const s = p.categorySlug;
    q = q.or(`category_slug.eq.${s},subcategory_slug.eq.${s},parent_category_slug.eq.${s}`);
  }
  if (p.collectionSlug && isSafeSlug(p.collectionSlug)) q = q.or(collectionFilter(p.collectionSlug));
  if (p.q) {
    const t = sanitizeSearch(p.q);
    if (t) q = q.or(`name.ilike.%${t}%,category_name.ilike.%${t}%,sku.ilike.%${t}%`);
  }
  if (p.minPrice !== undefined) q = q.gte('selling_price', p.minPrice);
  if (p.maxPrice !== undefined) q = q.lte('selling_price', p.maxPrice);
  if (p.sizes.length) q = q.overlaps('sizes', p.sizes);
  if (p.colors.length) q = q.or(p.colors.filter((c) => !/[,(){}"\\]/.test(c)).map((c) => `colors.cs.[{"name":"${c}"}]`).join(','));
  if (p.inStockOnly) q = q.eq('in_stock', true);
  if (p.newOnly) q = q.eq('is_new_arrival', true);
  if (p.discountOnly) q = q.gt('discount_pct', 0);
  return q;
}

export function applySort<T extends FilterBuilder<T>>(query: T, sort: SortValue): T {
  switch (sort) {
    case 'price_asc':
      return query.order('selling_price', { ascending: true }).order('created_at', { ascending: false });
    case 'price_desc':
      return query.order('selling_price', { ascending: false }).order('created_at', { ascending: false });
    case 'best_selling':
      return query.order('sales_count', { ascending: false }).order('created_at', { ascending: false });
    case 'popular':
      return query.order('review_count', { ascending: false }).order('sales_count', { ascending: false });
    default:
      return query.order('created_at', { ascending: false });
  }
}

export const pageRange = (page: number, size = PAGE_SIZE): [number, number] => [(page - 1) * size, page * size - 1];

// ---------- sizes ----------
const ALPHA = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', 'XXXL', '3XL', '4XL', '5XL'];
/** S < M < L < XL < XXL, numeric sizes ascending, then anything else A-Z, "Free Size" last. */
export function compareSizes(a: string, b: string): number {
  const rank = (s: string) => {
    const u = s.trim().toUpperCase();
    if (u === 'FREE SIZE' || u === 'FREE') return [3, 0, u] as const;
    const ai = ALPHA.indexOf(u);
    if (ai >= 0) return [0, ai, u] as const;
    if (/^\d+(\.\d+)?$/.test(u)) return [1, Number(u), u] as const;
    return [2, 0, u] as const;
  };
  const [ga, na, sa] = rank(a);
  const [gb, nb, sb] = rank(b);
  return ga - gb || na - nb || sa.localeCompare(sb);
}
export const sortSizes = (sizes: readonly string[]) => [...new Set(sizes)].sort(compareSizes);

export function totalPages(total: number, size = PAGE_SIZE) {
  return Math.max(1, Math.ceil(total / size));
}

/** Page numbers to show: 1 … 4 5 6 … 20 */
export function pageWindow(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push('…');
    out.push(n);
  });
  return out;
}
