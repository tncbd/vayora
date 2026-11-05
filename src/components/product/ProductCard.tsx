import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import type { Product } from '@/types';
import { formatBDT } from '@/lib/format';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { WishlistButton } from './WishlistButton';
import { StarRating } from './StarRating';

export function ProductCard({ product, onQuickView }: { product: Product; onQuickView?: (p: Product) => void }) {
  const off = product.discountPct;
  return (
    <article className="group relative">
      <Link to={`/product/${product.slug}`} className="block" aria-label={product.name}>
        <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
          <ImagePlaceholder
            src={product.imageUrl}
            alt={product.name}
            tone={product.gender === 'women' ? 'from-[#efe3dd] to-[#f8f5f0]' : 'from-[#e4e6e8] to-[#f6f5f2]'}
            label={product.name.charAt(0)}
            className={`transition-all duration-700 group-hover:scale-105 ${product.hoverImageUrl ? 'group-hover:opacity-0' : ''}`}
          />
          {product.hoverImageUrl && (
            <img src={product.hoverImageUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full scale-105 object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          )}
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {!product.inStock && <span className="bg-white px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-primary">Sold out</span>}
            {product.isNewArrival && <span className="bg-primary px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-white">New</span>}
            {off > 0 && <span className="bg-accent px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-primary">-{off}%</span>}
          </div>
        </div>
        <div className="mt-3.5">
          <h3 className="line-clamp-1 font-sans text-sm font-medium text-primary">{product.name}</h3>
          <div className="mt-1 flex items-baseline gap-2 text-sm">
            <span className="font-medium text-primary">{formatBDT(product.sellingPrice)}</span>
            {off > 0 && <span className="text-xs text-muted line-through">{formatBDT(product.regularPrice)}</span>}
          </div>
          {product.reviewCount > 0 && product.avgRating !== null && (
            <div className="mt-1.5"><StarRating value={product.avgRating} size={12} count={product.reviewCount} /></div>
          )}
          {product.colors.length > 0 && (
            <ul className="mt-2 flex gap-1.5" aria-label="Available colors">
              {product.colors.map((c) => (
                <li key={c.name} title={c.name} className="h-3.5 w-3.5 rounded-full border border-line bg-secondary" style={c.hex ? { backgroundColor: c.hex } : undefined} />
              ))}
            </ul>
          )}
        </div>
      </Link>

      <WishlistButton productId={product.id} className="absolute right-3 top-3 h-9 w-9 justify-center bg-white/90 hover:bg-white" />
      {onQuickView && (
        <button
          type="button"
          onClick={() => onQuickView(product)}
          aria-label={`Quick view ${product.name}`}
          className="absolute right-3 top-14 inline-flex h-9 w-9 items-center justify-center bg-white/90 text-primary opacity-100 transition-opacity hover:bg-white sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
        >
          <Eye size={18} />
        </button>
      )}
    </article>
  );
}
