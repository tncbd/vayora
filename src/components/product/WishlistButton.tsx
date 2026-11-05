import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWishlist } from '@/context/WishlistContext';
import { cn } from '@/lib/cn';

export function WishlistButton({ productId, className, label }: { productId: string; className?: string; label?: boolean }) {
  const { has, toggle } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = has(productId);

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await toggle(productId);
    setBusy(false);
    if (res.needsLogin) return navigate('/login', { state: { from: location.pathname + location.search } });
    if (!res.ok) setError(res.message ?? 'Could not update your wishlist.');
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        aria-pressed={active}
        aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
        className={cn('inline-flex items-center gap-2 transition-colors disabled:opacity-60', className)}
      >
        <Heart size={18} className={active ? 'fill-accent-dark text-accent-dark' : 'text-primary'} />
        {label && <span className="text-xs font-medium uppercase tracking-[0.16em]">{active ? 'In wishlist' : 'Add to wishlist'}</span>}
      </button>
      {error && <span role="alert" className="sr-only">{error}</span>}
    </>
  );
}
