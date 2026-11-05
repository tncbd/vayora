import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { sectionsFor } from '@/lib/roles';

/**
 * Admin overview. Finished screens are links; the rest show the phase in which they are built
 * (nothing is faked). What you see is limited to your role; the database enforces the same limits.
 */
export default function AdminHome() {
  const { roles } = useAuth();
  const sections = sectionsFor(roles);
  return (
    <div>
      <h1 className="text-3xl font-medium sm:text-4xl">Admin</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Sections with a link are ready to use. The others are built in the phase shown.
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <li key={s.key}>
            {s.path ? (
              <Link to={s.path} className="flex items-center justify-between border border-line bg-white px-4 py-3 text-sm transition-colors hover:border-primary">
                <span className="font-medium text-primary">{s.label}</span>
                <span className="text-[10px] uppercase tracking-widest text-accent-dark">Open</span>
              </Link>
            ) : (
              <div className="flex items-center justify-between border border-line bg-white px-4 py-3 text-sm">
                <span className="text-muted">{s.label}</span>
                <span className="text-[10px] uppercase tracking-widest text-muted">Phase {s.phase}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
