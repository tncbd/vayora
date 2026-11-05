import { useState } from 'react';
import type { Product } from '@/types';
import { ProductCard } from './ProductCard';
import { QuickView } from './QuickView';

export function ProductGrid({ items, emptyMessage = 'No products found.', cols = 4 }: { items: Product[]; emptyMessage?: string; cols?: 3 | 4 }) {
  const [quick, setQuick] = useState<Product | null>(null);
  if (items.length === 0) return <p className="py-16 text-center text-sm text-muted">{emptyMessage}</p>;
  return (
    <>
      <div className={`grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:gap-x-6 ${cols === 4 ? 'lg:grid-cols-4' : ''}`}>
        {items.map((p) => (
          <ProductCard key={p.id} product={p} onQuickView={setQuick} />
        ))}
      </div>
      {quick && <QuickView product={quick} onClose={() => setQuick(null)} />}
    </>
  );
}

export function ProductGridSkeleton({ count = 8, cols = 4 }: { count?: number; cols?: 3 | 4 }) {
  return (
    <div className={`grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:gap-x-6 ${cols === 4 ? 'lg:grid-cols-4' : ''}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[3/4] bg-secondary" />
          <div className="mt-3.5 h-3 w-3/4 bg-secondary" />
          <div className="mt-2 h-3 w-1/3 bg-secondary" />
        </div>
      ))}
    </div>
  );
}
