import { listCollection } from '@/lib/catalogApi';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAsync } from '@/hooks/useAsync';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ProductGrid } from '@/components/product/ProductGrid';
import { cn } from '@/lib/cn';

interface Props {
  /** Collection slug in the database (new-arrivals, best-sellers, trending, winter, featured…). */
  slug: string;
  eyebrow?: string;
  title: string;
  description?: string;
  limit?: number;
  tinted?: boolean;
}

/** A homepage rail. Renders nothing until products exist, so an empty store shows no empty sections. */
export function ProductSection({ slug, eyebrow, title, description, limit = 4, tinted }: Props) {
  const { data } = useAsync(() => (isSupabaseConfigured ? listCollection(slug, limit) : Promise.resolve([])), [slug, limit]);
  if (!data || data.length === 0) return null;
  return (
    <section className={cn(tinted && 'bg-secondary')}>
      <div className="container-page py-14 lg:py-20">
        <SectionHeading eyebrow={eyebrow} title={title} description={description} linkLabel="View all" linkTo={`/collections/${slug}`} />
        <ProductGrid items={data} />
      </div>
    </section>
  );
}
