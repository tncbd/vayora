import { useCallback, useEffect, useState } from 'react';
import {
  adminCreateVariants, adminDeleteVariant, adminListVariants, adminUpdateVariant, type AdminVariant,
} from '@/lib/adminApi';
import { generateVariants, parseColorList, parseList, stockStatus } from '@/lib/adminCatalog';
import { Button } from '@/components/ui/Button';
import { FormMessage } from '@/components/ui/Field';
import { Card, Pill, TableWrap, cell, dangerBtn, smallBtn, thCls } from './AdminUi';

type Msg = { kind: 'success' | 'error'; text: string } | null;

/** Variants (size x colour) with their own SKU, optional price, active flag and stock. */
export function VariantManager({ productId, productSku }: { productId: string; productSku: string }) {
  const [variants, setVariants] = useState<AdminVariant[] | null>(null);
  const [msg, setMsg] = useState<Msg>(null);

  const load = useCallback(async () => {
    try {
      setVariants(await adminListVariants(productId));
    } catch (e) {
      setVariants([]);
      setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Could not load variants.' });
    }
  }, [productId]);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card title="Variants & stock">
      <p className="mb-4 text-sm text-muted">
        Each size and colour combination is a variant with its own SKU and stock. Leave a variant’s price empty to use the product’s selling price.
      </p>
      {msg && <div className="mb-4"><FormMessage kind={msg.kind}>{msg.text}</FormMessage></div>}

      <Generator productId={productId} productSku={productSku} existing={variants ?? []} onMessage={setMsg} onCreated={load} />

      {variants === null ? (
        <p role="status" className="mt-5 text-sm text-muted">Loading…</p>
      ) : variants.length === 0 ? (
        <p className="mt-5 border border-line p-4 text-sm text-muted">No variants yet. Customers cannot buy a product until it has at least one variant with stock.</p>
      ) : (
        <div className="mt-5">
          <TableWrap>
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-line bg-secondary">
                <tr>
                  {['SKU', 'Size', 'Colour', 'Hex', 'Price (৳)', 'Qty', 'Reserved', 'Low at', 'Active', 'Status', ''].map((h) => (
                    <th key={h || 'x'} className={thCls}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {variants.map((v) => (
                  <VariantRow key={v.id} v={v} onMessage={setMsg} onChanged={load} />
                ))}
              </tbody>
            </table>
          </TableWrap>
        </div>
      )}
    </Card>
  );
}

function Generator({ productId, productSku, existing, onMessage, onCreated }: { productId: string; productSku: string; existing: AdminVariant[]; onMessage: (m: Msg) => void; onCreated: () => Promise<void> }) {
  const [sizes, setSizes] = useState('');
  const [colors, setColors] = useState('');
  const [qty, setQty] = useState('0');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);

  const preview = generateVariants(productSku || 'SKU', parseList(sizes), parseColorList(colors), existing);

  const create = async () => {
    const quantity = Number(qty);
    const override = price.trim() === '' ? null : Number(price);
    if (!Number.isInteger(quantity) || quantity < 0) return onMessage({ kind: 'error', text: 'Starting quantity must be a whole number, 0 or more.' });
    if (override !== null && (!Number.isFinite(override) || override < 0)) return onMessage({ kind: 'error', text: 'Variant price must be 0 or more.' });
    if (preview.length === 0) return onMessage({ kind: 'error', text: 'Enter at least one new size or colour.' });
    if (!productSku.trim()) return onMessage({ kind: 'error', text: 'Save the product with a SKU first.' });
    setBusy(true);
    try {
      await adminCreateVariants(productId, preview.map((p) => ({ sku: p.sku, size: p.size, color: p.color, color_hex: p.colorHex, price: override, is_active: true })), quantity);
      onMessage({ kind: 'success', text: `${preview.length} variant${preview.length === 1 ? '' : 's'} created.` });
      setSizes('');
      setColors('');
      await onCreated();
    } catch (e) {
      onMessage({ kind: 'error', text: e instanceof Error ? e.message : 'Could not create variants.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 border border-line bg-secondary p-4 sm:grid-cols-2">
      <label className="block text-xs uppercase tracking-[0.12em] text-muted">Sizes
        <input className="input mt-1" placeholder="M, L, XL, XXL" value={sizes} onChange={(e) => setSizes(e.target.value)} />
      </label>
      <label className="block text-xs uppercase tracking-[0.12em] text-muted">Colours
        <input className="input mt-1" placeholder="Black:#171717, White:#F4F1EA, Navy" value={colors} onChange={(e) => setColors(e.target.value)} />
      </label>
      <label className="block text-xs uppercase tracking-[0.12em] text-muted">Starting quantity (each)
        <input type="number" min={0} className="input mt-1" value={qty} onChange={(e) => setQty(e.target.value)} />
      </label>
      <label className="block text-xs uppercase tracking-[0.12em] text-muted">Variant price (optional)
        <input type="number" min={0} step="0.01" className="input mt-1" placeholder="Same as product" value={price} onChange={(e) => setPrice(e.target.value)} />
      </label>
      <div className="flex items-center gap-4 sm:col-span-2">
        <Button type="button" onClick={create} disabled={busy || preview.length === 0}>{busy ? 'Creating…' : `Create ${preview.length || ''} variant${preview.length === 1 ? '' : 's'}`}</Button>
        <span className="text-xs text-muted">Existing size/colour combinations are skipped. Add “:#hex” after a colour name for its swatch.</span>
      </div>
    </div>
  );
}

function VariantRow({ v, onMessage, onChanged }: { v: AdminVariant; onMessage: (m: Msg) => void; onChanged: () => Promise<void> }) {
  const [f, setF] = useState({
    sku: v.sku, size: v.size ?? '', color: v.color ?? '', hex: v.color_hex ?? '', price: v.price === null ? '' : String(v.price),
    qty: String(v.quantity), thr: String(v.low_stock_threshold), active: v.is_active,
  });
  const [busy, setBusy] = useState(false);
  const dirty =
    f.sku !== v.sku || f.size !== (v.size ?? '') || f.color !== (v.color ?? '') || f.hex !== (v.color_hex ?? '') ||
    f.price !== (v.price === null ? '' : String(v.price)) || f.qty !== String(v.quantity) || f.thr !== String(v.low_stock_threshold) || f.active !== v.is_active;
  const status = stockStatus(v.quantity, v.reserved, v.low_stock_threshold);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const box = 'input !py-1.5 text-xs';

  const save = async () => {
    const qty = Number(f.qty);
    const thr = Number(f.thr);
    const price = f.price.trim() === '' ? null : Number(f.price);
    if (!f.sku.trim()) return onMessage({ kind: 'error', text: 'SKU is required.' });
    if (!f.size.trim() && !f.color.trim()) return onMessage({ kind: 'error', text: 'A variant needs a size or a colour.' });
    if (f.hex && !/^#[0-9a-f]{6}$/i.test(f.hex)) return onMessage({ kind: 'error', text: 'Colour hex must look like #171717.' });
    if (price !== null && (!Number.isFinite(price) || price < 0)) return onMessage({ kind: 'error', text: 'Variant price must be 0 or more.' });
    setBusy(true);
    try {
      await adminUpdateVariant(
        v.id,
        { sku: f.sku.trim().toUpperCase(), size: f.size.trim() || null, color: f.color.trim() || null, color_hex: f.hex.trim() || null, price, is_active: f.active },
        { quantity: qty, low_stock_threshold: thr },
      );
      onMessage({ kind: 'success', text: `Saved ${f.sku.trim().toUpperCase()}.` });
      await onChanged();
    } catch (e) {
      onMessage({ kind: 'error', text: e instanceof Error ? e.message : 'Could not save the variant.' });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete variant ${v.sku}? Past orders keep their own copy of the details.`)) return;
    setBusy(true);
    try {
      await adminDeleteVariant(v.id, v.sku);
      onMessage({ kind: 'success', text: 'Variant deleted.' });
      await onChanged();
    } catch (e) {
      onMessage({ kind: 'error', text: e instanceof Error ? e.message : 'Could not delete the variant.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr>
      <td className={cell}><input className={`${box} w-44`} value={f.sku} onChange={set('sku')} aria-label="Variant SKU" /></td>
      <td className={cell}><input className={`${box} w-20`} value={f.size} onChange={set('size')} aria-label="Size" /></td>
      <td className={cell}><input className={`${box} w-24`} value={f.color} onChange={set('color')} aria-label="Colour" /></td>
      <td className={cell}><input className={`${box} w-24`} value={f.hex} onChange={set('hex')} placeholder="#000000" aria-label="Colour hex" /></td>
      <td className={cell}><input type="number" min={0} step="0.01" className={`${box} w-24`} value={f.price} onChange={set('price')} placeholder="—" aria-label="Variant price" /></td>
      <td className={cell}><input type="number" min={0} step={1} className={`${box} w-20`} value={f.qty} onChange={set('qty')} aria-label="Quantity" /></td>
      <td className={`${cell} text-muted`}>{v.reserved}</td>
      <td className={cell}><input type="number" min={0} step={1} className={`${box} w-16`} value={f.thr} onChange={set('thr')} aria-label="Low-stock level" /></td>
      <td className={cell}><input type="checkbox" checked={f.active} onChange={set('active')} aria-label="Active" /></td>
      <td className={cell}>{status === 'out' ? <Pill tone="bad">Out</Pill> : status === 'low' ? <Pill tone="warn">Low</Pill> : <Pill tone="ok">OK</Pill>}</td>
      <td className={`${cell} whitespace-nowrap text-right`}>
        <button className={smallBtn} disabled={!dirty || busy} onClick={save}>{busy ? '…' : 'Save'}</button>{' '}
        <button className={dangerBtn} disabled={busy} onClick={remove}>Delete</button>
      </td>
    </tr>
  );
}
