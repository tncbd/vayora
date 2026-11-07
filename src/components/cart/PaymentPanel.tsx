import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { METHOD_LABEL, getPaymentInfo, paymentSchema, paymentStage, submitPayment, type PaymentInput, type PaymentOutput } from '@/lib/paymentApi';
import { formatBDT } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Field, FormMessage } from '@/components/ui/Field';

/** Advance delivery-charge payment: customer pays by bKash/Nagad/Upay Send Money, then submits the details for manual verification. */
export function PaymentPanel({ orderId, token }: { orderId: string; token: string | null }) {
  const { user } = useAuth();
  const { data: info, loading, error, reload } = useAsync(() => getPaymentInfo(orderId, token), [orderId, token]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [proof, setProof] = useState<File | null>(null);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<PaymentInput, unknown, PaymentOutput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { method: undefined, senderNumber: '', transactionId: '' },
  });
  const method = watch('method');

  if (loading && !info) return <p className="mt-8 text-sm text-muted" role="status">Loading payment details…</p>;
  if (error || !info) return <div className="mt-8"><FormMessage kind="error">{error ?? 'Could not load payment details.'}</FormMessage><Button variant="outline" className="mt-3" onClick={reload}>Try again</Button></div>;

  const stage = paymentStage(info);
  const selected = info.methods.find((m) => m.code === method);
  const expiry = info.expiresAt ? new Date(info.expiresAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : null;

  const onSubmit = async (v: PaymentOutput) => {
    setSubmitError(null);
    try {
      await submitPayment(orderId, token, v, proof, user?.id ?? null);
      reload();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not submit your payment.');
    }
  };

  return (
    <section className="mx-auto mt-10 max-w-xl border border-line bg-white p-6 text-left" aria-label="Advance payment">
      <h2 className="text-2xl font-medium">Advance Delivery Charge</h2>
      {stage === 'verified' && <div className="mt-4"><FormMessage kind="success">Payment verified. Your order is confirmed.</FormMessage></div>}
      {stage === 'submitted' && <div className="mt-4"><FormMessage kind="info">We have your payment details and will verify them shortly. We will contact you on your mobile number.</FormMessage></div>}
      {stage === 'cancelled' && <div className="mt-4"><FormMessage kind="error">This order was cancelled because the advance payment was not received in time. Please place a new order.</FormMessage></div>}
      {stage === 'rejected_locked' && <div className="mt-4"><FormMessage kind="error">We could not verify your payment{info.rejectionReason ? `: ${info.rejectionReason}` : ''}. You have used all payment attempts, so please contact us with your order number.</FormMessage></div>}

      {(stage === 'awaiting' || stage === 'rejected_can_retry') && (
        <>
          <p className="mt-3 text-sm text-muted">
            Please pay <span className="font-medium text-primary">{formatBDT(info.advanceAmount)}</span> now to confirm your order. The remaining <span className="font-medium text-primary">{formatBDT(info.codAmount)}</span> is paid in cash on delivery.
            {expiry && <> Pay before {expiry}, or the order will be cancelled.</>}
          </p>
          {stage === 'rejected_can_retry' && (
            <div className="mt-4"><FormMessage kind="error">Your last payment could not be verified{info.rejectionReason ? `: ${info.rejectionReason}` : ''}. {info.attemptsLeft} {info.attemptsLeft === 1 ? 'attempt' : 'attempts'} left.</FormMessage></div>
          )}
          {info.methods.length === 0 ? (
            <div className="mt-4"><FormMessage kind="error">No payment method is available right now. Please contact us with your order number.</FormMessage></div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-5 space-y-5">
              <fieldset>
                <legend className="mb-2 text-xs font-medium uppercase tracking-[0.14em]">Pay with</legend>
                <div className="flex flex-wrap gap-2">
                  {info.methods.map((m) => (
                    <label key={m.code} className="cursor-pointer">
                      <input type="radio" value={m.code} className="peer sr-only" {...register('method')} />
                      <span className="inline-block border border-line px-5 py-2.5 text-sm peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-primary">{m.displayName}</span>
                    </label>
                  ))}
                </div>
                {errors.method && <span role="alert" className="mt-1 block text-xs text-red-700">{errors.method.message}</span>}
              </fieldset>
              {selected && (
                <div className="border border-accent/40 bg-accent/10 p-4 text-sm" role="status">
                  <p>Use <span className="font-medium">Send Money</span> to this {METHOD_LABEL[selected.code]} number:</p>
                  <p className="mt-1 font-display text-2xl font-semibold tracking-wide">{selected.merchantNumber}</p>
                  <p className="mt-1">Amount: <span className="font-medium">{formatBDT(info.advanceAmount)}</span></p>
                  {selected.instructions && <p className="mt-2 text-xs text-muted">{selected.instructions}</p>}
                </div>
              )}
              <Field label="Number you sent from" error={errors.senderNumber?.message}><input className="input" type="tel" inputMode="tel" placeholder="01XXXXXXXXX" {...register('senderNumber')} /></Field>
              <Field label="Transaction ID" error={errors.transactionId?.message}><input className="input uppercase" autoCapitalize="characters" autoComplete="off" {...register('transactionId')} /></Field>
              <Field label="Payment screenshot (optional)" hint="JPG, PNG or WebP, up to 3 MB. Your Transaction ID is enough on its own; a screenshot only helps us verify faster.">
                <input type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm" onChange={(e) => setProof(e.target.files?.[0] ?? null)} />
              </Field>
              {submitError && <FormMessage kind="error">{submitError}</FormMessage>}
              <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Submitting…' : 'Submit Payment Details'}</Button>
            </form>
          )}
        </>
      )}
    </section>
  );
}
