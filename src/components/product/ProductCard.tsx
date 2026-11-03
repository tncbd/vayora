import { Link } from 'react-router-dom';
import type { Product } from '@/types';
import { discountPercent, formatBDT } from '@/lib/format';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';

export function ProductCard({ product }: { product: Product }) {
  const off = discountPercent(product.regularPrice, product.sellingPrice);
  return (
    <article className="group">
      <Link to={`/product/${product.slug}`} className="block" aria-label={product.name}>
        <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
          <ImagePlaceholder
            src={product.imageUrl}
            alt={product.name}
            tone={product.gender === 'women' ? 'from-[#efe3dd] to-[#f8f5f0]' : 'from-[#e4e6e8] to-[#f6f5f2]'}
            label={product.name.charAt(0)}
            className="transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {product.isNewArrival && (
              <span className="bg-primary px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-white">New</span>
            )}
            {off > 0 && (
              <span className="bg-accent px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-primary">
                -{off}%
              </span>
            )}
          </div>
        </div>
        <div className="mt-3.5">
          <h3 className="line-clamp-1 font-sans text-sm font-medium text-primary">{product.name}</h3>
          <div className="mt-1 flex items-baseline gap-2 text-sm">
            <span className="font-medium text-primary">{formatBDT(product.sellingPrice)}</span>
            {off > 0 && <span className="text-xs text-muted line-through">{formatBDT(product.regularPrice)}</span>}
          </div>
          {product.colors.length > 0 && (
            <ul className="mt-2 flex gap-1.5" aria-label="Available colors">
              {product.colors.map((c) => (
                <li
                  key={c.name}
                  title={c.name}
                  className="h-3.5 w-3.5 rounded-full border border-line"
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </ul>
          )}
        </div>
      </Link>
    </article>
  );
}
