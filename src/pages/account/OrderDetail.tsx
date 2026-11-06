import { Link, useParams } from 'react-router-dom';
import { useAsync } from '@/hooks/useAsync';
import { getMyOrder } from '@/lib/ordersApi';
import { FormMessage } from '@/components/ui/Field';
import { OrderDetailView } from '@/components/orders/OrderDetailView';
import { PaymentPanel } from '@/components/cart/PaymentPanel';

export default function OrderDetail() {
  const { orderNumber = '' } = useParams();
  const { data, loading, error, reload } = useAsync(() => getMyOrder(orderNumber), [orderNumber]);
  return (
    <div>
      <Link to="/account/orders" className="text-xs uppercase tracking-[0.18em] text-primary link-underline">← All orders</Link>
      <div className="mt-6">
        {error ? <FormMessage kind="error">{error}</FormMessage>
        : loading && !data ? <p role="status" className="text-sm text-muted">Loading…</p>
        : !data ? <p className="text-sm text-muted">We could not find this order on your account.</p>
        : (<>
            <OrderDetailView order={data} onChanged={reload} />
            {data.status === 'pending_payment_verification' && <PaymentPanel orderId={data.id} token={null} />}
          </>)}
      </div>
    </div>
  );
}
