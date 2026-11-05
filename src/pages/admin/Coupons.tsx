import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EMPTY_COUPON, couponSchema, deleteCoupon, fromRow, listCoupons, saveCoupon, setCouponActive, type CouponInput, type CouponOutput, type CouponRow } from '@/lib/adminCoupons';
import { formatBDT } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Field, FormMessage } from '@/components/ui/Field';
import { Card, Pill, TableWrap, PageTitle, cell, dangerBtn, smallBtn, thCls } from '@/components/admin/AdminUi';

function status(c: CouponRow): { tone: 'ok' | 'warn' | 'bad' | 'muted'; label: string } {
  const now = Date.now();
  if (!c.is_active) return { tone: 'muted', label: 'Inactive' };
  if (c.expires_at && new Date(c.expires_at).getTime() <= now) return { tone: 'bad', label: 'Expired' };
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return { tone: 'warn', label: 'Scheduled' };
  if (c.usage_limit !== null && c.used_count >= c.usage_limit) return { tone: 'bad', label: 'Used up' };
  return { tone: 'ok', label: 'Live' };
}

export default function Coupons() {
  const [rows, setRows] = useState<CouponRow[] | null>(null);
  const [editing, setEditing] = useState<CouponRow | 'new' | null>(null);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    try { setRows(await listCoupons()); } catch (e) { setRows([]); setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Could not load coupons.' }); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<void>, ok: string) => {
    try { await fn(); setMsg({ kind: 'success', text: ok }); await load(); } catch (e) { setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Something went wrong.' }); }
  };

  return (
    <div>
      <PageTitle title="Coupons" subtitle="Customers enter the code at checkout. Discounts are always calculated on the server, and a coupon can never discount delivery or push the total below zero.">
        {editing === null && <Button onClick={() => { setMsg(null); setEditing('new'); }}>Add Coupon</Button>}
      </PageTitle>
      <div className="space-y-5">
        {msg && <FormMessage kind={msg.kind}>{msg.text}</FormMessage>}
        {editing !== null && (
          <CouponForm editing={editing === 'new' ? null : editing} onCancel={() => setEditing(null)} onSaved={async () => { setEditing(null); setMsg({ kind: 'success', text: 'Coupon saved.' }); await load(); }} />
        )}
        {rows === null ? <p role="status" className="text-sm text-muted">Loading…</p> : rows.length === 0 ? (
          <Card><p className="text-sm text-muted">No coupons yet.</p></Card>
        ) : (
          <TableWrap>
            <table className="w-full min-w-[820px]">
              <thead className="border-b border-line bg-secondary"><tr>
                <th className={thCls}>Code</th><th className={thCls}>Discount</th><th className={thCls}>Min order</th><th className={thCls}>Used</th><th className={thCls}>Valid</th><th className={thCls}>Status</th><th className={thCls}><span className="sr-only">Actions</span></th>
              </tr></thead>
              <tbody className="divide-y divide-line">
                {rows.map((c) => {
                  const s = status(c);
                  return (
                    <tr key={c.id}>
                      <td className={`${cell} font-medium text-primary`}>{c.code}</td>
                      <td className={cell}>{c.type === 'percentage' ? `${Number(c.value)}%${c.max_discount !== null ? ` (max ${formatBDT(Number(c.max_discount))})` : ''}` : formatBDT(Number(c.value))}</td>
                      <td className={`${cell} text-muted`}>{Number(c.min_order_value) > 0 ? formatBDT(Number(c.min_order_value)) : '—'}</td>
                      <td className={`${cell} text-muted`}>{c.used_count}{c.usage_limit !== null ? ` / ${c.usage_limit}` : ''}</td>
                      <td className={`${cell} text-xs text-muted`}>{c.starts_at ? new Date(c.starts_at).toLocaleDateString('en-GB') : 'Now'} → {c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-GB') : 'No end'}</td>
                      <td className={cell}><Pill tone={s.tone}>{s.label}</Pill></td>
                      <td className={`${cell} whitespace-nowrap text-right`}>
                        <button className={smallBtn} onClick={() => { setMsg(null); setEditing(c); }}>Edit</button>{' '}
                        <button className={smallBtn} onClick={() => act(() => setCouponActive(c.id, !c.is_active), c.is_active ? 'Coupon deactivated.' : 'Coupon activated.')}>{c.is_active ? 'Deactivate' : 'Activate'}</button>{' '}
                        <button className={dangerBtn} disabled={c.used_count > 0} title={c.used_count > 0 ? 'Used coupons are kept for your records. Deactivate instead.' : undefined}
                          onClick={() => { if (window.confirm(`Delete coupon ${c.code}?`)) act(() => deleteCoupon(c.id), 'Coupon deleted.'); }}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        )}
      </div>
    </div>
  );
}

function CouponForm({ editing, onCancel, onSaved }: { editing: CouponRow | null; onCancel: () => void; onSaved: () => void | Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<CouponInput, unknown, CouponOutput>({
    resolver: zodResolver(couponSchema),
    defaultValues: editing ? fromRow(editing) : EMPTY_COUPON,
  });
  const type = watch('type');
  const onSubmit = async (v: CouponOutput) => {
    setError(null);
    try { await saveCoupon(editing?.id ?? null, v); await onSaved(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save the coupon.'); }
  };
  return (
    <Card title={editing ? `Edit ${editing.code}` : 'New Coupon'}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {error && <FormMessage kind="error">{error}</FormMessage>}
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Code" error={errors.code?.message}><input className="input uppercase" {...register('code')} /></Field>
          <Field label="Type" error={errors.type?.message}>
            <select className="input" {...register('type')}><option value="percentage">Percentage (%)</option><option value="fixed">Fixed amount (৳)</option></select>
          </Field>
          <Field label={type === 'percentage' ? 'Percent off' : 'Amount off (৳)'} error={errors.value?.message}><input className="input" inputMode="decimal" {...register('value')} /></Field>
          <Field label="Minimum order (৳)" error={errors.minOrderValue?.message}><input className="input" inputMode="decimal" {...register('minOrderValue')} /></Field>
          {type === 'percentage' && <Field label="Max discount (৳, optional)" error={errors.maxDiscount?.message}><input className="input" inputMode="decimal" {...register('maxDiscount')} /></Field>}
          <Field label="Total uses (optional)" error={errors.usageLimit?.message}><input className="input" inputMode="numeric" {...register('usageLimit')} /></Field>
          <Field label="Uses per customer (optional)" error={errors.perCustomerLimit?.message} hint="Counted by account or phone number."><input className="input" inputMode="numeric" {...register('perCustomerLimit')} /></Field>
          <Field label="Starts (optional)" error={errors.startsAt?.message}><input className="input" type="datetime-local" {...register('startsAt')} /></Field>
          <Field label="Expires (optional)" error={errors.expiresAt?.message}><input className="input" type="datetime-local" {...register('expiresAt')} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('isActive')} /> Active</label>
        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save Coupon'}</Button>
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}
