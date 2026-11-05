import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminListInventory, adminUpdateStock, type InventoryRow } from '@/lib/adminApi';
import { stockStatus } from '@/lib/adminCatalog';
import { FormMessage } from '@/components/ui/Field';
import { Pill, TableWrap, PageTitle, cell, smallBtn, thCls } from '@/components/admin/AdminUi';

type Filter = 'all' | 'low' | 'out';

export default function Inventory() {
  const [rows, setRows] = useState<InventoryRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await adminListInventory());
    } catch (e) {
      setRows([]);
      setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Could not load inventory.' });
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      const s = stockStatus(r.quantity, r.reserved, r.low_stock_threshold);
      if (filter === 'low' && s !== 'low') return false;
      if (filter === 'out' && s !== 'out') return false;
      return !t || r.product_name.toLowerCase().includes(t) || r.sku.toLowerCase().includes(t);
    });
  }, [rows, filter, q]);

  const counts = useMemo(() => {
    const c = { low: 0, out: 0 };
    for (const r of rows ?? []) {
      const s = stockStatus(r.quantity, r.reserved, r.low_stock_threshold);
      if (s === 'low') c.low++;
      if (s === 'out') c.out++;
    }
    return c;
  }, [rows]);

  return (
    <div>
      <PageTitle title="Inventory" subtitle="Stock for every size and colour. “Reserved” units are held for open orders and cannot be taken below by editing the quantity.">
        <button className={smallBtn} onClick={() => setFilter('all')}>All</button>
        <button className={smallBtn} onClick={() => setFilter('low')}>Low stock ({counts.low})</button>
        <button className={smallBtn} onClick={() => setFilter('out')}>Out of stock ({counts.out})</button>
      </PageTitle>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input className="input w-64" placeholder="Search product or SKU" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search inventory" />
        {filter !== 'all' && <span className="text-xs uppercase tracking-widest text-accent-dark">Showing: {filter === 'low' ? 'low stock' : 'out of stock'}</span>}
      </div>
      {msg && <div className="mb-4"><FormMessage kind={msg.kind}>{msg.text}</FormMessage></div>}

      {rows === null ? (
        <p role="status" className="text-sm text-muted">Loading…</p>
      ) : shown.length === 0 ? (
        <div className="border border-line bg-white p-8 text-center text-sm text-muted">
          {rows.length === 0 ? 'No variants yet. Add variants on a product page to track stock.' : 'Nothing matches this filter.'}
        </div>
      ) : (
        <TableWrap>
          <table className="w-full min-w-[820px]">
            <thead className="border-b border-line bg-secondary">
              <tr>
                <th className={thCls}>Product</th>
                <th className={thCls}>Variant</th>
                <th className={thCls}>SKU</th>
                <th className={thCls}>Quantity</th>
                <th className={thCls}>Reserved</th>
                <th className={thCls}>Low-stock at</th>
                <th className={thCls}>Status</th>
                <th className={thCls}><span className="sr-only">Save</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shown.map((r) => (
                <StockRow key={r.variant_id} row={r} onMessage={setMsg} onSaved={load} />
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}
    </div>
  );
}

function StockRow({ row, onMessage, onSaved }: { row: InventoryRow; onMessage: (m: { kind: 'success' | 'error'; text: string }) => void; onSaved: () => Promise<void> }) {
  const [qty, setQty] = useState(String(row.quantity));
  const [thr, setThr] = useState(String(row.low_stock_threshold));
  const [saving, setSaving] = useState(false);
  const dirty = qty !== String(row.quantity) || thr !== String(row.low_stock_threshold);
  const status = stockStatus(row.quantity, row.reserved, row.low_stock_threshold);

  const save = async () => {
    setSaving(true);
    try {
      await adminUpdateStock(row.variant_id, row.sku, Number(qty), Number(thr));
      onMessage({ kind: 'success', text: `Stock updated for ${row.sku}.` });
      await onSaved();
    } catch (e) {
      onMessage({ kind: 'error', text: e instanceof Error ? e.message : 'Could not update stock.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr>
      <td className={cell}>
        <Link to={`/admin/products/${row.product_id}`} className="font-medium text-primary hover:text-accent-dark">{row.product_name}</Link>
      </td>
      <td className={`${cell} text-muted`}>{[row.size, row.color].filter(Boolean).join(' / ') || '—'}{!row.is_active && <span className="ml-2"><Pill>Inactive</Pill></span>}</td>
      <td className={`${cell} text-muted`}>{row.sku}</td>
      <td className={cell}><input type="number" min={0} step={1} className="input w-24 !py-1.5" value={qty} onChange={(e) => setQty(e.target.value)} aria-label={`Quantity for ${row.sku}`} /></td>
      <td className={`${cell} text-muted`}>{row.reserved}</td>
      <td className={cell}><input type="number" min={0} step={1} className="input w-20 !py-1.5" value={thr} onChange={(e) => setThr(e.target.value)} aria-label={`Low-stock level for ${row.sku}`} /></td>
      <td className={cell}>{status === 'out' ? <Pill tone="bad">Out</Pill> : status === 'low' ? <Pill tone="warn">Low</Pill> : <Pill tone="ok">In stock</Pill>}</td>
      <td className={`${cell} text-right`}><button className={smallBtn} disabled={!dirty || saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button></td>
    </tr>
  );
}
