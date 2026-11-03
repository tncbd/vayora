import { cn } from '@/lib/cn';

interface Props {
  src?: string | null;
  alt: string;
  className?: string;
  tone?: string;
  label?: string;
}

/**
 * Renders a real image when `src` exists, otherwise an honest tonal placeholder
 * (no stock photos are faked). Real images arrive from Supabase Storage in Phase 4+.
 */
export function ImagePlaceholder({ src, alt, className, tone = 'from-[#ece6da] to-[#f8f5f0]', label }: Props) {
  if (src) {
    return <img src={src} alt={alt} loading="lazy" className={cn('h-full w-full object-cover', className)} />;
  }
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        'flex h-full w-full items-center justify-center bg-gradient-to-br',
        tone,
        className,
      )}
    >
      <span className="select-none font-display text-5xl text-accent/60" aria-hidden="true">
        {label ?? 'V'}
      </span>
    </div>
  );
}
