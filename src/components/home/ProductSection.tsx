import type { Product } from '@/types';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ProductGrid } from '@/components/product/ProductGrid';
import { cn } from '@/lib/cn';

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  linkTo: string;
  products: Product[];
  limit?: number;
  tinted?: boolean;
}

export function ProductSection({ eyebrow, title, description, linkTo, products, limit = 4, tinted }: Props) {
  if (products.length === 0) return null;
  return (
    <section className={cn(tinted && 'bg-secondary')}>
      <div className="container-page py-14 lg:py-20">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          description={description}
          linkLabel="View all"
          linkTo={linkTo}
        />
        <ProductGrid items={products.slice(0, limit)} />
      </div>
    </section>
  );
}
