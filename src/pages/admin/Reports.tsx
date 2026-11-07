import { useEffect, useState } from 'react';
import { Card, PageTitle, TableWrap, cell, smallBtn, thCls } from '@/components/admin/AdminUi';
import { FormMessage } from '@/components/ui/Field';
import { formatBDT } from '@/lib/format';
import { PRESETS, avgOrderValue, dailyCsv, districtsCsv, loadReport, presetRange, productsCsv, validRange, type Preset, type Report } from '@/lib/adminReports';

const STATUS_LABEL: Record<string, string> = {
  pending_payment_verification: 'Waiting for payment', pending_order_review: 'To review', confirmed: 'Confirmed', processing: 'Processing', shipped: 'Shipped',
  out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled', returned: 'Returned', refunded: 'Refunded',
};

function download(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

const Stat = ({ label, value, note }: { label: string; value: string | number; note?: string }) => (
  <div className="border border-line bg-white p-4">
    <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
    <p className="mt-2 text-2xl font-medium text-primary">{value}</p>
    {note && <p className="mt-1 text-xs text-muted">{note}</p>}
  </div>
);

export default function Reports() {
  const [range, setRange] = useState(() => presetRange('30d'));
  const [preset, setPreset] = useState<Preset | null>('30d');
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bad = validRange(range.from, range.to);
    if (bad) { setError(bad); return; }
    let active = true;
    setLoading(true); setError(null);
    loadReport(range.from, range.to)
      .then((r) => active && setData(r))
      .catch((e) => active && setError(e instanceof Error ? e.message : 'Could not load the report.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [range]);

  const maxSales = data ? Math.max(1, ...data.daily.map((d) => d.sales)) : 1;
  const s = data?.summary;
  return (
    <div>
      <PageTitle title="Reports" subtitle="Sales and orders for any period (Bangladesh time). Sales do not include cancelled, returned or refunded orders." />
      <div className="mb-6 flex flex-wrap items-end gap-3">
        {PRESETS.map((p) => (
          <button key={p.key} className={`${smallBtn} ${preset === p.key ? '!border-primary bg-primary !text-white' : ''}`} onClick={() => { setPreset(p.key); setRange(presetRange(p.key)); }}>{p.label}</button>
        ))}
        <label className="text-xs text-muted">From<input type="date" className="input mt-1 block" value={range.from} onChange={(e) => { setPreset(null); setRange({ ...range, from: e.target.value }); }} /></label>
        <label className="text-xs text-muted">To<input type="date" className="input mt-1 block" value={range.to} onChange={(e) => { setPreset(null); setRange({ ...range, to: e.target.value }); }} /></label>
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      {loading && !error && <p role="status" className="text-sm text-muted">Loading…</p>}
      {data && s && !error && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Sales" value={formatBDT(s.sales)} note={`${s.sales_orders} orders`} />
            <Stat label="Average order" value={formatBDT(avgOrderValue(data))} />
            <Stat label="Delivered sales" value={formatBDT(s.delivered_sales)} />
            <Stat label="Discounts given" value={formatBDT(s.discounts)} />
            <Stat label="All orders placed" value={s.orders} />
            <Stat label="Cancelled" value={s.cancelled} />
            <Stat label="Returned / refunded" value={s.returned} />
            <Stat label="Advance payments verified" value={formatBDT(data.advance_verified)} note="Delivery charges paid in advance" />
          </div>

          <Card title="Sales per day">
            <div className="flex h-40 items-end gap-px overflow-x-auto" role="img" aria-label="Sales per day">
              {data.daily.map((d) => (
                <div key={d.date} className="flex min-w-[6px] flex-1 flex-col justify-end" title={`${d.date}: ${formatBDT(d.sales)}, ${d.orders} orders`}>
                  <div className="w-full bg-accent" style={{ height: `${Math.max(1, (d.sales / maxSales) * 100)}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-3"><button className={smallBtn} onClick={() => download(`daily-sales-${range.from}-to-${range.to}.csv`, dailyCsv(data))}>Export daily (CSV)</button></div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Orders by status">
              <table className="w-full text-sm"><tbody className="divide-y divide-line">
                {data.by_status.length === 0 && <tr><td className={cell}>No orders in this period.</td></tr>}
                {data.by_status.map((b) => <tr key={b.status}><td className={cell}>{STATUS_LABEL[b.status] ?? b.status}</td><td className={`${cell} text-right`}>{b.orders}</td></tr>)}
              </tbody></table>
            </Card>
            <Card title="Coupons used">
              <table className="w-full text-sm"><tbody className="divide-y divide-line">
                {data.coupons.length === 0 && <tr><td className={cell}>No coupons used.</td></tr>}
                {data.coupons.map((c) => <tr key={c.code}><td className={cell}>{c.code}</td><td className={cell}>{c.uses} uses</td><td className={`${cell} text-right`}>{formatBDT(c.discount)}</td></tr>)}
              </tbody></table>
            </Card>
          </div>

          <section>
            <div className="mb-2 flex items-center justify-between"><h2 className="text-xl font-medium">Best-selling products</h2><button className={smallBtn} disabled={!data.products.length} onClick={() => download(`products-${range.from}-to-${range.to}.csv`, productsCsv(data))}>Export (CSV)</button></div>
            <TableWrap><table className="w-full"><thead><tr><th className={thCls}>Product</th><th className={thCls}>Units</th><th className={thCls}>Sales</th></tr></thead>
              <tbody className="divide-y divide-line">
                {data.products.length === 0 && <tr><td className={cell} colSpan={3}>No sales in this period.</td></tr>}
                {data.products.map((p) => <tr key={p.name}><td className={cell}>{p.name}</td><td className={cell}>{p.units}</td><td className={cell}>{formatBDT(p.sales)}</td></tr>)}
              </tbody></table></TableWrap>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between"><h2 className="text-xl font-medium">Sales by district</h2><button className={smallBtn} disabled={!data.districts.length} onClick={() => download(`districts-${range.from}-to-${range.to}.csv`, districtsCsv(data))}>Export (CSV)</button></div>
            <TableWrap><table className="w-full"><thead><tr><th className={thCls}>District</th><th className={thCls}>Orders</th><th className={thCls}>Sales</th></tr></thead>
              <tbody className="divide-y divide-line">
                {data.districts.length === 0 && <tr><td className={cell} colSpan={3}>No sales in this period.</td></tr>}
                {data.districts.map((d) => <tr key={d.district}><td className={cell}>{d.district}</td><td className={cell}>{d.orders}</td><td className={cell}>{formatBDT(d.sales)}</td></tr>)}
              </tbody></table></TableWrap>
          </section>
        </div>
      )}
    </div>
  );
}
