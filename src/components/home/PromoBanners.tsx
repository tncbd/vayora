import { promoBanners } from '@/data/placeholder';
import { ButtonLink } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export function PromoBanners() {
  if (promoBanners.length === 0) return null;
  return (
    <section className="container-page py-6 lg:py-10" aria-label="Promotions">
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {promoBanners.map((b) => (
          <div key={b.id} className={cn('relative flex min-h-[260px] items-end overflow-hidden bg-gradient-to-br p-7 sm:min-h-[320px] sm:p-10', b.tone)}>
            {b.imageUrl && <img src={b.imageUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
            <div className="relative">
              <h3 className="font-display text-3xl font-medium sm:text-4xl">{b.title}</h3>
              <p className="mt-2 text-sm text-primary/75">{b.subtitle}</p>
              <div className="mt-6">
                <ButtonLink to={b.buttonLink}>{b.buttonLabel}</ButtonLink>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
