import type { ReactNode } from 'react';

/** Label + control + error. The label wraps the control so it is always associated. */
export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-left">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-primary">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && (
        <span role="alert" className="mt-1 block text-xs text-red-700">
          {error}
        </span>
      )}
    </label>
  );
}

export function FormMessage({ kind, children }: { kind: 'error' | 'success' | 'info'; children: ReactNode }) {
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-green-200 bg-green-50 text-green-800',
    info: 'border-accent/40 bg-accent/10 text-ink',
  }[kind];
  return (
    <p role={kind === 'error' ? 'alert' : 'status'} className={`border px-4 py-3 text-sm ${styles}`}>
      {children}
    </p>
  );
}
