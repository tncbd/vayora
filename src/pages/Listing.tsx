import { Link, useParams, useSearchParams } from 'react-router-dom';
import CatalogPage from './CatalogPage';
import NotFound from './NotFound';
import { useCategories } from '@/hooks/useCategories';
import { useAsync } from '@/hooks/useAsync';
import { getCollections } from '@/lib/catalogApi';
import { isSupabaseConfigured } from '@/lib/supabase';
import { collections as fallbackCollections } from '@/data/placeholder';
import { sanitizeSearch } from '@/lib/catalogParams';
import { PageHeader } from '@/components/ui/PageHeader';
import { usePageTitle } from '@/hooks/usePageTitle';

function Chips({ list }: { list: { slug: string; name: string }[] }) {
  if (list.length === 0) return null;
  return (
    <ul className="mb-8 flex flex-wrap gap-2">
      {list.map((c) => (
        <li key={c.slug}>
          <Link to={`/category/${c.slug}`} className="inline-block border border-line px-4 py-2 text-xs uppercase tracking-[0.12em] text-primary transition-colors hover:border-primary hover:bg-primary hover:text-white">
            {c.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ShopAll() {
  return <CatalogPage title="Shop All" description="Everything from the VAYORA wardrobe." crumbs={[{ label: 'Shop' }]} base={{}} />;
}

export function GenderPage({ gender }: { gender: 'men' | 'women' }) {
  const title = gender === 'women' ? "Women's Collection" : "Men's Collection";
  const { categories } = useCategories();
  const parent = categories.find((c) => c.slug === gender && !c.parentId);
  const kids = parent ? categories.filter((c) => c.parentId === parent.id) : categories.filter((c) => c.gender === gender && c.parentId !== null);
  return <CatalogPage title={title} crumbs={[{ label: title }]} base={{ gender }} allowGender={false} intro={<Chips list={kids} />} />;
}

export function CategoryPage() {
  const { slug = '' } = useParams();
  const { categories, loaded } = useCategories();
  const category = categories.find((c) => c.slug === slug);
  // Hooks must run in the same order every render, so call the title hook before any early return.
  usePageTitle(category?.name);
  if (!loaded && isSupabaseConfigured) return <PageHeader title="Loading…" />;
  if (!category) return <NotFound />;
  const parent = category.parentId ? categories.find((c) => c.id === category.parentId) : null;
  const crumbs = [...(parent ? [{ label: parent.name, to: `/category/${parent.slug}` }] : []), { label: category.name }];
  const kids = categories.filter((c) => c.parentId === category.id);
  return (
    <CatalogPage
      key={slug}
      title={category.name}
      crumbs={crumbs}
      base={{ categorySlug: slug }}
      intro={<Chips list={kids} />}
      emptyMessage="No products in this category yet."
    />
  );
}

export function CollectionPage() {
  const { slug = '' } = useParams();
  const { data, loading } = useAsync(() => (isSupabaseConfigured ? getCollections() : Promise.resolve(fallbackCollections)), []);
  const collection = (data ?? []).find((c) => c.slug === slug);
  usePageTitle(collection?.name);
  if (loading) return <PageHeader title="Loading…" />;
  if (!collection) return <NotFound />;
  return (
    <CatalogPage key={slug} title={collection.name} crumbs={[{ label: 'Collections' }, { label: collection.name }]} base={{ collectionSlug: slug }} emptyMessage="No products in this collection yet." />
  );
}

export function SearchPage() {
  const [params] = useSearchParams();
  const q = sanitizeSearch(params.get('q') ?? '');
  if (!q) {
    return <PageHeader title="Search" description="Use the search icon in the header to find products." crumbs={[{ label: 'Search' }]} />;
  }
  return (
    <CatalogPage title={`Results for “${q}”`} crumbs={[{ label: 'Search' }]} base={{}} searchMode emptyMessage={`No products matched “${q}”.`} hideCategories />
  );
}
