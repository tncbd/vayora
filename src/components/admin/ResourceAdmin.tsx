import { useCallback, useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import { deleteRow, listRows, saveRow, toPayload, toValues, uploadPublicImage, validate, type FieldDef, type Row, type Values } from '@/lib/adminResource';
import { Button } from '@/components/ui/Button';
import { Field, FormMessage } from '@/components/ui/Field';
import { Card, Pill, TableWrap, PageTitle, cell, dangerBtn, smallBtn, thCls } from '@/components/admin/AdminUi';

export interface ResourceConfig {
  table: string;
  title: string;
  subtitle: string;
  singular: string;
  fields: FieldDef[];
  orderBy: string[];
  defaults?: Row;
  canCreate?: boolean;
  canDelete?: boolean;
  bucket?: 'banners' | 'site-assets';
  /** boolean column shown as an Active/Hidden pill */
  activeField?: string;
  /** dynamic select options (e.g. parent menu items) */
  dynamicOptions?: (rows: Row[], editing: Row | null) => Record<string, { value: string; label: string }[]>;
  /** extra rules checked after the field validation */
  extraCheck?: (v: Values, editing: Row | null, rows: Row[]) => Record<string, string>;
  intro?: ReactNode;
  confirmDelete?: (row: Row) => string;
}

function show(f: FieldDef, row: Row): ReactNode {
  const v = row[f.name];
  if (v === null || v === undefined || v === '') return '—';
  if (f.type === 'bool') return v ? 'Yes' : 'No';
  if (f.type === 'datetime') return new Date(v).toLocaleDateString('en-GB');
  if (f.type === 'image') return <img src={v} alt="" className="h-10 w-10 border border-line object-cover" loading="lazy" />;
  const s = String(v);
  return s.length > 60 ? `${s.slice(0, 57)}…` : s;
}

export function ResourceAdmin({ cfg }: { cfg: ResourceConfig }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    try { setRows(await listRows(cfg.table, cfg.orderBy)); } catch (e) { setRows([]); setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Could not load.' }); }
  }, [cfg.table, cfg.orderBy]);
  useEffect(() => { load(); }, [load]);

  const listFields = cfg.fields.filter((f) => f.list);
  const canCreate = cfg.canCreate !== false;
  const canDelete = cfg.canDelete !== false;

  const toggle = async (r: Row) => {
    if (!cfg.activeField) return;
    try { await saveRow(cfg.table, r.id, { [cfg.activeField]: !r[cfg.activeField] }); await load(); } catch (e) { setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Could not update.' }); }
  };
  const remove = async (r: Row) => {
    if (!window.confirm(cfg.confirmDelete?.(r) ?? `Delete this ${cfg.singular}?`)) return;
    try { await deleteRow(cfg.table, r.id); setMsg({ kind: 'success', text: `${cfg.singular} deleted.` }); await load(); } catch (e) { setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Could not delete.' }); }
  };

  return (
    <div>
      <PageTitle title={cfg.title} subtitle={cfg.subtitle}>
        {canCreate && editing === null && <Button onClick={() => { setMsg(null); setEditing('new'); }}>Add {cfg.singular}</Button>}
      </PageTitle>
      <div className="space-y-5">
        {cfg.intro}
        {msg && <FormMessage kind={msg.kind}>{msg.text}</FormMessage>}
        {editing !== null && rows && (
          <ResourceForm cfg={cfg} rows={rows} editing={editing === 'new' ? null : editing} onCancel={() => setEditing(null)}
            onSaved={async () => { setEditing(null); setMsg({ kind: 'success', text: `${cfg.singular} saved.` }); await load(); }} />
        )}
        {rows === null ? <p role="status" className="text-sm text-muted">Loading…</p> : rows.length === 0 ? (
          <Card><p className="text-sm text-muted">Nothing here yet.</p></Card>
        ) : (
          <TableWrap>
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-line bg-secondary"><tr>
                {listFields.map((f) => <th key={f.name} className={thCls}>{f.label}</th>)}
                {cfg.activeField && <th className={thCls}>Status</th>}
                <th className={thCls}><span className="sr-only">Actions</span></th>
              </tr></thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.id}>
                    {listFields.map((f, i) => <td key={f.name} className={`${cell} ${i === 0 ? 'font-medium text-primary' : 'text-muted'}`}>{show(f, r)}</td>)}
                    {cfg.activeField && <td className={cell}>{r[cfg.activeField] ? <Pill tone="ok">Live</Pill> : <Pill>Hidden</Pill>}</td>}
                    <td className={`${cell} whitespace-nowrap text-right`}>
                      <button className={smallBtn} onClick={() => { setMsg(null); setEditing(r); }}>Edit</button>{' '}
                      {cfg.activeField && <><button className={smallBtn} onClick={() => toggle(r)}>{r[cfg.activeField] ? 'Hide' : 'Show'}</button>{' '}</>}
                      {canDelete && <button className={dangerBtn} onClick={() => remove(r)}>Delete</button>}
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

function ResourceForm({ cfg, rows, editing, onCancel, onSaved }: { cfg: ResourceConfig; rows: Row[]; editing: Row | null; onCancel: () => void; onSaved: () => void | Promise<void> }) {
  const [v, setV] = useState<Values>(() => toValues(cfg.fields, editing, cfg.defaults));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const dyn = cfg.dynamicOptions?.(rows, editing) ?? {};
  const set = (name: string, val: string | boolean) => setV((p) => ({ ...p, [name]: val }));

  const onFile = async (f: FieldDef, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !cfg.bucket) return;
    setUploading(f.name); setError(null);
    try { set(f.name, await uploadPublicImage(cfg.bucket, file)); } catch (err) { setError(err instanceof Error ? err.message : 'Upload failed.'); } finally { setUploading(null); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = { ...validate(cfg.fields.map((f) => (dyn[f.name] ? { ...f, options: dyn[f.name] } : f)), v), ...(cfg.extraCheck?.(v, editing, rows) ?? {}) };
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true); setError(null);
    try { await saveRow(cfg.table, editing?.id ?? null, toPayload(cfg.fields, v, { creating: !editing })); await onSaved(); } catch (err) { setError(err instanceof Error ? err.message : 'Could not save.'); } finally { setSaving(false); }
  };

  return (
    <Card title={editing ? `Edit ${cfg.singular}` : `New ${cfg.singular}`}>
      <form onSubmit={submit} noValidate className="space-y-5">
        {error && <FormMessage kind="error">{error}</FormMessage>}
        <div className="grid gap-5 sm:grid-cols-2">
          {cfg.fields.map((f) => {
            const id = `f-${f.name}`;
            const val = v[f.name];
            const wide = f.type === 'textarea' || f.type === 'image';
            const disabled = !!editing && f.fixed;
            let control: ReactNode;
            if (f.type === 'bool') control = <label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" checked={!!val} onChange={(e) => set(f.name, e.target.checked)} /> {f.label}</label>;
            else if (f.type === 'textarea') control = <textarea id={id} className="input" style={{ minHeight: `${(f.rows ?? 4) * 1.6}rem` }} value={String(val)} onChange={(e) => set(f.name, e.target.value)} />;
            else if (f.type === 'select') {
              const opts = dyn[f.name] ?? f.options ?? [];
              control = <select id={id} className="input" value={String(val)} onChange={(e) => set(f.name, e.target.value)}>{!f.required && <option value="">None</option>}{opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
            } else if (f.type === 'image') {
              control = (
                <div className="space-y-2">
                  {val && <img src={String(val)} alt="" className="h-24 border border-line object-cover" />}
                  <div className="flex flex-wrap items-center gap-3">
                    <input id={id} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => onFile(f, e)} className="text-xs" disabled={uploading === f.name} />
                    {val && <button type="button" className={smallBtn} onClick={() => set(f.name, '')}>Remove image</button>}
                    {uploading === f.name && <span role="status" className="text-xs text-muted">Uploading…</span>}
                  </div>
                </div>
              );
            } else control = <input id={id} className="input" type={f.type === 'datetime' ? 'datetime-local' : 'text'} inputMode={f.type === 'number' ? 'numeric' : undefined} value={String(val)} disabled={disabled} onChange={(e) => set(f.name, e.target.value)} />;
            return f.type === 'bool'
              ? <div key={f.name}>{control}</div>
              : <div key={f.name} className={wide ? 'sm:col-span-2' : undefined}><Field label={f.label} error={errors[f.name]} hint={f.hint}>{control}</Field></div>;
          })}
        </div>
        <div className="flex gap-3">
          <Button type="submit" disabled={saving || uploading !== null}>{saving ? 'Saving…' : 'Save'}</Button>
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}
