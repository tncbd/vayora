import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { trackOrder, type OrderView } from '@/lib/ordersApi';
import { normalizeBdPhone } from '@/lib/validation';
import { isSupabaseConfigured } from '@/lib/supabase';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Field, FormMessage } from '@/components/ui/Field';
import { OrderDetailView } from '@/components/orders/OrderDetailView';

const ORDER_NO = /^VAY-\d{6}-\d{5}$/;
const schema = z.object({ orderNumber: z.string().trim().toUpperCase().regex(ORDER_NO, 'Enter your order number, like VAY-261106-00001'), phone: z.string().transform((v) => normalizeBdPhone(v)).refine((v) => !!v, 'Enter the mobile number used on the order') });

export default function TrackOrder() {
  usePageTitle('Track Your Order');
  const [params] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(params.get('order') ?? '');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ orderNumber?: string; phone?: string }>({});
  const [result, setResult] = useState<OrderView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setResult(null);
    const parsed = schema.safeParse({ orderNumber, phone });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ orderNumber: f.orderNumber?.[0], phone: f.phone?.[0] });
      return;
    }
    setErrors({});
    setLoading(true);
    try { setResult(await trackOrder(parsed.data.orderNumber, parsed.data.phone as string)); } catch (err) { setError(err instanceof Error ? err.message : 'Could not look up the order.'); } finally { setLoading(false); }
  };

  return (
    <>
      <PageHeader title="Track Your Order" crumbs={[{ label: 'Track Order' }]} />
      <div className="container-page max-w-3xl py-10 sm:py-14">
        {!isSupabaseConfigured ? (
          <FormMessage kind="info">Order tracking is unavailable because the store is not connected to its database.</FormMessage>
        ) : (
          <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Order number" error={errors.orderNumber}><input className="input uppercase" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="VAY-261106-00001" autoComplete="off" /></Field>
            <Field label="Mobile number on the order" error={errors.phone}><input className="input" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" /></Field>
            <Button type="submit" disabled={loading}>{loading ? 'Searching…' : 'Track'}</Button>
          </form>
        )}
        {error && <div className="mt-6"><FormMessage kind="error">{error}</FormMessage></div>}
        {result && <div className="mt-10 border-t border-line pt-8"><OrderDetailView order={result} /></div>}
      </div>
    </>
  );
}
