import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProductGrid, ProductGridSkeleton } from '@/components/product/ProductGrid';
import { Pagination } from '@/components/product/Pagination';
import { FilterPanel } from '@/components/product/FilterPanel';
import { Button } from '@/components/ui/Button';
import { listProducts } from '@/lib/catalogApi';
import { isSupabaseConfigured } from '@/lib/supabase';
import { PAGE_SIZE, SORT_OPTIONS, filtersToSearchParams, parseFilters, totalPages, type ListParams, type SortValue } from '@/lib/catalogParams';
import { useAsync } from '@/hooks/useAsync';
import { useCategories } from '@/hooks/useCategories';
import { usePageTitle } from '@/hooks/usePageTitle';

interface Props {
  title: string;
  description?: string;
  crumbs: { label: string; to?: string }[];
  /** Fixed part of the query for this page. */
  base: Pick<ListParams, 'gender' | 'categorySlug' | 'collectionSlug'>;
  /** Let shoppers filter by gender (Shop All, collections, categories, search). */
  allowGender?: boolean;
  /** Read the search text from ?q= (search page only). */
  searchMode?: boolean;
  /** Extra content above the grid, e.g. category chips. */
  intro?: ReactNode;
  emptyMessage?: string;
  /** Do not list "All categories" in the filter sidebar. */
  hideCategories?: boolean;
}

export default function CatalogPage({ title, description, crumbs, base, allowGender = true, searchMode, intro, emptyMessage, hideCategories }: Props) {
  usePageTitle(title);
  const [sp, setSp] = useSearchParams();
  const [drawer, setDrawer] = useState(false);
  const { categories } = useCategories();

  const f = useMemo(() => parseFilters(sp), [sp]);
  const params: ListParams = useMemo(
    () => ({
      ...f,
      gender: base.gender ?? (allowGender ? f.gender : undefined),
      categorySlug: base.categorySlug,
      collectionSlug: base.collectionSlug,
      q: searchMode ? f.q : undefined,
    }),
    [f, base.gender, base.categorySlug, base.collectionSlug, allowGender, searchMode],
  );

  const key = JSON.stringify(params);
  const { data, loading, error, reload } = useAsync(
    () => (isSupabaseConfigured ? listProducts(params) : Promise.resolve({ items: [], total: 0 })),
    [key],
  );

  const update = useCallback(
    (patch: Partial<ListParams>) => {
      const next = { ...f, ...patch, page: patch.page ?? 1 };
      setSp(filtersToSearchParams(next, !!searchMode), { replace: false });
      if (patch.page) window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [f, setSp, searchMode],
  );
  const clear = () => setSp(searchMode && f.q ? new URLSearchParams({ q: f.q }) : new URLSearchParams());

  const hasActive = !!(f.minPrice !== undefined || f.maxPrice !== undefined || f.sizes.length || f.colors.length || f.inStockOnly || f.newOnly || f.discountOnly || (allowGender && !base.gender && f.gender));
  const pages = totalPages(data?.total ?? 0);

  const panel = (
    <FilterPanel
      value={params}
      onChange={update}
      onClear={clear}
      showGender={allowGender && !base.gender}
      categories={hideCategories ? [] : categories}
      hasActive={hasActive}
    />
  );

  return (
    <>
      <PageHeader title={title} description={description} crumbs={crumbs} />
      <div className="container-page py-8 sm:py-10">
        {intro}
        {!isSupabaseConfigured && (
          <p className="mb-6 border border-accent/40 bg-accent/10 px-4 py-3 text-xs">The store is not connected to its database yet, so no products can be shown.</p>
        )}

        <div className="mb-6 flex items-center justify-between gap-3 border-b border-line pb-4">
          <button className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] lg:hidden" onClick={() => setDrawer(true)}>
            <SlidersHorizontal size={16} /> Filters{hasActive && ' •'}
          </button>
          <p className="hidden text-sm text-muted lg:block" role="status">
            {loading ? 'Loading…' : `${data?.total ?? 0} product${data?.total === 1 ? '' : 's'}`}
          </p>
          <label className="ml-auto flex items-center gap-2 text-xs uppercase tracking-[0.14em]">
            <span className="text-muted">Sort</span>
            <select value={f.sort} onChange={(e) => update({ sort: e.target.value as SortValue })} className="border border-line bg-white px-3 py-2 text-sm normal-case tracking-normal">
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
        </div>

        <div className="lg:grid lg:grid-cols-[250px_1fr] lg:gap-10">
          <aside className="hidden lg:block"><div className="sticky top-28">{panel}</div></aside>
          <div>
            {error ? (
              <div className="py-16 text-center" role="alert">
                <p className="text-sm text-red-700">We could not load products. {error}</p>
                <Button className="mt-5" variant="outline" onClick={reload}>Try again</Button>
              </div>
            ) : loading && !data ? (
              <ProductGridSkeleton count={PAGE_SIZE} cols={3} />
            ) : (
              <>
                <ProductGrid items={data?.items ?? []} cols={3} emptyMessage={hasActive ? 'No products match these filters.' : emptyMessage ?? 'No products here yet. Please check back soon.'} />
                <Pagination page={f.page} pages={pages} onChange={(p) => update({ page: p })} />
              </>
            )}
          </div>
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="absolute inset-0 animate-fade-in bg-primary/50" onClick={() => setDrawer(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm animate-slide-in flex-col bg-white">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <span className="font-display text-xl">Filters</span>
              <button onClick={() => setDrawer(false)} aria-label="Close filters"><X size={22} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-6">{panel}</div>
            <div className="border-t border-line p-4">
              <Button className="w-full" onClick={() => setDrawer(false)}>Show {data?.total ?? 0} products</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
