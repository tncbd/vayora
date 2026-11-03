import type { Product } from '@/types';
import { ProductCard } from './ProductCard';

export function ProductGrid({ items, emptyMessage = 'No products found.' }: { items: Product[]; emptyMessage?: string }) {
  if (items.length === 0) {
    return <p className="py-16 text-center text-sm text-muted">{emptyMessage}</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
      {items.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
