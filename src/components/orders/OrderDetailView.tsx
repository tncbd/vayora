import { useState } from 'react';
import type { OrderView } from '@/lib/ordersApi';
import { cancelMyOrder } from '@/lib/ordersApi';
import { customerCanCancel } from '@/lib/orderStatus';
import { Button } from '@/components/ui/Button';
import { FormMessage } from '@/components/ui/Field';
import { ItemsList, OrderTotals, ProgressBar, StatusBadge, StatusMessage, Timeline } from './OrderParts';

/** One order, as the customer sees it. `token` (guests) or a signed-in session lets them cancel before confirmation. */
export function OrderDetailView({ order, token, onChanged }: { order: OrderView; token?: string | null; onChanged?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canCancel = customerCanCancel(order.status) && !!onChanged;

  const cancel = async () => {
    if (!window.confirm('Cancel this order? This cannot be undone.')) return;
    setBusy(true); setError(null);
    try { await cancelMyOrder(order.id, token ?? null); onChanged?.(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not cancel the order.'); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-semibold tracking-wide">{order.orderNumber}</p>
          <p className="text-xs text-muted">Placed {new Date(order.placedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} · {order.area}, {order.district}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <ProgressBar status={order.status} />
      <StatusMessage status={order.status} />
      {(order.courier || order.trackingNumber) && (
        <p className="border border-line bg-white px-4 py-3 text-sm">
          Courier: <span className="font-medium">{order.courier ?? '—'}</span>
          {order.trackingNumber && <> · Tracking number: <span className="font-mono font-medium">{order.trackingNumber}</span></>}
        </p>
      )}
      <section aria-label="Items"><ItemsList items={order.items} /></section>
      <section aria-label="Totals" className="max-w-sm"><OrderTotals o={order} /></section>
      <section aria-label="History"><h2 className="mb-3 text-xl font-medium">Order updates</h2><Timeline history={order.history} /></section>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      {canCancel && <Button variant="outline" onClick={cancel} disabled={busy}>{busy ? 'Cancelling…' : 'Cancel order'}</Button>}
    </div>
  );
}
