import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  adminBulkDelete, adminBulkUpdate, adminDeleteProduct, adminDuplicateProduct, adminExportProducts, adminListCategories, adminListProducts,
  PRODUCT_STATUSES, type AdminCategory, type AdminProductListRow, type ProductStatus,
} from '@/lib/adminApi';
import { toCsv } from '@/lib/adminCatalog';
import { flattenCategories } from '@/lib/categoryTree';
import { formatBDT } from '@/lib/format';
import { totalPages } from '@/lib/catalogParams';
import { Button, ButtonLink } from '@/components/ui/Button';
import { FormMessage } from '@/components/ui/Field';
import { Pagination } from '@/components/product/Pagination';
import { Pill, TableWrap, PageTitle, cell, dangerBtn, smallBtn, thCls } from '@/components/admin/AdminUi';

const PAGE_SIZE = 20;
const statusTone = { active: 'ok', draft: 'warn', inactive: 'muted', archived: 'muted' } as const;

export default function ProductList() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [applied, setApplied] = useState({ q: '', status: '' as ProductStatus | '', categoryId: '' });
  const [status, setStatus] = useState<ProductStatus | ''>('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ rows: AdminProductListRow[]; total: number } | null>(null);
  const [cats, setCats] = useState<AdminCategory[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    adminListCategories().then(setCats).catch(() => undefined);
  }, []);
  const catName = useMemo(() => new Map(cats.map((c) => [c.id, c.name])), [cats]);

  const load = useCallback(async () => {
    try {
      setData(await adminListProducts({ ...applied, page, pageSize: PAGE_SIZE }));
    } catch (e) {
      setData({ rows: [], total: 0 });
      setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Could not load products.' });
    }
  }, [applied, page]);
  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ kind: 'success', text: ok });
      setSelected(new Set());
      await load();
    } catch (e) {
      setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Something went wrong.' });
    } finally {
      setBusy(false);
    }
  };

  const rows = data?.rows ?? [];
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const ids = [...selected];

  const exportCsv = () =>
    run(async () => {
      const { headers, rows: out } = await adminExportProducts(applied, catName);
      const blob = new Blob(['﻿' + toCsv(headers, out)], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vayora-products-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'Export downloaded.');

  return (
    <div>
      <PageTitle title="Products" subtitle="Add, edit, duplicate and organise your catalogue. Only products with status Active appear on the storefront.">
        <Button variant="outline" onClick={exportCsv} disabled={busy}>Export CSV</Button>
        <ButtonLink to="/admin/products/new">Add Product</ButtonLink>
      </PageTitle>

      <form
        className="mb-4 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSelected(new Set());
          setApplied({ q, status, categoryId });
        }}
      >
        <label className="block text-xs uppercase tracking-[0.12em] text-muted">Search
          <input className="input mt-1 w-56" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or SKU" />
        </label>
        <label className="block text-xs uppercase tracking-[0.12em] text-muted">Status
          <select className="input mt-1" value={status} onChange={(e) => setStatus(e.target.value as ProductStatus | '')}>
            <option value="">All</option>
            {PRODUCT_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
        </label>
        <label className="block text-xs uppercase tracking-[0.12em] text-muted">Category
          <select className="input mt-1" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All</option>
            {flattenCategories(cats).map(({ row, depth }) => <option key={row.id} value={row.id}>{`${'— '.repeat(depth)}${row.name}`}</option>)}
          </select>
        </label>
        <Button type="submit" variant="outline">Apply</Button>
      </form>

      {msg && <div className="mb-4"><FormMessage kind={msg.kind}>{msg.text}</FormMessage></div>}

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 border border-line bg-white px-4 py-3 text-sm">
          <strong>{selected.size} selected</strong>
          <button className={smallBtn} disabled={busy} onClick={() => run(() => adminBulkUpdate(ids, { status: 'active' }), 'Products activated.')}>Activate</button>
          <button className={smallBtn} disabled={busy} onClick={() => run(() => adminBulkUpdate(ids, { status: 'inactive' }), 'Products deactivated.')}>Deactivate</button>
          <button className={smallBtn} disabled={busy} onClick={() => run(() => adminBulkUpdate(ids, { is_featured: true }), 'Marked as featured.')}>Feature</button>
          <button className={smallBtn} disabled={busy} onClick={() => run(() => adminBulkUpdate(ids, { is_featured: false }), 'Removed from featured.')}>Unfeature</button>
          <button
            className={dangerBtn}
            disabled={busy}
            onClick={() => window.confirm(`Permanently delete ${selected.size} product(s), with their variants and images records? This cannot be undone.`) && run(() => adminBulkDelete(ids), 'Products deleted.')}
          >
            Delete
          </button>
        </div>
      )}

      {data === null ? (
        <p role="status" className="text-sm text-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="border border-line bg-white p-8 text-center text-sm text-muted">
          No products found. <Link to="/admin/products/new" className="link-underline font-medium text-primary">Add your first product</Link>.
        </div>
      ) : (
        <TableWrap>
          <table className="w-full min-w-[820px]">
            <thead className="border-b border-line bg-secondary">
              <tr>
                <th className={thCls}>
                  <input type="checkbox" aria-label="Select all on this page" checked={allOnPage} onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} />
                </th>
                <th className={thCls}>Product</th>
                <th className={thCls}>SKU</th>
                <th className={thCls}>Category</th>
                <th className={thCls}>Price</th>
                <th className={thCls}>Status</th>
                <th className={thCls}><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={cell}>
                    <input
                      type="checkbox"
                      aria-label={`Select ${r.name}`}
                      checked={selected.has(r.id)}
                      onChange={(e) => {
                        const next = new Set(selected);
                        if (e.target.checked) next.add(r.id); else next.delete(r.id);
                        setSelected(next);
                      }}
                    />
                  </td>
                  <td className={cell}>
                    <Link to={`/admin/products/${r.id}`} className="flex items-center gap-3 hover:text-accent-dark">
                      <span className="h-12 w-10 shrink-0 overflow-hidden bg-secondary">
                        {r.thumb && <img src={r.thumb} alt="" className="h-full w-full object-cover" loading="lazy" />}
                      </span>
                      <span className="font-medium text-primary">{r.name}{r.is_featured && <span className="ml-2 text-[10px] uppercase tracking-widest text-accent-dark">Featured</span>}</span>
                    </Link>
                  </td>
                  <td className={`${cell} text-muted`}>{r.sku}</td>
                  <td className={`${cell} text-muted`}>{r.category_id ? catName.get(r.category_id) ?? '—' : '—'}</td>
                  <td className={cell}>
                    {formatBDT(r.selling_price)}
                    {r.selling_price < r.regular_price && <span className="ml-2 text-xs text-muted line-through">{formatBDT(r.regular_price)}</span>}
                  </td>
                  <td className={cell}><Pill tone={statusTone[r.status]}>{r.status}</Pill></td>
                  <td className={`${cell} whitespace-nowrap text-right`}>
                    <Link to={`/admin/products/${r.id}`} className={smallBtn}>Edit</Link>{' '}
                    <button
                      className={smallBtn}
                      disabled={busy}
                      onClick={() => run(async () => { const id = await adminDuplicateProduct(r.id); navigate(`/admin/products/${id}`); }, 'Duplicated as a draft.')}
                    >
                      Duplicate
                    </button>{' '}
                    <button
                      className={dangerBtn}
                      disabled={busy}
                      onClick={() => window.confirm(`Delete "${r.name}"? This cannot be undone.`) && run(() => adminDeleteProduct(r.id, r.name), 'Product deleted.')}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}

      <Pagination page={page} pages={totalPages(data?.total ?? 0, PAGE_SIZE)} onChange={(p) => { setPage(p); setSelected(new Set()); }} />
      {data && data.total > 0 && <p className="mt-4 text-center text-xs text-muted">{data.total} product{data.total === 1 ? '' : 's'}</p>}
    </div>
  );
}
