import { useAuth } from '@/context/AuthContext';
import { sectionsFor } from '@/lib/roles';

/**
 * Phase 3 admin shell: proves sign-in + role gating work and shows which sections the
 * current role will get. The sections themselves are built in the listed phases;
 * none of them is faked here, so they are not clickable.
 */
export default function AdminHome() {
  const { roles } = useAuth();
  const sections = sectionsFor(roles);
  return (
    <div>
      <h1 className="text-3xl font-medium sm:text-4xl">Admin Dashboard</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        You are signed in with admin access. The management screens below are built in the phases shown, so they are not
        available yet. What you see here is limited to your role; the database enforces the same limits.
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <li key={s.key} className="flex items-center justify-between border border-line bg-white px-4 py-3 text-sm">
            <span className="text-primary">{s.label}</span>
            <span className="text-[10px] uppercase tracking-widest text-muted">Phase {s.phase}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
