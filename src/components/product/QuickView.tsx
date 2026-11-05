import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import type { Product } from '@/types';
import { formatBDT } from '@/lib/format';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import { ButtonLink } from '@/components/ui/Button';
import { StarRating } from './StarRating';
import { WishlistButton } from './WishlistButton';

/** Read-only preview. Choosing size/colour and ordering happen on the full product page. */
export function QuickView({ product, onClose }: { product: Product; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={`Quick view: ${product.name}`}>
      <div className="absolute inset-0 animate-fade-in bg-primary/50" onClick={onClose} aria-hidden="true" />
      <div className="relative grid max-h-[92vh] w-full max-w-3xl animate-fade-up overflow-y-auto bg-white sm:grid-cols-2">
        <button onClick={onClose} aria-label="Close quick view" className="absolute right-3 top-3 z-10 bg-white/90 p-2"><X size={20} /></button>
        <div className="aspect-[3/4] bg-secondary">
          <ImagePlaceholder src={product.imageUrl} alt={product.name} label={product.name.charAt(0)} />
        </div>
        <div className="flex flex-col p-6 sm:p-8">
          <p className="eyebrow">{product.categoryName ?? product.gender}</p>
          <h2 className="mt-2 text-3xl font-medium">{product.name}</h2>
          {product.reviewCount > 0 && product.avgRating !== null && <div className="mt-2"><StarRating value={product.avgRating} count={product.reviewCount} /></div>}
          <p className="mt-3 flex items-baseline gap-3">
            <span className="text-xl font-medium text-primary">{formatBDT(product.sellingPrice)}</span>
            {product.discountPct > 0 && <span className="text-sm text-muted line-through">{formatBDT(product.regularPrice)}</span>}
          </p>
          {product.shortDescription && <p className="mt-4 text-sm leading-relaxed text-muted">{product.shortDescription}</p>}
          {product.sizes.length > 0 && <p className="mt-4 text-sm"><span className="font-medium">Sizes:</span> {product.sizes.join(', ')}</p>}
          {product.colors.length > 0 && <p className="mt-1 text-sm"><span className="font-medium">Colors:</span> {product.colors.map((c) => c.name).join(', ')}</p>}
          <p className={`mt-4 text-xs uppercase tracking-[0.16em] ${product.inStock ? 'text-green-700' : 'text-red-700'}`}>{product.inStock ? 'In stock' : 'Sold out'}</p>
          <div className="mt-auto flex items-center gap-3 pt-6">
            <ButtonLink to={`/product/${product.slug}`} className="flex-1">View Details</ButtonLink>
            <WishlistButton productId={product.id} className="h-12 w-12 justify-center border border-line" />
          </div>
          <Link to={`/product/${product.slug}`} onClick={onClose} className="sr-only">Open product page</Link>
        </div>
      </div>
    </div>
  );
}
