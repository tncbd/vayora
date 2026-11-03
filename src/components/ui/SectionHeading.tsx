import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  linkLabel?: string;
  linkTo?: string;
  align?: 'left' | 'center';
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  linkLabel,
  linkTo,
  align = 'left',
  className,
}: Props) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-3 sm:mb-10',
        align === 'center'
          ? 'items-center text-center'
          : 'sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className={cn(align === 'center' && 'max-w-xl')}>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="text-3xl font-medium leading-tight sm:text-4xl">{title}</h2>
        {description && <p className="mt-3 text-sm text-muted sm:text-base">{description}</p>}
      </div>
      {linkLabel && linkTo && (
        <Link to={linkTo} className="link-underline text-xs font-medium uppercase tracking-[0.18em] text-primary">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
