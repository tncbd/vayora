import { Link } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useQuote } from '@/hooks/useQuote';
import { usePageTitle } from '@/hooks/usePageTitle';
import { isSupabaseConfigured } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button, ButtonLink } from '@/components/ui/Button';
import { FormMessage } from '@/components/ui/Field';
import { QuoteLineRow } from '@/components/cart/QuoteLineRow';
import { Totals } from '@/components/cart/Totals';

export default function Cart() {
  usePageTitle('Shopping Cart');
  const cart = useCart();
  const { quote, loading, error, reload } = useQuote(cart.lines);

  const header = <PageHeader title="Shopping Cart" crumbs={[{ label: 'Cart' }]} />;

  if (!cart.lines.length) {
    return (
      <>
        {header}
        <div className="container-page py-16 text-center sm:py-24">
          <p className="text-sm text-muted">Your cart is empty.</p>
          <ButtonLink to="/shop" className="mt-6">Continue Shopping</ButtonLink>
        </div>
      </>
    );
  }
  if (!isSupabaseConfigured) {
    return (
      <>
        {header}
        <div className="container-page py-16 text-center"><FormMessage kind="info">The store is not connected to its database, so the cart cannot be priced.</FormMessage></div>
      </>
    );
  }

  const bad = quote?.lines.filter((l) => l.status !== 'ok') ?? [];
  return (
    <>
      {header}
      <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_380px]">
        <section aria-label="Cart items">
          {error && (
            <div className="mb-4"><FormMessage kind="error">{error}</FormMessage><Button variant="outline" className="mt-3" onClick={reload}>Try again</Button></div>
          )}
          {!quote && loading && <p className="py-10 text-sm text-muted" role="status">Loading your cart…</p>}
          {quote && (
            <ul>
              {quote.lines.map((l) => (
                <QuoteLineRow key={l.variantId} line={l} onQty={(q) => cart.setQty(l.variantId, q)} onRemove={() => cart.remove(l.variantId)} />
              ))}
            </ul>
          )}
          {bad.length > 0 && (
            <Button variant="outline" className="mt-4" onClick={() => bad.forEach((l) => l.status === 'unavailable' || l.available === 0 ? cart.remove(l.variantId) : cart.setQty(l.variantId, l.available))}>
              Fix unavailable items
            </Button>
          )}
          <Link to="/shop" className="mt-6 inline-block text-xs uppercase tracking-[0.18em] text-primary link-underline">← Continue shopping</Link>
        </section>

        <aside className="h-fit border border-line bg-white p-6" aria-label="Order summary">
          <h2 className="text-2xl font-medium">Order Summary</h2>
          <div className="mt-4">
            {quote ? <Totals quote={quote} hasDistrict={false} /> : <p className="text-sm text-muted">—</p>}
          </div>
          <p className="mt-3 text-xs text-muted">Delivery charge and coupons are applied at checkout. You pay in cash on delivery.</p>
          {quote && quote.ok ? (
            <ButtonLink to="/checkout" className="mt-5 w-full">Proceed to Checkout</ButtonLink>
          ) : (
            <Button className="mt-5 w-full" disabled>Proceed to Checkout</Button>
          )}
          {quote && !quote.ok && <p className="mt-3 text-xs text-red-700">Fix the items marked above to continue.</p>}
        </aside>
      </div>
    </>
  );
}
