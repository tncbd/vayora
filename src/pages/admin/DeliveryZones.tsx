import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DISTRICTS } from '@/lib/districts';
import { EMPTY_ZONE, deleteZone, listZones, saveZone, uncoveredDistricts, zoneFromRow, zoneSchema, type Row, type ZoneInput, type ZoneOutput } from '@/lib/adminPayments';
import { formatBDT } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Field, FormMessage } from '@/components/ui/Field';
import { Card, Pill, TableWrap, PageTitle, cell, dangerBtn, smallBtn, thCls } from '@/components/admin/AdminUi';

export default function DeliveryZones() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    try { setRows(await listZones()); } catch (e) { setRows([]); setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Could not load zones.' }); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const gaps = useMemo(() => (rows ? uncoveredDistricts(rows as { districts: string[]; is_active: boolean }[]) : []), [rows]);

  return (
    <div>
      <PageTitle title="Delivery Zones" subtitle="Set the delivery charge for each group of districts. When zones overlap, the one with the higher priority wins. A zone with no districts covers every district not claimed by another zone.">
        {editing === null && <Button onClick={() => { setMsg(null); setEditing('new'); }}>Add Zone</Button>}
      </PageTitle>
      <div className="space-y-5">
        {msg && <FormMessage kind={msg.kind}>{msg.text}</FormMessage>}
        {rows && gaps.length > 0 && (
          <FormMessage kind="info">
            {gaps.length === DISTRICTS.length ? 'No active zone yet, so customers cannot check out.' : `Customers in these districts cannot check out yet: ${gaps.join(', ')}.`}
          </FormMessage>
        )}
        {editing !== null && <ZoneForm editing={editing === 'new' ? null : editing} onCancel={() => setEditing(null)} onSaved={async () => { setEditing(null); setMsg({ kind: 'success', text: 'Zone saved.' }); await load(); }} />}
        {rows === null ? <p role="status" className="text-sm text-muted">Loading…</p> : rows.length === 0 ? <Card><p className="text-sm text-muted">No zones yet.</p></Card> : (
          <TableWrap>
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-line bg-secondary"><tr>
                <th className={thCls}>Zone</th><th className={thCls}>Districts</th><th className={thCls}>Charge</th><th className={thCls}>Free over</th><th className={thCls}>Days</th><th className={thCls}>Priority</th><th className={thCls}>Status</th><th className={thCls}><span className="sr-only">Actions</span></th>
              </tr></thead>
              <tbody className="divide-y divide-line">
                {rows.map((z) => (
                  <tr key={z.id}>
                    <td className={`${cell} font-medium text-primary`}>{z.name}</td>
                    <td className={`${cell} max-w-[220px] truncate text-xs text-muted`} title={(z.districts as string[]).join(', ')}>{(z.districts as string[]).length ? (z.districts as string[]).join(', ') : 'All other districts'}</td>
                    <td className={cell}>{formatBDT(Number(z.charge))}</td>
                    <td className={`${cell} text-muted`}>{z.free_delivery_threshold === null ? '—' : formatBDT(Number(z.free_delivery_threshold))}</td>
                    <td className={`${cell} text-muted`}>{z.estimated_days_min ?? '?'}–{z.estimated_days_max ?? '?'}</td>
                    <td className={`${cell} text-muted`}>{z.priority}</td>
                    <td className={cell}>{z.is_active ? <Pill tone="ok">Active</Pill> : <Pill>Off</Pill>}</td>
                    <td className={`${cell} whitespace-nowrap text-right`}>
                      <button className={smallBtn} onClick={() => { setMsg(null); setEditing(z); }}>Edit</button>{' '}
                      <button className={dangerBtn} onClick={async () => {
                        if (!window.confirm(`Delete zone "${z.name}"?`)) return;
                        try { await deleteZone(z.id); setMsg({ kind: 'success', text: 'Zone deleted.' }); await load(); } catch (e) { setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Could not delete. Turn it off instead.' }); }
                      }}>Delete</button>
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

function ZoneForm({ editing, onCancel, onSaved }: { editing: Row | null; onCancel: () => void; onSaved: () => void | Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<ZoneInput, unknown, ZoneOutput>({
    resolver: zodResolver(zoneSchema),
    defaultValues: editing ? zoneFromRow(editing) : EMPTY_ZONE,
  });
  const selected = watch('districts') as string[];
  const toggle = (d: string) => setValue('districts', selected.includes(d) ? selected.filter((x) => x !== d) : [...selected, d], { shouldValidate: true });
  const shown = DISTRICTS.filter((d) => d.toLowerCase().includes(filter.trim().toLowerCase()));

  const onSubmit = async (v: ZoneOutput) => {
    setError(null);
    try { await saveZone(editing?.id ?? null, v); await onSaved(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not save the zone.'); }
  };
  return (
    <Card title={editing ? `Edit ${editing.name}` : 'New Zone'}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {error && <FormMessage kind="error">{error}</FormMessage>}
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Name" error={errors.name?.message}><input className="input" {...register('name')} /></Field>
          <Field label="Delivery charge (৳)" error={errors.charge?.message}><input className="input" inputMode="decimal" {...register('charge')} /></Field>
          <Field label="Free delivery over (৳, optional)" error={errors.freeThreshold?.message}><input className="input" inputMode="decimal" {...register('freeThreshold')} /></Field>
          <Field label="Delivery days: from" error={errors.daysMin?.message}><input className="input" inputMode="numeric" {...register('daysMin')} /></Field>
          <Field label="Delivery days: to" error={errors.daysMax?.message}><input className="input" inputMode="numeric" {...register('daysMax')} /></Field>
          <Field label="Priority" error={errors.priority?.message} hint="Higher number wins when zones overlap."><input className="input" inputMode="numeric" {...register('priority')} /></Field>
        </div>
        <Field label="Note (optional)" error={errors.description?.message}><input className="input" {...register('description')} /></Field>
        <fieldset>
          <legend className="mb-1.5 text-xs font-medium uppercase tracking-[0.14em]">Districts ({selected.length} selected; none = all other districts)</legend>
          <input className="input mb-2 max-w-xs" placeholder="Search districts" aria-label="Search districts" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <div className="grid max-h-56 gap-1 overflow-y-auto border border-line p-3 sm:grid-cols-3 lg:grid-cols-4">
            {shown.map((d) => (
              <label key={d} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(d)} onChange={() => toggle(d)} /> {d}</label>
            ))}
          </div>
          {errors.districts?.message && <p role="alert" className="mt-1 text-xs text-red-700">{errors.districts.message}</p>}
        </fieldset>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('isActive')} /> Active</label>
        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save Zone'}</Button>
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}
