import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { DISTRICTS } from '@/lib/districts';
import { addressSchema, type AddressInput, type AddressOutput } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Field, FormMessage } from '@/components/ui/Field';

interface AddressRow {
  id: string;
  label: string | null;
  full_name: string;
  phone: string;
  alt_phone: string | null;
  district: string;
  area: string;
  address_line: string;
  is_default: boolean;
}

const EMPTY: AddressInput = { label: '', fullName: '', phone: '', altPhone: '', district: '', area: '', addressLine: '', isDefault: false };

export default function Addresses() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AddressRow[] | null>(null);
  const [editing, setEditing] = useState<AddressRow | 'new' | null>(null);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !user) return;
    const { data, error } = await supabase
      .from('addresses')
      .select('id, label, full_name, phone, alt_phone, district, area, address_line, is_default')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) {
      setMessage({ kind: 'error', text: 'Could not load your addresses.' });
      setRows([]);
    } else {
      setRows((data ?? []) as AddressRow[]);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const clearOtherDefaults = async (exceptId: string) => {
    if (!supabase || !user) return;
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id).neq('id', exceptId);
  };

  const remove = async (row: AddressRow) => {
    if (!supabase || !user || !window.confirm('Delete this address?')) return;
    const { error } = await supabase.from('addresses').delete().eq('id', row.id).eq('user_id', user.id);
    setMessage(error ? { kind: 'error', text: 'Could not delete the address.' } : { kind: 'success', text: 'Address deleted.' });
    await load();
  };

  const makeDefault = async (row: AddressRow) => {
    if (!supabase || !user) return;
    const { error } = await supabase.from('addresses').update({ is_default: true }).eq('id', row.id).eq('user_id', user.id);
    if (error) setMessage({ kind: 'error', text: 'Could not update the default address.' });
    else await clearOtherDefaults(row.id);
    await load();
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-medium">Addresses</h2>
        {editing === null && <Button onClick={() => { setMessage(null); setEditing('new'); }}>Add Address</Button>}
      </div>

      <div className="mt-5 space-y-4">
        {message && <FormMessage kind={message.kind}>{message.text}</FormMessage>}

        {editing !== null && (
          <AddressForm
            initial={editing === 'new' ? EMPTY : {
              label: editing.label ?? '', fullName: editing.full_name, phone: editing.phone, altPhone: editing.alt_phone ?? '',
              district: editing.district, area: editing.area, addressLine: editing.address_line, isDefault: editing.is_default,
            }}
            onCancel={() => setEditing(null)}
            onSave={async (v) => {
              if (!supabase || !user) return 'Not signed in.';
              const payload = {
                label: v.label || null, full_name: v.fullName, phone: v.phone, alt_phone: v.altPhone,
                district: v.district, area: v.area, address_line: v.addressLine,
                is_default: v.isDefault || (rows?.length ?? 0) === 0 && editing === 'new',
              };
              let id: string | undefined;
              if (editing === 'new') {
                const { data, error } = await supabase.from('addresses').insert({ ...payload, user_id: user.id }).select('id').single();
                if (error) return 'Could not save the address. Please try again.';
                id = data.id;
              } else {
                const { error } = await supabase.from('addresses').update(payload).eq('id', editing.id).eq('user_id', user.id);
                if (error) return 'Could not save the address. Please try again.';
                id = editing.id;
              }
              if (payload.is_default && id) await clearOtherDefaults(id);
              setEditing(null);
              setMessage({ kind: 'success', text: 'Address saved.' });
              await load();
              return null;
            }}
          />
        )}

        {rows === null ? (
          <p role="status" className="text-sm text-muted">Loading…</p>
        ) : rows.length === 0 && editing === null ? (
          <p className="border border-line p-6 text-sm text-muted">You have no saved addresses yet.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {rows.map((a) => (
              <li key={a.id} className="border border-line p-5 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-primary">{a.label || a.full_name}</p>
                  {a.is_default && <span className="bg-accent/20 px-2 py-0.5 text-[10px] uppercase tracking-widest text-accent-dark">Default</span>}
                </div>
                <p className="mt-2 text-ink">{a.full_name} · {a.phone}</p>
                <p className="text-muted">{a.address_line}, {a.area}, {a.district}</p>
                <div className="mt-4 flex flex-wrap gap-4 text-xs uppercase tracking-[0.14em]">
                  <button className="link-underline" onClick={() => { setMessage(null); setEditing(a); }}>Edit</button>
                  {!a.is_default && <button className="link-underline" onClick={() => makeDefault(a)}>Make default</button>}
                  <button className="link-underline text-red-700" onClick={() => remove(a)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AddressForm({ initial, onSave, onCancel }: { initial: AddressInput; onSave: (v: AddressOutput) => Promise<string | null>; onCancel: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddressInput, unknown, AddressOutput>({ resolver: zodResolver(addressSchema), defaultValues: initial });

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setError(null);
        const msg = await onSave(values);
        if (msg) setError(msg);
      })}
      className="grid gap-5 border border-line bg-secondary p-5 sm:grid-cols-2"
    >
      {error && <div className="sm:col-span-2"><FormMessage kind="error">{error}</FormMessage></div>}
      <Field label="Label (optional)" error={errors.label?.message} hint="e.g. Home, Office"><input className="input" {...register('label')} /></Field>
      <Field label="Recipient name" error={errors.fullName?.message}><input autoComplete="name" className="input" {...register('fullName')} /></Field>
      <Field label="Mobile number" error={errors.phone?.message}><input type="tel" inputMode="tel" className="input" {...register('phone')} /></Field>
      <Field label="Alternative mobile (optional)" error={errors.altPhone?.message}><input type="tel" inputMode="tel" className="input" {...register('altPhone')} /></Field>
      <Field label="District" error={errors.district?.message}>
        <select className="input" {...register('district')}>
          <option value="">Select district</option>
          {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </Field>
      <Field label="Area" error={errors.area?.message}><input className="input" {...register('area')} /></Field>
      <div className="sm:col-span-2">
        <Field label="Full delivery address" error={errors.addressLine?.message}><textarea rows={3} className="input" {...register('addressLine')} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" {...register('isDefault')} /> Use as my default address
      </label>
      <div className="flex gap-3 sm:col-span-2">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save Address'}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
