import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const smallBtn =
  'border border-line bg-white px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-primary transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-40';
export const dangerBtn = `${smallBtn} !text-red-700 hover:!border-red-700`;
export const cell = 'px-3 py-2.5 align-middle text-sm';

export function PageTitle({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-medium sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

const tones = {
  ok: 'bg-green-100 text-green-800',
  warn: 'bg-amber-100 text-amber-900',
  bad: 'bg-red-100 text-red-800',
  muted: 'bg-secondary text-muted',
} as const;

export function Pill({ tone = 'muted', children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={cn('inline-block px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest', tones[tone])}>{children}</span>;
}

export function Card({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('border border-line bg-white p-5 sm:p-6', className)}>
      {title && <h2 className="mb-4 text-xl font-medium">{title}</h2>}
      {children}
    </section>
  );
}

export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto border border-line bg-white">{children}</div>;
}

export const thCls = 'px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.14em] text-muted';
