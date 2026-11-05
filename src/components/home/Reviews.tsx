import { getLatestReviews } from '@/lib/catalogApi';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAsync } from '@/hooks/useAsync';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { StarRating } from '@/components/product/StarRating';

/** Shows only real, approved customer reviews; hidden while there are none. */
export function Reviews() {
  const { data } = useAsync(() => (isSupabaseConfigured ? getLatestReviews(3) : Promise.resolve([])), []);
  if (!data || data.length === 0) return null;
  return (
    <section className="container-page py-16 lg:py-24">
      <SectionHeading align="center" eyebrow="Testimonials" title="What Our Customers Say" />
      <div className="grid gap-5 md:grid-cols-3">
        {data.map((r) => (
          <figure key={r.id} className="border border-line bg-white p-7">
            <StarRating value={r.rating} size={15} />
            <blockquote className="mt-4 text-sm leading-relaxed text-ink">{r.comment}</blockquote>
            <figcaption className="mt-5 text-xs uppercase tracking-[0.15em] text-muted">
              {r.reviewerName}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
