import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { canAccess, resolveGuard } from '@/lib/roles';
import { ButtonLink } from '@/components/ui/Button';

export function FullPageMessage({ title, text, children }: { title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="container-page flex min-h-[50vh] flex-col items-center justify-center py-20 text-center">
      <h1 className="text-3xl font-medium sm:text-4xl">{title}</h1>
      {text && <p className="mt-3 max-w-md text-sm text-muted">{text}</p>}
      {children && <div className="mt-8 flex gap-3">{children}</div>}
    </div>
  );
}

function Guard({ requireStaff, section }: { requireStaff?: boolean; section?: string }) {
  const { loading, user, roles, configured } = useAuth();
  const location = useLocation();

  if (!configured) {
    return (
      <FullPageMessage
        title="Accounts unavailable"
        text="The store is not connected to its database yet, so sign-in is not available."
      >
        <ButtonLink to="/">Back to Home</ButtonLink>
      </FullPageMessage>
    );
  }

  let result = resolveGuard({ loading, signedIn: !!user, roles, requireStaff: requireStaff || !!section });
  if (result === 'allow' && section && !canAccess(roles, section)) result = 'forbidden';
  if (result === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
        <span className="text-xs uppercase tracking-[0.25em] text-muted">Loading…</span>
      </div>
    );
  }
  if (result === 'login') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (result === 'forbidden') {
    return (
      <FullPageMessage title="No access" text="Your account does not have permission to view this area.">
        <ButtonLink to="/">Back to Home</ButtonLink>
        <Link to="/account" className="link-underline inline-flex items-center px-3 text-xs uppercase tracking-[0.18em]">
          My Account
        </Link>
      </FullPageMessage>
    );
  }
  return <Outlet />;
}

/** Any signed-in customer. */
export const RequireAuth = () => <Guard />;
/** Signed-in AND holding at least one admin role. (UI convenience only; the database enforces the real rules.) */
export const RequireStaff = () => <Guard requireStaff />;
/** Staff whose role grants access to one admin section (e.g. 'products'). Database rules still apply on top. */
export const RequireSection = ({ section }: { section: string }) => <Guard section={section} />;
