import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { ChevronRight, Minus, Plus } from 'lucide-react';
import { getProductBySlug, getProductsBySlugs, getRelatedProducts } from '@/lib/catalogApi';
import { isSupabaseConfigured } from '@/lib/supabase';
import { formatBDT } from '@/lib/format';
import { colorsOf, defaultSelection, effectivePrice, findVariant, isOptionAvailable, isSelectionComplete, sizesOf, type Selection } from '@/lib/variantLogic';
import { readRecent, rememberProduct } from '@/lib/recentlyViewed';
import { useAsync } from '@/hooks/useAsync';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ProductReviews } from '@/components/product/ProductReviews';
import { ProductGrid } from '@/components/product/ProductGrid';
import { StarRating } from '@/components/product/StarRating';
import { WishlistButton } from '@/components/product/WishlistButton';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { cn } from '@/lib/cn';
import NotFound from './NotFound';

export default function ProductPage() {
  const { slug = '' } = useParams();
  const { data: product, loading, error, reload } = useAsync(() => (isSupabaseConfigured ? getProductBySlug(slug) : Promise.resolve(null)), [slug]);
  const [sel, setSel] = useState<Selection>({ size: null, color: null });
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const cart = useCart();
  const navigate = useNavigate();

  usePageTitle(product ? product.seoTitle || product.name : undefined);

  useEffect(() => {
    if (!product) return;
    setSel(defaultSelection(product.variants));
    setQty(1);
    setAdded(false);
    rememberProduct(product.slug);
  }, [product]);

  const related = useAsync(() => (product ? getRelatedProducts(product) : Promise.resolve([])), [product?.id]);
  const recent = useAsync(() => getProductsBySlugs(readRecent().filter((s) => s !== slug).slice(0, 4)), [slug]);

  const variants = product?.variants ?? [];
  const sizes = useMemo(() => sizesOf(variants), [variants]);
  const colors = useMemo(() => colorsOf(variants), [variants]);
  const complete = isSelectionComplete(variants, sel);
  const variant = complete ? findVariant(variants, sel) : null;

  if (loading && !product) return <PageHeader title="Loading…" />;
  if (error) {
    return (
      <div className="container-page py-24 text-center" role="alert">
        <p className="text-sm text-red-700">We could not load this product. {error}</p>
        <Button className="mt-5" variant="outline" onClick={reload}>Try again</Button>
      </div>
    );
  }
  if (!product) return <NotFound />;

  const unit = effectivePrice(product.sellingPrice, variant);
  const showStrike = unit < product.regularPrice;
  const canBuy = !!variant && variant.inStock && variant.availableQty > 0;
  const maxQty = variant ? Math.max(1, Math.min(variant.availableQty, 10)) : 10;
  const status = !complete ? null : !variant || !variant.inStock ? 'out' : variant.availableQty <= 5 ? 'low' : 'in';

  return (
    <>
      <div className="container-page pt-6">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <Link to="/" className="hover:text-primary">Home</Link>
          <ChevronRight size={12} aria-hidden="true" />
          <Link to="/shop" className="hover:text-primary">Shop</Link>
          {product.categorySlug && (<><ChevronRight size={12} aria-hidden="true" /><Link to={`/category/${product.categorySlug}`} className="hover:text-primary">{product.categoryName}</Link></>)}
          <ChevronRight size={12} aria-hidden="true" />
          <span className="text-primary">{product.name}</span>
        </nav>
      </div>

      <div className="container-page grid gap-8 py-8 lg:grid-cols-2 lg:gap-14 lg:py-12">
        <ProductGallery images={product.images} name={product.name} label={product.name.charAt(0)} />

        <div>
          <p className="eyebrow">{product.categoryName ?? product.gender}</p>
          <h1 className="mt-2 text-4xl font-medium leading-tight sm:text-5xl">{product.name}</h1>
          {product.reviewCount > 0 && product.avgRating !== null && <div className="mt-3"><StarRating value={product.avgRating} size={16} count={product.reviewCount} /></div>}

          <p className="mt-5 flex items-baseline gap-3">
            <span className="text-2xl font-medium text-primary">{formatBDT(unit)}</span>
            {showStrike && <span className="text-base text-muted line-through">{formatBDT(product.regularPrice)}</span>}
            {showStrike && product.discountPct > 0 && !variant?.price && <span className="bg-accent px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-primary">-{product.discountPct}%</span>}
          </p>
          {product.shortDescription && <p className="mt-4 text-sm leading-relaxed text-muted">{product.shortDescription}</p>}

          {sizes.length > 0 && (
            <fieldset className="mt-7">
              <legend className="mb-2.5 text-xs font-medium uppercase tracking-[0.18em]">Size{sel.size ? `: ${sel.size}` : ''}</legend>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => {
                  const ok = isOptionAvailable(variants, 'size', s, sel);
                  return (
                    <button key={s} aria-pressed={sel.size === s} disabled={!ok} onClick={() => setSel((x) => ({ ...x, size: s }))}
                      className={cn('min-w-12 border px-4 py-2.5 text-sm transition-colors', sel.size === s ? 'border-primary bg-primary text-white' : 'border-line hover:border-primary', !ok && 'cursor-not-allowed text-muted/60 line-through hover:border-line')}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {colors.length > 0 && (
            <fieldset className="mt-6">
              <legend className="mb-2.5 text-xs font-medium uppercase tracking-[0.18em]">Color{sel.color ? `: ${sel.color}` : ''}</legend>
              <div className="flex flex-wrap gap-3">
                {colors.map((c) => {
                  const ok = isOptionAvailable(variants, 'color', c.name, sel);
                  return (
                    <button key={c.name} title={c.name} aria-label={c.name} aria-pressed={sel.color === c.name} disabled={!ok} onClick={() => setSel((x) => ({ ...x, color: c.name }))}
                      className={cn('flex h-9 w-9 items-center justify-center rounded-full border bg-secondary text-[10px]', sel.color === c.name ? 'ring-2 ring-primary ring-offset-2' : 'border-line', !ok && 'opacity-35')}
                      style={c.hex ? { backgroundColor: c.hex } : undefined}>
                      {!c.hex && c.name.charAt(0)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          <p className={cn('mt-5 text-xs uppercase tracking-[0.16em]', status === 'out' ? 'text-red-700' : status === 'low' ? 'text-amber-700' : 'text-green-700')} role="status">
            {!complete ? (variants.length ? 'Select your options' : product.inStock ? 'In stock' : 'Sold out')
              : status === 'out' ? 'Sold out' : status === 'low' ? `Only ${variant!.availableQty} left` : 'In stock'}
          </p>

          <div className="mt-6 flex items-center gap-4">
            <div className="inline-flex items-center border border-line" role="group" aria-label="Quantity">
              <button className="p-3 disabled:opacity-40" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus size={16} /></button>
              <span className="w-10 text-center text-sm" aria-live="polite">{qty}</span>
              <button className="p-3 disabled:opacity-40" aria-label="Increase quantity" disabled={qty >= maxQty} onClick={() => setQty((q) => Math.min(maxQty, q + 1))}><Plus size={16} /></button>
            </div>
            <WishlistButton productId={product.id} label className="border border-line px-4 py-3" />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button disabled={!canBuy} title={canBuy ? undefined : 'Select an available size and colour'} onClick={() => { cart.add(variant!.id, qty); setAdded(true); }}>Add to Cart</Button>
            <Button variant="outline" disabled={!canBuy} title={canBuy ? undefined : 'Select an available size and colour'} onClick={() => { cart.add(variant!.id, qty); navigate('/checkout'); }}>Buy Now</Button>
          </div>
          {added && (
            <p role="status" className="mt-3 text-sm text-green-800">
              Added to your cart. <Link to="/cart" className="underline">View cart</Link>
            </p>
          )}
          <p className="mt-3 text-xs text-muted">Cash on Delivery available across Bangladesh.</p>

          <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-line pt-6 text-sm">
            <dt className="text-muted">SKU</dt><dd>{variant?.sku ?? product.sku}</dd>
            {product.categoryName && (<><dt className="text-muted">Category</dt><dd>{product.categoryName}</dd></>)}
          </dl>
        </div>
      </div>

      {product.description && (
        <section className="container-page border-t border-line py-10">
          <h2 className="text-3xl font-medium">Description</h2>
          <p className="mt-4 max-w-3xl whitespace-pre-line text-[15px] leading-relaxed text-ink">{product.description}</p>
        </section>
      )}

      <div className="container-page pb-10"><ProductReviews productId={product.id} /></div>

      {(related.data?.length ?? 0) > 0 && (
        <section className="container-page border-t border-line py-12">
          <h2 className="mb-8 text-3xl font-medium">You May Also Like</h2>
          <ProductGrid items={related.data!} />
        </section>
      )}
      {(recent.data?.length ?? 0) > 0 && (
        <section className="container-page border-t border-line py-12">
          <h2 className="mb-8 text-3xl font-medium">Recently Viewed</h2>
          <ProductGrid items={recent.data!} />
        </section>
      )}
    </>
  );
}
