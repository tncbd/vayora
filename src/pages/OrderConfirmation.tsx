import { useLocation } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { LAST_ORDER_KEY, type PlacedOrder } from '@/lib/checkoutApi';
import { formatBDT } from '@/lib/format';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PageHeader } from '@/components/ui/PageHeader';
import { ButtonLink } from '@/components/ui/Button';
import { PaymentPanel } from '@/components/cart/PaymentPanel';

function readOrder(state: unknown): PlacedOrder | null {
  const fromState = (state as { order?: PlacedOrder } | null)?.order;
  if (fromState?.orderNumber) return fromState;
  try {
    const t = typeof window === 'undefined' ? null : window.sessionStorage.getItem(LAST_ORDER_KEY);
    const o = t ? (JSON.parse(t) as PlacedOrder) : null;
    return o?.orderNumber ? o : null;
  } catch {
    return null;
  }
}

export default function OrderConfirmation() {
  usePageTitle('Order Confirmation');
  const { state } = useLocation();
  const order = readOrder(state);

  if (!order) {
    return (
      <>
        <PageHeader title="Order Confirmation" crumbs={[{ label: 'Order Confirmation' }]} />
        <div className="container-page py-16 text-center sm:py-24">
          <p className="mx-auto max-w-md text-sm text-muted">There is no recent order to show on this device. If you have just ordered, we will contact you on your mobile number.</p>
          <ButtonLink to="/shop" className="mt-6">Continue Shopping</ButtonLink>
        </div>
      </>
    );
  }
  return (
    <div className="container-page py-14 text-center sm:py-20">
      <CheckCircle2 className="mx-auto text-green-700" size={44} aria-hidden="true" />
      <h1 className="mt-5 text-4xl font-medium sm:text-5xl">Thank you for your order</h1>
      <p className="mt-3 text-sm text-muted">
        {order.advanceAmount > 0 ? 'Your order is reserved. Complete the advance payment below to confirm it.' : 'Your order has been received and is waiting for review. We will contact you on your mobile number to confirm.'}
      </p>
      <p className="mt-8 text-xs uppercase tracking-[0.2em] text-muted">Order number</p>
      <p className="mt-1 font-display text-3xl font-semibold tracking-wide">{order.orderNumber}</p>
      <dl className="mx-auto mt-8 max-w-sm border border-line bg-white p-5 text-left text-sm">
        <div className="flex justify-between py-1"><dt className="text-muted">Subtotal</dt><dd>{formatBDT(order.subtotal)}</dd></div>
        {order.discountTotal > 0 && <div className="flex justify-between py-1"><dt className="text-muted">Discount</dt><dd>-{formatBDT(order.discountTotal)}</dd></div>}
        <div className="flex justify-between py-1"><dt className="text-muted">Delivery</dt><dd>{order.deliveryCharge > 0 ? formatBDT(order.deliveryCharge) : 'Free'}</dd></div>
        {order.advanceAmount > 0 && <div className="flex justify-between py-1"><dt className="text-muted">Advance (delivery charge)</dt><dd>{formatBDT(order.advanceAmount)}</dd></div>}
        <div className="mt-2 flex justify-between border-t border-line pt-3 font-medium"><dt>Pay on delivery</dt><dd>{formatBDT(order.codAmount)}</dd></div>
      </dl>
      {order.advanceAmount > 0 && order.orderId && order.trackingToken && <PaymentPanel orderId={order.orderId} token={order.trackingToken} />}
      <p className="mx-auto mt-6 max-w-md text-xs text-muted">Please keep your order number. Online order tracking is coming in a later update.</p>
      <ButtonLink to="/shop" className="mt-8">Continue Shopping</ButtonLink>
    </div>
  );
}
