import { Check } from 'lucide-react';
import type { HistoryEntry, OrderItem, OrderView } from '@/lib/ordersApi';
import { PROGRESS_STEPS, STATUS_CUSTOMER_TEXT, isClosed, labelOf, progressIndex, statusTone, type OrderStatus } from '@/lib/orderStatus';
import { formatBDT } from '@/lib/format';
import { cn } from '@/lib/cn';

const tones = { ok: 'bg-green-100 text-green-800', warn: 'bg-amber-100 text-amber-900', bad: 'bg-red-100 text-red-800', muted: 'bg-secondary text-muted' } as const;

export function StatusBadge({ status }: { status: string }) {
  return <span className={cn('inline-block px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest', tones[statusTone(status)])}>{labelOf(status)}</span>;
}

/** Progress bar for the normal delivery path; cancelled/returned orders show a plain notice instead. */
export function ProgressBar({ status }: { status: string }) {
  if (isClosed(status) || progressIndex(status) < 0) return null;
  const at = progressIndex(status);
  return (
    <ol className="flex items-start" aria-label="Order progress">
      {PROGRESS_STEPS.map((s, i) => (
        <li key={s} className="relative flex flex-1 flex-col items-center text-center" aria-current={i === at ? 'step' : undefined}>
          {i > 0 && <span className={cn('absolute right-1/2 top-3 h-px w-full', i <= at ? 'bg-primary' : 'bg-line')} aria-hidden="true" />}
          <span className={cn('relative z-10 flex h-6 w-6 items-center justify-center rounded-full border text-[10px]', i <= at ? 'border-primary bg-primary text-white' : 'border-line bg-white text-muted')}>
            {i < at ? <Check size={12} /> : i + 1}
          </span>
          <span className={cn('mt-2 hidden text-[10px] uppercase tracking-wider sm:block', i <= at ? 'text-primary' : 'text-muted')}>{labelOf(s)}</span>
        </li>
      ))}
    </ol>
  );
}

export function Timeline({ history }: { history: HistoryEntry[] }) {
  if (!history.length) return null;
  return (
    <ol className="space-y-4 border-l border-line pl-5">
      {[...history].reverse().map((h, i) => (
        <li key={`${h.at}-${i}`} className="relative">
          <span className="absolute -left-[26px] top-1.5 h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
          <p className="text-sm font-medium text-primary">{labelOf(h.status)}</p>
          {h.note && <p className="text-sm text-muted">{h.note}</p>}
          <p className="text-xs text-muted">{new Date(h.at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
        </li>
      ))}
    </ol>
  );
}

export function ItemsList({ items }: { items: OrderItem[] }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {items.map((i, n) => (
        <li key={n} className="flex items-center justify-between gap-4 py-3 text-sm">
          <span className="min-w-0">
            <span className="block truncate font-medium text-primary">{i.name}</span>
            <span className="text-xs text-muted">{[i.size, i.color].filter(Boolean).join(' · ')}{i.size || i.color ? ' · ' : ''}Qty {i.quantity}</span>
          </span>
          <span className="whitespace-nowrap">{formatBDT(i.lineTotal)}</span>
        </li>
      ))}
    </ul>
  );
}

export function OrderTotals({ o }: { o: Pick<OrderView, 'subtotal' | 'discountTotal' | 'deliveryCharge' | 'total' | 'advanceAmount' | 'codAmount'> }) {
  const row = 'flex justify-between py-1 text-sm';
  return (
    <dl>
      <div className={row}><dt className="text-muted">Subtotal</dt><dd>{formatBDT(o.subtotal)}</dd></div>
      {o.discountTotal > 0 && <div className={row}><dt className="text-muted">Discount</dt><dd>-{formatBDT(o.discountTotal)}</dd></div>}
      <div className={row}><dt className="text-muted">Delivery</dt><dd>{o.deliveryCharge > 0 ? formatBDT(o.deliveryCharge) : 'Free'}</dd></div>
      <div className="mt-1 flex justify-between border-t border-line pt-2 text-sm font-medium"><dt>Total</dt><dd>{formatBDT(o.total)}</dd></div>
      {o.advanceAmount > 0 && <div className={row}><dt className="text-muted">Paid in advance</dt><dd>{formatBDT(o.advanceAmount)}</dd></div>}
      <div className={row}><dt className="text-muted">Pay on delivery</dt><dd>{formatBDT(o.codAmount)}</dd></div>
    </dl>
  );
}

export function StatusMessage({ status }: { status: string }) {
  return <p className="text-sm text-muted">{STATUS_CUSTOMER_TEXT[status as OrderStatus] ?? ''}</p>;
}
