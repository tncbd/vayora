import { Link } from 'react-router-dom';
import { useAsync } from '@/hooks/useAsync';
import { listMyOrders } from '@/lib/ordersApi';
import { formatBDT } from '@/lib/format';
import { FormMessage } from '@/components/ui/Field';
import { StatusBadge } from '@/components/orders/OrderParts';

export default function Orders() {
  const { data, loading, error } = useAsync(listMyOrders, []);
  return (
    <div>
      <h2 className="text-2xl font-medium">My Orders</h2>
      <div className="mt-6">
        {error ? <FormMessage kind="error">{error}</FormMessage>
        : loading && !data ? <p role="status" className="text-sm text-muted">Loading…</p>
        : (data?.length ?? 0) === 0 ? (
          <div className="border border-line p-8 text-center text-sm text-muted">No orders yet. <Link to="/shop" className="link-underline font-medium text-primary">Start shopping</Link></div>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {data!.map((o) => (
              <li key={o.id}>
                <Link to={`/account/orders/${o.orderNumber}`} className="flex flex-wrap items-center justify-between gap-3 py-4 hover:bg-white">
                  <span>
                    <span className="block font-medium text-primary">{o.orderNumber}</span>
                    <span className="text-xs text-muted">{new Date(o.placedAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })} · {o.itemCount} item{o.itemCount === 1 ? '' : 's'}{o.firstItem ? ` · ${o.firstItem}${o.itemCount > 1 ? ' …' : ''}` : ''}</span>
                  </span>
                  <span className="flex items-center gap-4"><span className="text-sm">{formatBDT(o.total)}</span><StatusBadge status={o.status} /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
