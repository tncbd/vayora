import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Star } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAsync } from '@/hooks/useAsync';
import { getMyReview, getReviews, submitReview } from '@/lib/catalogApi';
import { Button } from '@/components/ui/Button';
import { FormMessage } from '@/components/ui/Field';
import { StarRating } from './StarRating';

export function ProductReviews({ productId }: { productId: string }) {
  const { user } = useAuth();
  const location = useLocation();
  const reviews = useAsync(() => getReviews(productId), [productId]);
  const mine = useAsync(() => (user ? getMyReview(productId, user.id) : Promise.resolve(null)), [productId, user?.id]);
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const list = reviews.data ?? [];
  const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (rating < 1) return setMsg({ kind: 'error', text: 'Please choose a star rating.' });
    if (comment.length > 2000) return setMsg({ kind: 'error', text: 'Your review is too long (2000 characters max).' });
    setBusy(true);
    setMsg(null);
    try {
      await submitReview({ productId, userId: user.id, rating, title: title.slice(0, 120), comment });
      setMsg({ kind: 'success', text: 'Thank you! Your review will appear once it has been approved.' });
      mine.reload();
    } catch (err) {
      setMsg({ kind: 'error', text: err instanceof Error ? err.message : 'Could not submit your review.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="reviews-heading" className="border-t border-line pt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="reviews-heading" className="text-3xl font-medium">Customer Reviews</h2>
        {list.length > 0 && <StarRating value={avg} size={16} count={list.length} />}
      </div>

      {reviews.error && <p role="alert" className="mt-4 text-sm text-red-700">Reviews could not be loaded.</p>}
      {!reviews.loading && !reviews.error && list.length === 0 && <p className="mt-4 text-sm text-muted">No reviews yet. Be the first to share your thoughts.</p>}

      <ul className="mt-6 divide-y divide-line">
        {list.map((r) => (
          <li key={r.id} className="py-5">
            <StarRating value={r.rating} />
            {r.title && <p className="mt-2 text-sm font-medium text-primary">{r.title}</p>}
            {r.comment && <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">{r.comment}</p>}
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted">{r.reviewerName} · {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </li>
        ))}
      </ul>

      <div className="mt-8 max-w-xl border border-line p-6">
        <h3 className="text-xl font-medium">Write a review</h3>
        {!user ? (
          <p className="mt-3 text-sm text-muted">
            <Link to="/login" state={{ from: location.pathname }} className="link-underline font-medium text-primary">Sign in</Link> to review this product.
          </p>
        ) : mine.data ? (
          <p className="mt-3 text-sm text-muted">
            {mine.data.status === 'approved' ? 'You have reviewed this product. Thank you!' : mine.data.status === 'rejected' ? 'Your review was not published.' : 'Your review is awaiting approval.'}
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 space-y-4" noValidate>
            {msg && <FormMessage kind={msg.kind}>{msg.text}</FormMessage>}
            <div role="radiogroup" aria-label="Your rating" className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setRating(n)} className="p-0.5 text-accent">
                  <Star size={26} fill={n <= rating ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium uppercase tracking-[0.14em]">Title (optional)</span>
              <input className="input" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium uppercase tracking-[0.14em]">Review</span>
              <textarea className="input" rows={4} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} />
            </label>
            <Button type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit Review'}</Button>
          </form>
        )}
      </div>
    </section>
  );
}
