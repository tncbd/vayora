import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { listMethods, methodSchema, saveMethod, type MethodInput, type MethodOutput, type Row } from '@/lib/adminPayments';
import { Button } from '@/components/ui/Button';
import { Field, FormMessage } from '@/components/ui/Field';
import { Card, PageTitle } from '@/components/admin/AdminUi';

export default function PaymentSettings() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => { listMethods().then(setRows).catch(() => { setRows([]); setErr('Could not load payment methods.'); }); }, []);
  useEffect(load, [load]);
  return (
    <div>
      <PageTitle title="Payment Settings" subtitle="Your own bKash, Nagad and Upay numbers that customers send the advance delivery charge to. Customers see only methods that are switched on and have a number. Payments are never confirmed automatically: you check each one yourself under Payment Verification." />
      <div className="space-y-5">
        {err && <FormMessage kind="error">{err}</FormMessage>}
        {rows === null && <p role="status" className="text-sm text-muted">Loading…</p>}
        {rows?.map((m) => <MethodCard key={m.code} row={m} />)}
      </div>
    </div>
  );
}

function MethodCard({ row }: { row: Row }) {
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<MethodInput, unknown, MethodOutput>({
    resolver: zodResolver(methodSchema),
    defaultValues: { merchantNumber: row.merchant_number ?? '', instructions: row.instructions ?? '', isEnabled: row.is_enabled },
  });
  const onSubmit = async (v: MethodOutput) => {
    setMsg(null);
    try { await saveMethod(row.code, v); setMsg({ kind: 'success', text: 'Saved.' }); } catch (e) { setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Could not save.' }); }
  };
  return (
    <Card title={row.display_name}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-xl space-y-4">
        {msg && <FormMessage kind={msg.kind}>{msg.text}</FormMessage>}
        <Field label={`${row.display_name} number (customers send money here)`} error={errors.merchantNumber?.message}><input className="input" inputMode="tel" placeholder="01XXXXXXXXX" {...register('merchantNumber')} /></Field>
        <Field label="Instructions shown to customers (optional)" error={errors.instructions?.message} hint='For example: "Use Send Money, not Payment."'><textarea className="input min-h-[72px]" {...register('instructions')} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('isEnabled')} /> Enabled</label>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save'}</Button>
      </form>
    </Card>
  );
}
