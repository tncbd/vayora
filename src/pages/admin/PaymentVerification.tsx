import { useCallback, useEffect, useState } from 'react';
import { expireUnpaid, listPayments, proofUrl, verifyPayment, type PaymentFilter, type Row } from '@/lib/adminPayments';
import { METHOD_LABEL } from '@/lib/paymentApi';
import { formatBDT } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { FormMessage } from '@/components/ui/Field';
import { Card, Pill, TableWrap, PageTitle, cell, dangerBtn, smallBtn, thCls } from '@/components/admin/AdminUi';

const FILTERS: { key: PaymentFilter; label: string }[] = [
  { key: 'submitted', label: 'Waiting for you' }, { key: 'verified', label: 'Verified' }, { key: 'rejected', label: 'Rejected' }, { key: 'all', label: 'All' },
];

export default function PaymentVerification() {
  const [filter, setFilter] = useState<PaymentFilter>('submitted');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRows(null);
    try { setRows(await listPayments(filter)); } catch (e) { setRows([]); setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Could not load payments.' }); }
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const act = async (id: string, fn: () => Promise<void>, ok: string) => {
    setBusy(id); setMsg(null);
    try { await fn(); setMsg({ kind: 'success', text: ok }); await load(); } catch (e) { setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Something went wrong.' }); } finally { setBusy(null); }
  };
  const approve = (p: Row) => {
    if (window.confirm(`Confirm you have received ${formatBDT(Number(p.amount))} from ${p.sender_number} (Transaction ID ${p.transaction_id}) in your ${METHOD_LABEL[p.method as keyof typeof METHOD_LABEL] ?? p.method} account?`)) act(p.id, () => verifyPayment(p.id, true), 'Payment verified. The order is now confirmed.');
  };
  const reject = (p: Row) => {
    const reason = window.prompt('Why is this payment rejected? The customer will see this reason.');
    if (reason && reason.trim()) act(p.id, () => verifyPayment(p.id, false, reason), 'Payment rejected.');
  };
  const openProof = async (path: string) => {
    try { window.open(await proofUrl(path), '_blank', 'noopener'); } catch (e) { setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Could not open the screenshot.' }); }
  };

  return (
    <div>
      <PageTitle title="Payment Verification" subtitle="Check each payment in your own bKash / Nagad / Upay account: the amount, the sender number and the Transaction ID must all match. Nothing is verified automatically.">
        <Button variant="outline" onClick={() => {
          if (window.confirm('Cancel orders whose advance payment did not arrive in time and release their stock?')) act('expire', async () => { const n = await expireUnpaid(); setMsg({ kind: 'success', text: n ? `${n} unpaid order(s) cancelled and stock released.` : 'No unpaid orders to cancel.' }); }, '');
        }}>Cancel expired unpaid orders</Button>
      </PageTitle>
      <div className="space-y-5">
        <div role="tablist" aria-label="Payment filter" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button key={f.key} role="tab" aria-selected={filter === f.key} onClick={() => setFilter(f.key)}
              className={`border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] ${filter === f.key ? 'border-primary bg-primary text-white' : 'border-line bg-white text-primary hover:border-primary'}`}>{f.label}</button>
          ))}
        </div>
        {msg && msg.text && <FormMessage kind={msg.kind}>{msg.text}</FormMessage>}
        {rows === null ? <p role="status" className="text-sm text-muted">Loading…</p> : rows.length === 0 ? (
          <Card><p className="text-sm text-muted">{filter === 'submitted' ? 'No payments are waiting for verification.' : 'Nothing here.'}</p></Card>
        ) : (
          <TableWrap>
            <table className="w-full min-w-[860px]">
              <thead className="border-b border-line bg-secondary"><tr>
                <th className={thCls}>Order</th><th className={thCls}>Customer</th><th className={thCls}>Method</th><th className={thCls}>Amount</th><th className={thCls}>Sender / Transaction ID</th><th className={thCls}>Submitted</th><th className={thCls}>Status</th><th className={thCls}><span className="sr-only">Actions</span></th>
              </tr></thead>
              <tbody className="divide-y divide-line">
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td className={`${cell} font-medium text-primary`}>{p.orders?.order_number}</td>
                    <td className={cell}>{p.orders?.customer_name}<br /><span className="text-xs text-muted">{p.orders?.phone}</span></td>
                    <td className={cell}>{METHOD_LABEL[p.method as keyof typeof METHOD_LABEL] ?? p.method}</td>
                    <td className={cell}>{formatBDT(Number(p.amount))}</td>
                    <td className={cell}>{p.sender_number}<br /><span className="font-mono text-xs">{p.transaction_id}</span>{p.attempt > 1 && <span className="ml-1 text-xs text-muted">(attempt {p.attempt})</span>}</td>
                    <td className={`${cell} text-xs text-muted`}>{p.submitted_at ? new Date(p.submitted_at).toLocaleString('en-GB') : '—'}</td>
                    <td className={cell}>
                      {p.status === 'verified' ? <Pill tone="ok">Verified</Pill> : p.status === 'rejected' ? <Pill tone="bad">Rejected</Pill> : <Pill tone="warn">Waiting</Pill>}
                      {p.rejection_reason && <p className="mt-1 max-w-[180px] text-xs text-muted">{p.rejection_reason}</p>}
                    </td>
                    <td className={`${cell} whitespace-nowrap text-right`}>
                      {p.proof_path && <button className={smallBtn} onClick={() => openProof(p.proof_path)}>Screenshot</button>}{' '}
                      {p.status === 'submitted' && (<>
                        <button className={smallBtn} disabled={busy === p.id} onClick={() => approve(p)}>Verify</button>{' '}
                        <button className={dangerBtn} disabled={busy === p.id} onClick={() => reject(p)}>Reject</button>
                      </>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </div>
    </div>
  );
}
