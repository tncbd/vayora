import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getOrder, notifyCustomer, saveOrderMeta, setOrderStatus, statusChangeSchema, type Row, type StatusChangeInput, type StatusChangeOutput } from '@/lib/adminOrders';
import { labelOf, nextStatuses } from '@/lib/orderStatus';
import { METHOD_LABEL } from '@/lib/paymentApi';
import { formatBDT } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Field, FormMessage } from '@/components/ui/Field';
import { OrderTotals, StatusBadge } from '@/components/orders/OrderParts';
import { Card, Pill, smallBtn } from '@/components/admin/AdminUi';

export default function AdminOrderDetail() {
  const { id = '' } = useParams();
  const [order, setOrder] = useState<Row | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const load = async () => {
    try { setOrder(await getOrder(id)); setError(null); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load the order.'); setOrder(null); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  if (order === undefined) return <p role="status" className="text-sm text-muted">Loading…</p>;
  if (!order) return <div className="space-y-3">{error && <FormMessage kind="error">{error}</FormMessage>}<p className="text-sm text-muted">Order not found.</p><Link to="/admin/orders" className={smallBtn}>Back to orders</Link></div>;

  const items = (order.order_items ?? []) as Row[];
  const history = [...((order.order_status_history ?? []) as Row[])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const payments = (order.payments ?? []) as Row[];
  const done = async (text: string) => { setMsg({ kind: 'success', text }); await load(); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/admin/orders" className="text-xs uppercase tracking-[0.18em] text-primary link-underline">← All orders</Link>
        <Button variant="outline" onClick={() => window.print()}>Print invoice</Button>
      </div>
      {msg && <div className="print:hidden"><FormMessage kind={msg.kind}>{msg.text}</FormMessage></div>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-wide">{order.order_number}</h1>
          <p className="text-xs text-muted">Placed {new Date(order.placed_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}{order.user_id ? ' · registered customer' : ' · guest'}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Customer & delivery">
          <p className="font-medium">{order.customer_name}</p>
          <p className="text-sm"><a className="underline print:no-underline" href={`tel:${order.phone}`}>{order.phone}</a>{order.alt_phone && <> · {order.alt_phone}</>}</p>
          {order.email && <p className="text-sm text-muted">{order.email}</p>}
          <p className="mt-3 text-sm">{order.address}, {order.area}, {order.district}</p>
          {order.delivery_instructions && <p className="mt-2 text-sm"><span className="text-muted">Delivery note:</span> {order.delivery_instructions}</p>}
          {order.notes && <p className="mt-1 text-sm"><span className="text-muted">Customer note:</span> {order.notes}</p>}
          {(order.courier_company || order.tracking_number) && <p className="mt-3 text-sm"><span className="text-muted">Courier:</span> {order.courier_company ?? '—'} {order.tracking_number && <span className="font-mono">· {order.tracking_number}</span>}</p>}
        </Card>
        <Card title="Payment">
          <OrderTotals o={{ subtotal: Number(order.subtotal), discountTotal: Number(order.discount_total), deliveryCharge: Number(order.delivery_charge), total: Number(order.total), advanceAmount: Number(order.advance_amount), codAmount: Number(order.cod_amount) }} />
          {order.coupon_code && <p className="mt-2 text-xs text-muted">Coupon: {order.coupon_code}</p>}
          {payments.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-line pt-3 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>{METHOD_LABEL[p.method as keyof typeof METHOD_LABEL] ?? p.method} · {formatBDT(Number(p.amount))} · <span className="font-mono text-xs">{p.transaction_id}</span></span>
                  <Pill tone={p.status === 'verified' ? 'ok' : p.status === 'rejected' ? 'bad' : 'warn'}>{p.status}</Pill>
                </li>
              ))}
              <li className="print:hidden"><Link to="/admin/payment-verification" className="text-xs underline">Open Payment Verification</Link></li>
            </ul>
          )}
        </Card>
      </div>

      <Card title="Items">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.14em] text-muted"><th className="py-2">Product</th><th>SKU</th><th>Size / colour</th><th className="text-right">Qty</th><th className="text-right">Price</th><th className="text-right">Total</th></tr></thead>
          <tbody className="divide-y divide-line">
            {items.map((i) => (
              <tr key={i.id}><td className="py-2">{i.product_name}</td><td className="font-mono text-xs">{i.sku}</td><td>{[i.size, i.color].filter(Boolean).join(' · ') || '—'}</td><td className="text-right">{i.quantity}</td><td className="text-right">{formatBDT(Number(i.unit_price))}</td><td className="text-right">{formatBDT(Number(i.line_total))}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2 print:hidden">
        <StatusForm key={order.status} order={order} onError={(t) => setMsg({ kind: 'error', text: t })} onDone={done} />
        <MetaForm order={order} onError={(t) => setMsg({ kind: 'error', text: t })} onDone={done} />
      </div>

      <Card title="History" className="print:hidden">
        <ol className="space-y-3 text-sm">
          {[...history].reverse().map((h) => (
            <li key={h.id}>
              <span className="font-medium">{labelOf(h.to_status)}</span>{' '}
              {!h.is_public && <Pill>Staff only</Pill>}
              {h.note && <span className="text-muted"> · {h.note}</span>}
              <span className="block text-xs text-muted">{new Date(h.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

function StatusForm({ order, onError, onDone }: { order: Row; onError: (t: string) => void; onDone: (t: string) => Promise<void> }) {
  const options = nextStatuses(order.status);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<StatusChangeInput, unknown, StatusChangeOutput>({
    resolver: zodResolver(statusChangeSchema),
    defaultValues: { status: '', note: '', isPublic: true, courier: order.courier_company ?? '', trackingNumber: order.tracking_number ?? '' },
  });
  const next = watch('status');
  const onSubmit = async (v: StatusChangeOutput) => {
    if (v.status === 'cancelled' && !window.confirm('Cancel this order? Its reserved stock will be released.')) return;
    try { await setOrderStatus(order.id, v); const emailed = await notifyCustomer(order.id); await onDone(`Status changed to ${labelOf(v.status)}.${emailed ? ' The customer was emailed.' : ''}`); } catch (e) { onError(e instanceof Error ? e.message : 'Could not change the status.'); }
  };
  if (options.length === 0) return <Card title="Change status"><p className="text-sm text-muted">This order is {labelOf(order.status).toLowerCase()}; it cannot be changed further.</p></Card>;
  return (
    <Card title="Change status">
      {order.status === 'pending_payment_verification' && <p className="mb-3 text-xs text-muted">This order is confirmed automatically when you verify its payment. You can cancel it here if the customer never pays.</p>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Field label="Move to" error={errors.status?.message}>
          <select className="input" {...register('status')}><option value="">Choose…</option>{options.map((s) => <option key={s} value={s}>{labelOf(s)}</option>)}</select>
        </Field>
        {next === 'shipped' && (<>
          <Field label="Courier company" error={errors.courier?.message}><input className="input" placeholder="Pathao, Steadfast, RedX…" {...register('courier')} /></Field>
          <Field label="Tracking number (optional)" error={errors.trackingNumber?.message}><input className="input" {...register('trackingNumber')} /></Field>
        </>)}
        <Field label={next === 'cancelled' ? 'Reason (required)' : 'Note (optional)'} error={errors.note?.message}><input className="input" {...register('note')} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('isPublic')} /> Show this note to the customer</label>
        <Button type="submit" disabled={isSubmitting || !next}>{isSubmitting ? 'Saving…' : 'Update status'}</Button>
      </form>
    </Card>
  );
}

function MetaForm({ order, onError, onDone }: { order: Row; onError: (t: string) => void; onDone: (t: string) => Promise<void> }) {
  const [courier, setCourier] = useState<string>(order.courier_company ?? '');
  const [tracking, setTracking] = useState<string>(order.tracking_number ?? '');
  const [notes, setNotes] = useState<string>(order.internal_notes ?? '');
  const [busy, setBusy] = useState(false);
  return (
    <Card title="Courier & internal notes">
      <form className="space-y-4" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true);
        try { await saveOrderMeta(order.id, { courier, trackingNumber: tracking, internalNotes: notes }); await onDone('Saved.'); } catch (err) { onError(err instanceof Error ? err.message : 'Could not save.'); } finally { setBusy(false); }
      }}>
        <Field label="Courier company"><input className="input" value={courier} onChange={(e) => setCourier(e.target.value)} maxLength={80} /></Field>
        <Field label="Tracking number"><input className="input" value={tracking} onChange={(e) => setTracking(e.target.value)} maxLength={80} /></Field>
        <Field label="Internal notes (never shown to the customer)"><textarea className="input min-h-[88px]" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} /></Field>
        <Button type="submit" variant="outline" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button>
      </form>
    </Card>
  );
}
