import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loadShipping, saveShipping, shippingSchema, type ShippingInput, type ShippingOutput } from '@/lib/adminPayments';
import { Button } from '@/components/ui/Button';
import { Field, FormMessage } from '@/components/ui/Field';
import { Card, PageTitle } from '@/components/admin/AdminUi';

export default function ShippingSettings() {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ShippingInput, unknown, ShippingOutput>({ resolver: zodResolver(shippingSchema) });

  useEffect(() => {
    loadShipping().then((v) => { reset(v); setState('ready'); }).catch(() => { setState('error'); setMsg({ kind: 'error', text: 'Could not load the settings.' }); });
  }, [reset]);

  const onSubmit = async (v: ShippingOutput) => {
    setMsg(null);
    try { await saveShipping(v); setMsg({ kind: 'success', text: 'Settings saved.' }); } catch (e) { setMsg({ kind: 'error', text: e instanceof Error ? e.message : 'Could not save.' }); }
  };

  return (
    <div>
      <PageTitle title="Checkout & Advance Payment" subtitle="Control whether customers must pay the delivery charge in advance. The rest is always cash on delivery." />
      <div className="space-y-5">
        {msg && <FormMessage kind={msg.kind}>{msg.text}</FormMessage>}
        {state === 'loading' && <p role="status" className="text-sm text-muted">Loading…</p>}
        {state === 'ready' && (
          <Card>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-xl space-y-5">
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" className="mt-1" {...register('advanceRequired')} />
                <span><span className="font-medium">Require the delivery charge in advance</span><br />
                  <span className="text-muted">Customers pay the delivery charge by bKash, Nagad or Upay and submit the transaction ID. You check it in your own account and approve it under Payment Verification. Turn on at least one method in Payment Settings first. Orders with free delivery do not need an advance.</span></span>
              </label>
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" className="mt-1" {...register('allowGuest')} />
                <span><span className="font-medium">Allow guest checkout</span><br /><span className="text-muted">If off, customers must sign in to order.</span></span>
              </label>
              <Field label="Payment attempts per order" error={errors.resubmissionLimit?.message} hint="How many times a customer may submit payment details if one is rejected."><input className="input max-w-[140px]" inputMode="numeric" {...register('resubmissionLimit')} /></Field>
              <Field label="Hours to pay before the order is released" error={errors.windowHours?.message} hint="Unpaid advance orders can then be cancelled to free their stock (button on the Payment Verification page)."><input className="input max-w-[140px]" inputMode="numeric" {...register('windowHours')} /></Field>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save Settings'}</Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
