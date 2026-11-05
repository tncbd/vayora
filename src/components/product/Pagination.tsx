import { ChevronLeft, ChevronRight } from 'lucide-react';
import { pageWindow } from '@/lib/catalogParams';
import { cn } from '@/lib/cn';

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  const btn = 'flex h-10 min-w-10 items-center justify-center border px-3 text-sm transition-colors';
  return (
    <nav aria-label="Pagination" className="mt-12 flex flex-wrap items-center justify-center gap-1.5">
      <button className={cn(btn, 'border-line disabled:opacity-40')} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <ChevronLeft size={16} />
      </button>
      {pageWindow(page, pages).map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-1 text-muted" aria-hidden="true">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            aria-label={`Page ${p}`}
            className={cn(btn, p === page ? 'border-primary bg-primary text-white' : 'border-line hover:border-primary')}
          >
            {p}
          </button>
        ),
      )}
      <button className={cn(btn, 'border-line disabled:opacity-40')} disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
