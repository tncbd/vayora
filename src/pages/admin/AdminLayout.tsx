import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS } from '@/lib/roles';
import { usePageTitle } from '@/hooks/usePageTitle';

/** Admin pages use their own chrome (no storefront header/footer). */
export default function AdminLayout() {
  usePageTitle('Admin');
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-secondary">
      <header className="border-b border-line bg-primary text-white">
        <div className="container-page flex h-14 items-center justify-between gap-4">
          <p className="font-display text-xl font-semibold tracking-[0.12em]">
            VAYORA <span className="ml-2 text-[10px] font-sans font-medium uppercase tracking-[0.3em] text-accent">Admin</span>
          </p>
          <div className="flex items-center gap-5 text-xs">
            <span className="hidden text-white/70 sm:inline">
              {user?.email} · {roles.map((r) => ROLE_LABELS[r]).join(', ')}
            </span>
            <Link to="/" className="uppercase tracking-[0.14em] hover:text-accent">View Store</Link>
            <button
              className="uppercase tracking-[0.14em] hover:text-accent"
              onClick={async () => { await signOut(); navigate('/login', { replace: true }); }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>
      <main className="container-page py-8 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
