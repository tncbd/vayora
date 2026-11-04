import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS } from '@/lib/roles';

export default function Overview() {
  const { user, roles } = useAuth();
  const name = (user?.user_metadata?.full_name as string | undefined) || user?.email;
  const cards = [
    { to: '/account/orders', title: 'My Orders', text: 'Order history and tracking (available after Phase 7).' },
    { to: '/account/addresses', title: 'Addresses', text: 'Save delivery addresses for faster checkout.' },
    { to: '/account/profile', title: 'Profile', text: 'Update your name and mobile number.' },
    { to: '/account/wishlist', title: 'Wishlist', text: 'Saved products (available after Phase 4).' },
  ];
  return (
    <div>
      <h2 className="text-2xl font-medium">Welcome, {name}</h2>
      <p className="mt-1 text-sm text-muted">{user?.email}</p>
      {roles.length > 0 && (
        <p className="mt-3 text-xs uppercase tracking-[0.16em] text-accent-dark">
          Staff role: {roles.map((r) => ROLE_LABELS[r]).join(', ')} ·{' '}
          <Link to="/admin" className="link-underline">Open admin</Link>
        </p>
      )}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.to} to={c.to} className="border border-line p-6 transition-colors hover:border-primary">
            <h3 className="text-xl font-medium">{c.title}</h3>
            <p className="mt-2 text-sm text-muted">{c.text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
