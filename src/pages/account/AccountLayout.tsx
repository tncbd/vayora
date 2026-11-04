import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { usePageTitle } from '@/hooks/usePageTitle';

const tabs = [
  { to: '/account', label: 'Overview', end: true },
  { to: '/account/orders', label: 'My Orders' },
  { to: '/account/wishlist', label: 'Wishlist' },
  { to: '/account/addresses', label: 'Addresses' },
  { to: '/account/profile', label: 'Profile' },
];

export default function AccountLayout() {
  usePageTitle('My Account');
  const { signOut, isStaff } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="My Account" crumbs={[{ label: 'Account' }]} />
      <div className="container-page py-8 sm:py-12">
        <nav aria-label="Account" className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line pb-4">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `text-xs font-medium uppercase tracking-[0.16em] ${isActive ? 'text-accent-dark' : 'text-primary hover:text-accent-dark'}`
              }
            >
              {t.label}
            </NavLink>
          ))}
          {isStaff && (
            <NavLink to="/admin" className="text-xs font-medium uppercase tracking-[0.16em] text-primary hover:text-accent-dark">
              Admin
            </NavLink>
          )}
          <button
            onClick={async () => {
              await signOut();
              navigate('/', { replace: true });
            }}
            className="ml-auto text-xs font-medium uppercase tracking-[0.16em] text-muted hover:text-primary"
          >
            Sign Out
          </button>
        </nav>
        <Outlet />
      </div>
    </>
  );
}
