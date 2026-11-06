import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS, sectionsFor } from '@/lib/roles';
import { usePageTitle } from '@/hooks/usePageTitle';

/** Admin pages use their own chrome (no storefront header/footer). */
export default function AdminLayout() {
  usePageTitle('Admin');
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  // one link per finished screen (several sections can share a screen)
  const links = [...new Map(sectionsFor(roles).filter((x) => x.path).map((x) => [x.path as string, x.label])).entries()];
  return (
    <div className="min-h-screen bg-secondary print:bg-white">
      <header className="border-b border-line bg-primary text-white print:hidden">
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
      <nav aria-label="Admin" className="border-b border-line bg-white print:hidden">
        <div className="container-page flex flex-wrap gap-x-6 gap-y-2 py-3 text-xs font-medium uppercase tracking-[0.14em]">
          <NavLink to="/admin" end className={({ isActive }) => (isActive ? 'text-accent-dark' : 'text-primary hover:text-accent-dark')}>Overview</NavLink>
          {links.map(([path, label]) => (
            <NavLink key={path} to={path} className={({ isActive }) => (isActive ? 'text-accent-dark' : 'text-primary hover:text-accent-dark')}>{label}</NavLink>
          ))}
        </div>
      </nav>
      <main className="container-page py-8 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
