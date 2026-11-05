import { Star } from 'lucide-react';

export function StarRating({ value, size = 14, count }: { value: number; size?: number; count?: number }) {
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex gap-0.5 text-accent" role="img" aria-label={`${value.toFixed(1)} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={size} fill={i < rounded ? 'currentColor' : 'none'} aria-hidden="true" />
        ))}
      </span>
      {count !== undefined && <span className="text-xs text-muted">({count})</span>}
    </span>
  );
}
