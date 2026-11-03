import { Star } from 'lucide-react';
import { reviews } from '@/data/placeholder';
import { SectionHeading } from '@/components/ui/SectionHeading';

export function Reviews() {
  if (reviews.length === 0) return null;
  return (
    <section className="container-page py-16 lg:py-24">
      <SectionHeading align="center" eyebrow="Testimonials" title="What Our Customers Say" />
      <div className="grid gap-5 md:grid-cols-3">
        {reviews.map((r) => (
          <figure key={r.id} className="border border-line bg-white p-7">
            <div className="flex gap-0.5 text-accent" role="img" aria-label={`${r.rating} out of 5 stars`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={15} fill={i < r.rating ? 'currentColor' : 'none'} />
              ))}
            </div>
            <blockquote className="mt-4 text-sm leading-relaxed text-ink">{r.comment}</blockquote>
            <figcaption className="mt-5 text-xs uppercase tracking-[0.15em] text-muted">
              {r.customerName} · {r.location}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
