import type { Quote } from '@/lib/checkoutApi';
import { formatBDT } from '@/lib/format';

export function Totals({ quote, hasDistrict }: { quote: Quote; hasDistrict: boolean }) {
  const row = 'flex justify-between py-1.5 text-sm';
  return (
    <dl>
      <div className={row}><dt className="text-muted">Subtotal</dt><dd>{formatBDT(quote.subtotal)}</dd></div>
      {quote.discountTotal > 0 && (
        <div className={row}><dt className="text-muted">Discount{quote.couponCode ? ` (${quote.couponCode})` : ''}</dt><dd className="text-green-800">-{formatBDT(quote.discountTotal)}</dd></div>
      )}
      <div className={row}>
        <dt className="text-muted">Delivery{quote.deliveryZoneName ? ` · ${quote.deliveryZoneName}` : ''}</dt>
        <dd>{!hasDistrict ? 'Select district' : quote.deliveryError ? '—' : quote.freeDelivery ? 'Free' : formatBDT(quote.deliveryCharge)}</dd>
      </div>
      <div className="mt-2 flex justify-between border-t border-line pt-3 text-base font-medium"><dt>Total</dt><dd>{formatBDT(quote.total)}</dd></div>
      {quote.advanceAmount > 0 && (
        <>
          <div className={row}><dt className="text-muted">Pay now (delivery charge)</dt><dd>{formatBDT(quote.advanceAmount)}</dd></div>
          <div className={row}><dt className="text-muted">Pay on delivery</dt><dd>{formatBDT(quote.codAmount)}</dd></div>
        </>
      )}
    </dl>
  );
}
