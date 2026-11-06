import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { exportOrders, listOrders, type OrderFilters, type Row } from '@/lib/adminOrders';
import { ORDER_STATUSES, labelOf, type OrderStatus } from '@/lib/orderStatus';
import { toCsv } from '@/lib/adminCatalog';
import { totalPages } from '@/lib/catalogParams';
import { formatBDT } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { FormMessage } from '@/components/ui/Field';
import { Pagination } from '@/components/product/Pagination';
import { StatusBadge } from '@/components/orders/OrderParts';
import { Card, TableWrap, PageTitle, cell, smallBtn, thCls } from '@/components/admin/AdminUi';

const PAGE_SIZE = 20;

export default function Orders() {
  const [status, setStatus] = useState<OrderFilters['status']>('open');
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ rows: Row[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setData(null); setError(null);
    try { setData(await listOrders({ status, q, page, pageSize: PAGE_SIZE })); } catch (e) { setData({ rows: [], total: 0 }); setError(e instanceof Error ? e.message : 'Could not load orders.'); }
  }, [status, q, page]);
  useEffect(() => { load(); }, [load]);

  const exportCsv = async () => {
    try {
      const rows = await exportOrders({ status, q });
      const csv = toCsv(['Order', 'Placed', 'Customer', 'Phone', 'District', 'Status', 'Total', 'Advance', 'Cash on delivery'],
        rows.map((o) => [o.order_number, o.placed_at, o.customer_name, o.phone, o.district, labelOf(o.status), o.total, o.advance_amount, o.cod_amount]));
      const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url; a.download = `vayora-orders-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not export.'); }
  };

  return (
    <div>
      <PageTitle title="Orders" subtitle="Search by order number, phone or name. Open the order to change its status, add courier details or print an invoice.">
        <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
      </PageTitle>
      <div className="space-y-5">
        <form className="flex flex-wrap gap-3" onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(qInput); }}>
          <input className="input max-w-xs" placeholder="Order no, phone or name" aria-label="Search orders" value={qInput} onChange={(e) => setQInput(e.target.value)} />
          <select className="input max-w-[220px]" aria-label="Status" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value as OrderFilters['status']); }}>
            <option value="open">Open orders</option>
            <option value="all">All orders</option>
            {ORDER_STATUSES.map((s: OrderStatus) => <option key={s} value={s}>{labelOf(s)}</option>)}
          </select>
          <Button type="submit" variant="outline">Search</Button>
        </form>
        {error && <FormMessage kind="error">{error}</FormMessage>}
        {data === null ? <p role="status" className="text-sm text-muted">Loading…</p> : data.rows.length === 0 ? (
          <Card><p className="text-sm text-muted">No orders match.</p></Card>
        ) : (
          <TableWrap>
            <table className="w-full min-w-[780px]">
              <thead className="border-b border-line bg-secondary"><tr>
                <th className={thCls}>Order</th><th className={thCls}>Placed</th><th className={thCls}>Customer</th><th className={thCls}>District</th><th className={thCls}>Total</th><th className={thCls}>Status</th><th className={thCls}><span className="sr-only">Open</span></th>
              </tr></thead>
              <tbody className="divide-y divide-line">
                {data.rows.map((o) => (
                  <tr key={o.id}>
                    <td className={`${cell} font-medium text-primary`}>{o.order_number}</td>
                    <td className={`${cell} text-xs text-muted`}>{new Date(o.placed_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td className={cell}>{o.customer_name}<br /><span className="text-xs text-muted">{o.phone}</span></td>
                    <td className={`${cell} text-muted`}>{o.district}</td>
                    <td className={cell}>{formatBDT(Number(o.total))}</td>
                    <td className={cell}><StatusBadge status={o.status} /></td>
                    <td className={`${cell} text-right`}><Link className={smallBtn} to={`/admin/orders/${o.id}`}>Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
        <p className="text-xs text-muted">{data ? `${data.total} order${data.total === 1 ? '' : 's'}` : ''}</p>
        <Pagination page={page} pages={totalPages(data?.total ?? 0, PAGE_SIZE)} onChange={setPage} />
      </div>
    </div>
  );
}
