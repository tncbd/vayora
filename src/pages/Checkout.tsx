import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useQuote } from '@/hooks/useQuote';
import { usePageTitle } from '@/hooks/usePageTitle';
import { DISTRICTS } from '@/lib/districts';
import { LAST_ORDER_KEY, placeOrder } from '@/lib/checkoutApi';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { checkoutSchema, normalizeBdPhone, type CheckoutInput, type CheckoutOutput } from '@/lib/validation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Field, FormMessage } from '@/components/ui/Field';
import { QuoteLineRow } from '@/components/cart/QuoteLineRow';
import { Totals } from '@/components/cart/Totals';

const EMPTY: CheckoutInput = { fullName: '', phone: '', altPhone: '', email: '', district: '', area: '', addressLine: '', deliveryInstructions: '', notes: '' };

export default function Checkout() {
  usePageTitle('Checkout');
  const { user } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const idemKey = useRef<string>(crypto.randomUUID());

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<CheckoutInput, unknown, CheckoutOutput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: EMPTY,
  });
  const district = watch('district');
  const phoneRaw = watch('phone');
  const phone = normalizeBdPhone(phoneRaw ?? '') ?? undefined;
  const { quote, loading, error: quoteError, reload } = useQuote(cart.lines, { district, coupon, phone });

  // pre-fill from the signed-in customer's default address
  useEffect(() => {
    if (!supabase || !user) return;
    let active = true;
    supabase
      .from('addresses')
      .select('full_name, phone, alt_phone, district, area, address_line')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        reset({
          ...EMPTY,
          email: user.email ?? '',
          ...(data ? { fullName: data.full_name ?? '', phone: data.phone ?? '', altPhone: data.alt_phone ?? '', district: data.district ?? '', area: data.area ?? '', addressLine: data.address_line ?? '' } : {}),
        });
      });
    return () => { active = false; };
  }, [user, reset]);

  // a coupon the server rejects is dropped so the customer is not left with a stale code
  useEffect(() => {
    if (quote?.couponError && coupon) setCoupon('');
  }, [quote?.couponError, coupon]);

  const header = <PageHeader title="Checkout" crumbs={[{ label: 'Cart', to: '/cart' }, { label: 'Checkout' }]} />;

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
    return (<>{header}<div className="container-page py-16 text-center"><FormMessage kind="info">The store is not connected to its database, so orders cannot be placed.</FormMessage></div></>);
  }

  const onSubmit = async (v: CheckoutOutput) => {
    if (!quote || !quote.ok) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const placed = await placeOrder({
        customer: {
          name: v.fullName, phone: v.phone, alt_phone: v.altPhone ?? '', email: v.email, district: v.district, area: v.area,
          address: v.addressLine, delivery_instructions: v.deliveryInstructions, notes: v.notes,
        },
        lines: cart.lines,
        coupon: quote.couponCode,
        expectedTotal: quote.total,
        idempotencyKey: idemKey.current,
      });
      try {
        sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(placed));
      } catch { /* confirmation also receives it through navigation state */ }
      cart.clear();
      idemKey.current = crypto.randomUUID();
      navigate('/order-confirmation', { replace: true, state: { order: placed } });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'We could not place your order.');
      reload(); // prices or stock may have changed
    } finally {
      setSubmitting(false);
    }
  };

  const applyCoupon = () => {
    const c = couponInput.trim().toUpperCase();
    if (c) setCoupon(c);
  };
  const canPlace = !!quote && quote.ok && !quote.advanceRequired && !loading && !submitting && !!district;

  return (
    <>
      {header}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_400px]">
        <div className="space-y-8">
          {!user && (
            <p className="border border-line bg-white px-4 py-3 text-sm text-muted">
              Have an account? <Link to="/login" state={{ from: '/checkout' }} className="link-underline font-medium text-primary">Sign in</Link> to use your saved address. You can also order as a guest.
            </p>
          )}

          <section aria-labelledby="ship-h" className="space-y-5">
            <h2 id="ship-h" className="text-2xl font-medium">Delivery Details</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Full name" error={errors.fullName?.message}><input className="input" autoComplete="name" {...register('fullName')} /></Field>
              <Field label="Mobile number" error={errors.phone?.message}><input className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" {...register('phone')} /></Field>
              <Field label="Alternative number (optional)" error={errors.altPhone?.message}><input className="input" type="tel" inputMode="tel" {...register('altPhone')} /></Field>
              <Field label="Email (optional)" error={errors.email?.message}><input className="input" type="email" autoComplete="email" {...register('email')} /></Field>
              <Field label="District" error={errors.district?.message}>
                <select className="input" {...register('district')}>
                  <option value="">Select district</option>
                  {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Area / Thana" error={errors.area?.message}><input className="input" {...register('area')} /></Field>
            </div>
            <Field label="Full address" error={errors.addressLine?.message}><textarea className="input min-h-[88px]" autoComplete="street-address" {...register('addressLine')} /></Field>
            <Field label="Delivery instructions (optional)" error={errors.deliveryInstructions?.message}><input className="input" {...register('deliveryInstructions')} /></Field>
            <Field label="Order note (optional)" error={errors.notes?.message}><input className="input" {...register('notes')} /></Field>
          </section>

          <section aria-labelledby="pay-h" className="space-y-2">
            <h2 id="pay-h" className="text-2xl font-medium">Payment</h2>
            <p className="border border-line bg-white px-4 py-3 text-sm">
              <span className="font-medium">Cash on Delivery.</span> Pay the total to the delivery person when your order arrives.
            </p>
          </section>
        </div>

        <aside className="h-fit space-y-5 border border-line bg-white p-6" aria-label="Order summary">
          <h2 className="text-2xl font-medium">Your Order</h2>
          {quoteError && <FormMessage kind="error">{quoteError}</FormMessage>}
          {quote && <ul>{quote.lines.map((l) => <QuoteLineRow key={l.variantId} line={l} />)}</ul>}
          {quote && !quote.ok && quote.lines.some((l) => l.status !== 'ok') && (
            <FormMessage kind="error">Some items changed. <Link to="/cart" className="underline">Review your cart</Link>.</FormMessage>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.14em]" htmlFor="coupon">Coupon code</label>
            {quote?.couponCode ? (
              <p className="flex items-center justify-between text-sm"><span>{quote.couponCode} applied</span>
                <button type="button" className="text-xs uppercase tracking-[0.12em] text-muted hover:text-red-700" onClick={() => { setCoupon(''); setCouponInput(''); }}>Remove</button></p>
            ) : (
              <div className="flex gap-2">
                <input id="coupon" className="input" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); } }} autoCapitalize="characters" />
                <Button type="button" variant="outline" className="!px-4" onClick={applyCoupon}>Apply</Button>
              </div>
            )}
            {quote?.couponError && <p role="alert" className="mt-1 text-xs text-red-700">{quote.couponError}</p>}
          </div>

          {quote && <Totals quote={quote} hasDistrict={!!district} />}
          {quote?.deliveryError && <p role="alert" className="text-xs text-red-700">{quote.deliveryError}</p>}
          {quote && quote.estimatedDaysMax !== null && !quote.deliveryError && (
            <p className="text-xs text-muted">Estimated delivery: {quote.estimatedDaysMin !== null && quote.estimatedDaysMin !== quote.estimatedDaysMax ? `${quote.estimatedDaysMin}–${quote.estimatedDaysMax}` : quote.estimatedDaysMax} days</p>
          )}
          {quote && <p className="text-sm">You pay <span className="font-medium">৳{quote.total.toLocaleString('en-BD')}</span> in cash on delivery.</p>}
          {quote?.advanceRequired && <FormMessage kind="info">An advance delivery-charge payment is required, and that step is not available yet. Please try again later.</FormMessage>}
          {submitError && <FormMessage kind="error">{submitError}</FormMessage>}
          <Button type="submit" className="w-full" disabled={!canPlace}>{submitting ? 'Placing order…' : 'Place Order'}</Button>
          {!district && <p className="text-xs text-muted">Select your district to see the delivery charge.</p>}
        </aside>
      </form>
    </>
  );
}
