import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { heroSlides } from '@/data/placeholder';
import { ButtonLink } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

const INTERVAL_MS = 6000;

export function HeroSlider() {
  const slides = heroSlides;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback((i: number) => setIndex((i + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), INTERVAL_MS);
    return () => clearInterval(t);
  }, [paused, slides.length]);

  if (slides.length === 0) return null;

  return (
    <section
      className="relative overflow-hidden bg-primary text-white"
      aria-roledescription="carousel"
      aria-label="Featured collections"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative h-[68vh] min-h-[460px] max-h-[720px] lg:h-[78vh]">
        {slides.map((s, i) => (
          <div
            key={s.id}
            className={cn(
              'absolute inset-0 transition-opacity duration-1000',
              i === index ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
            aria-hidden={i !== index}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${slides.length}`}
          >
            {s.imageUrl ? (
              <img src={s.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className={cn('h-full w-full bg-gradient-to-br', s.tone)} />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />

            <div className="container-page absolute inset-0 flex items-center">
              <div className="max-w-xl animate-fade-up">
                <p className="eyebrow !text-accent">{s.eyebrow}</p>
                <h1 className="mt-4 font-display text-5xl font-medium leading-[1.05] !text-white sm:text-6xl lg:text-7xl">
                  {s.title}
                </h1>
                <p className="mt-5 max-w-md text-sm leading-relaxed text-white/80 sm:text-base">{s.description}</p>
                <div className="mt-8">
                  <ButtonLink to={s.buttonLink} variant="light">
                    {s.buttonLabel}
                  </ButtonLink>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <button
            onClick={() => go(index - 1)}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 hidden -translate-y-1/2 border border-white/30 p-2.5 text-white transition-colors hover:bg-white hover:text-primary sm:block"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => go(index + 1)}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 hidden -translate-y-1/2 border border-white/30 p-2.5 text-white transition-colors hover:bg-white hover:text-primary sm:block"
          >
            <ChevronRight size={20} />
          </button>
          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                className={cn('h-1 transition-all', i === index ? 'w-10 bg-accent' : 'w-5 bg-white/40 hover:bg-white/70')}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
