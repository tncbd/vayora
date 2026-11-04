import type { ReactNode } from 'react';
import { FormMessage } from '@/components/ui/Field';
import { useAuth } from '@/context/AuthContext';

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  const { configured } = useAuth();
  return (
    <div className="container-page py-12 sm:py-20">
      <div className="mx-auto w-full max-w-md">
        <div className="text-center">
          <p className="eyebrow">VAYORA FASHION</p>
          <h1 className="mt-2 text-4xl font-medium">{title}</h1>
          {subtitle && <p className="mt-3 text-sm text-muted">{subtitle}</p>}
        </div>
        <div className="mt-8 space-y-5">
          {!configured && (
            <FormMessage kind="info">
              The store is not connected to its database yet, so accounts are unavailable. (Admin: set the Supabase values in
              .env.local.)
            </FormMessage>
          )}
          {children}
        </div>
        {footer && <div className="mt-8 text-center text-sm text-muted">{footer}</div>}
      </div>
    </div>
  );
}
