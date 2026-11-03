import { Link, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProductGrid } from '@/components/product/ProductGrid';
import { allCategories, collections, menCategories, products, womenCategories } from '@/data/placeholder';
import { getByCategory, getByCollection, getByGender, searchProducts } from '@/lib/catalog';
import { usePageTitle } from '@/hooks/usePageTitle';
import NotFound from './NotFound';

function SampleNotice() {
  return (
    <p className="mb-8 border border-accent/40 bg-accent/10 px-4 py-3 text-xs text-ink">
      Showing sample products for design review. Filtering, sorting and pagination arrive in Phase 4 with the real catalogue.
    </p>
  );
}

function CategoryChips({ list }: { list: { slug: string; name: string }[] }) {
  return (
    <ul className="mb-8 flex flex-wrap gap-2">
      {list.map((c) => (
        <li key={c.slug}>
          <Link
            to={`/category/${c.slug}`}
            className="inline-block border border-line px-4 py-2 text-xs uppercase tracking-[0.12em] text-primary transition-colors hover:border-primary hover:bg-primary hover:text-white"
          >
            {c.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function ShopAll() {
  usePageTitle('Shop All');
  return (
    <>
      <PageHeader title="Shop All" description="Everything from the VAYORA wardrobe." crumbs={[{ label: 'Shop' }]} />
      <div className="container-page py-10">
        <SampleNotice />
        <ProductGrid items={products} />
      </div>
    </>
  );
}

export function GenderPage({ gender }: { gender: 'men' | 'women' }) {
  const title = gender === 'women' ? "Women's Collection" : "Men's Collection";
  usePageTitle(title);
  return (
    <>
      <PageHeader title={title} crumbs={[{ label: title }]} />
      <div className="container-page py-10">
        <SampleNotice />
        <CategoryChips list={gender === 'women' ? womenCategories : menCategories} />
        <ProductGrid items={getByGender(gender)} />
      </div>
    </>
  );
}

export function CategoryPage() {
  const { slug = '' } = useParams();
  const category = allCategories.find((c) => c.slug === slug);
  usePageTitle(category?.name);
  if (!category) return <NotFound />;
  const parent = category.gender === 'women' ? { label: "Women's", to: '/women' } : { label: "Men's", to: '/men' };
  return (
    <>
      <PageHeader title={category.name} crumbs={[parent, { label: category.name }]} />
      <div className="container-page py-10">
        <SampleNotice />
        <ProductGrid items={getByCategory(slug)} emptyMessage="No sample products in this category yet." />
      </div>
    </>
  );
}

export function CollectionPage() {
  const { slug = '' } = useParams();
  const collection = collections.find((c) => c.slug === slug);
  usePageTitle(collection?.name);
  if (!collection) return <NotFound />;
  return (
    <>
      <PageHeader title={collection.name} crumbs={[{ label: 'Collections' }, { label: collection.name }]} />
      <div className="container-page py-10">
        <SampleNotice />
        <ProductGrid items={getByCollection(slug)} emptyMessage="No sample products in this collection yet." />
      </div>
    </>
  );
}

export function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  usePageTitle(q ? `Search: ${q}` : 'Search');
  const results = searchProducts(q);
  return (
    <>
      <PageHeader
        title={q ? `Results for “${q}”` : 'Search'}
        description={q ? `${results.length} product${results.length === 1 ? '' : 's'} found` : 'Use the search icon in the header to find products.'}
        crumbs={[{ label: 'Search' }]}
      />
      <div className="container-page py-10">
        {q && <ProductGrid items={results} emptyMessage={`No products matched “${q}”.`} />}
      </div>
    </>
  );
}
