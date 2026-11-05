import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PARAMS,
  applyListFilters,
  applySort,
  collectionFilter,
  compareSizes,
  filtersToSearchParams,
  pageRange,
  pageWindow,
  parseFilters,
  sanitizeSearch,
  sortSizes,
  totalPages,
  type FilterBuilder,
  type ListParams,
} from './catalogParams';

/** Records the calls a filter builder receives. */
function recorder() {
  const calls: [string, ...unknown[]][] = [];
  interface Rec extends FilterBuilder<Rec> {}
  const b: Rec = {
    eq: (c, v) => (calls.push(['eq', c, v]), b),
    gte: (c, v) => (calls.push(['gte', c, v]), b),
    lte: (c, v) => (calls.push(['lte', c, v]), b),
    gt: (c, v) => (calls.push(['gt', c, v]), b),
    or: (f) => (calls.push(['or', f]), b),
    overlaps: (c, v) => (calls.push(['overlaps', c, v]), b),
    order: (c, o) => (calls.push(['order', c, o]), b),
  };
  return { b, calls };
}
const params = (o: Partial<ListParams> = {}): ListParams => ({ ...DEFAULT_PARAMS, ...o });

describe('parseFilters / filtersToSearchParams', () => {
  it('uses safe defaults for an empty URL', () => {
    expect(parseFilters(new URLSearchParams())).toMatchObject({ sort: 'latest', page: 1, sizes: [], colors: [], inStockOnly: false });
  });

  it('round-trips a full filter set', () => {
    const f = parseFilters(new URLSearchParams('gender=women&min=500&max=2000&sizes=M,L&colors=Black&stock=1&new=1&sale=1&sort=price_asc&page=3&q=kurti'));
    expect(f).toMatchObject({ gender: 'women', minPrice: 500, maxPrice: 2000, sizes: ['M', 'L'], colors: ['Black'], inStockOnly: true, newOnly: true, discountOnly: true, sort: 'price_asc', page: 3, q: 'kurti' });
    expect(parseFilters(filtersToSearchParams(f))).toEqual(f);
  });

  it('ignores malformed values instead of trusting them', () => {
    const f = parseFilters(new URLSearchParams('gender=alien&min=abc&max=-5&sort=drop_table&page=-2&sizes=,,'));
    expect(f).toMatchObject({ gender: undefined, minPrice: undefined, maxPrice: undefined, sort: 'latest', page: 1, sizes: [] });
    expect(parseFilters(new URLSearchParams('page=99999')).page).toBe(1000);
  });

  it('omits defaults from generated URLs', () => {
    expect(filtersToSearchParams(DEFAULT_PARAMS).toString()).toBe('');
  });
});

describe('sanitizeSearch', () => {
  it('strips characters that could alter a filter expression', () => {
    expect(sanitizeSearch('red,name.eq.x)(%_*"\'\\')).toBe('red name.eq.x');
    expect(sanitizeSearch('  two   words ')).toBe('two words');
    expect(sanitizeSearch('x'.repeat(200))).toHaveLength(60);
  });
});

describe('applyListFilters', () => {
  it('adds nothing for default params', () => {
    const { b, calls } = recorder();
    applyListFilters(b, params());
    expect(calls).toEqual([]);
  });

  it('builds category, price, size, stock and sale filters', () => {
    const { b, calls } = recorder();
    applyListFilters(b, params({ gender: 'men', categorySlug: 't-shirt', minPrice: 500, maxPrice: 1500, sizes: ['M', 'L'], inStockOnly: true, newOnly: true, discountOnly: true }));
    expect(calls).toContainEqual(['eq', 'gender', 'men']);
    expect(calls).toContainEqual(['or', 'category_slug.eq.t-shirt,subcategory_slug.eq.t-shirt,parent_category_slug.eq.t-shirt']);
    expect(calls).toContainEqual(['gte', 'selling_price', 500]);
    expect(calls).toContainEqual(['lte', 'selling_price', 1500]);
    expect(calls).toContainEqual(['overlaps', 'sizes', ['M', 'L']]);
    expect(calls).toContainEqual(['eq', 'in_stock', true]);
    expect(calls).toContainEqual(['eq', 'is_new_arrival', true]);
    expect(calls).toContainEqual(['gt', 'discount_pct', 0]);
  });

  it('rejects unsafe category/collection slugs', () => {
    const { b, calls } = recorder();
    applyListFilters(b, params({ categorySlug: 'x),is_featured.eq.true', collectionSlug: 'a,b' }));
    expect(calls).toEqual([]);
  });

  it('search uses sanitized text over name, category and sku', () => {
    const { b, calls } = recorder();
    applyListFilters(b, params({ q: 'shirt,%' }));
    expect(calls).toEqual([['or', 'name.ilike.%shirt%,category_name.ilike.%shirt%,sku.ilike.%shirt%']]);
  });

  it('colour filter skips values that could break the filter syntax', () => {
    const { b, calls } = recorder();
    applyListFilters(b, params({ colors: ['Black', 'Bad"),x'] }));
    expect(calls).toEqual([['or', 'colors.cs.[{"name":"Black"}]']]);
  });
});

describe('collectionFilter', () => {
  it('maps flag-based collections and manual membership', () => {
    expect(collectionFilter('new-arrivals')).toBe('is_new_arrival.eq.true,collection_slugs.cs.{new-arrivals}');
    expect(collectionFilter('special-offers')).toContain('discount_pct.gt.0');
    expect(collectionFilter('winter')).toContain('category_slug.eq.mens-winter');
    expect(collectionFilter('clearance')).toBe('collection_slugs.cs.{clearance}');
  });
});

describe('applySort / paging', () => {
  it.each([
    ['latest', 'created_at'],
    ['price_asc', 'selling_price'],
    ['price_desc', 'selling_price'],
    ['best_selling', 'sales_count'],
    ['popular', 'review_count'],
  ] as const)('%s sorts by %s first', (sort, column) => {
    const { b, calls } = recorder();
    applySort(b, sort);
    expect(calls[0][1]).toBe(column);
  });

  it('price_asc is ascending and price_desc descending', () => {
    const a = recorder(); applySort(a.b, 'price_asc');
    const d = recorder(); applySort(d.b, 'price_desc');
    expect(a.calls[0][2]).toEqual({ ascending: true });
    expect(d.calls[0][2]).toEqual({ ascending: false });
  });

  it('computes ranges and page counts', () => {
    expect(pageRange(1)).toEqual([0, 11]);
    expect(pageRange(3)).toEqual([24, 35]);
    expect(totalPages(0)).toBe(1);
    expect(totalPages(25)).toBe(3);
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow(10, 20)).toEqual([1, '…', 9, 10, 11, '…', 20]);
    expect(pageWindow(1, 20)).toEqual([1, 2, '…', 20]);
  });
});

describe('size ordering', () => {
  it('orders clothing sizes naturally', () => {
    expect(sortSizes(['XL', 'S', 'M', 'XXL', 'L'])).toEqual(['S', 'M', 'L', 'XL', 'XXL']);
    expect(sortSizes(['34', '30', '32', 'Free Size', 'M'])).toEqual(['M', '30', '32', '34', 'Free Size']);
    expect(sortSizes(['M', 'M', 'S'])).toEqual(['S', 'M']);
    expect(compareSizes('l', 'L')).toBe(0);
  });
});
