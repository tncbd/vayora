import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { HeroSlide } from '@/types';
import { fetchHeroSlides } from '@/lib/contentApi';
import { safeLink, safeUrl } from '@/lib/siteContent';
import { isSupabaseConfigured } from '@/lib/supabase';
import { ButtonLink } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

const INTERVAL_MS = 6000;
const TONES = ['from-[#2a2723] via-[#171717] to-[#3a332a]', 'from-[#3b2f26] via-[#241d18] to-[#171717]', 'from-[#1f2429] via-[#171717] to-[#2d2a24]'];

/** Brand welcome slide, shown until the owner adds slides in Admin > Hero Slider. */
const DEFAULT_SLIDES: HeroSlide[] = [{
  id: 'default', eyebrow: 'New Season', title: 'Style for Everyone',
  description: 'Discover refined essentials and statement pieces, designed for every moment of your day.',
  buttonLabel: 'Shop New Arrivals', buttonLink: '/collections/new-arrivals', imageUrl: null, tone: TONES[0],
}];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toSlide = (r: Record<string, any>, i: number): HeroSlide => ({
  id: r.id, eyebrow: r.eyebrow ?? '', title: r.title, description: r.description ?? '',
  buttonLabel: r.button_label ?? '', buttonLink: safeLink(r.button_link, '/shop'), imageUrl: safeUrl(r.image_url) || null, tone: TONES[i % TONES.length],
});

export function HeroSlider() {
  const [slides, setSlides] = useState<HeroSlide[]>(DEFAULT_SLIDES);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    fetchHeroSlides().then((rows) => { if (active && rows.length) setSlides(rows.map(toSlide)); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
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
                {s.eyebrow && <p className="eyebrow !text-accent">{s.eyebrow}</p>}
                <h1 className="mt-4 font-display text-5xl font-medium leading-[1.05] !text-white sm:text-6xl lg:text-7xl">
                  {s.title}
                </h1>
                {s.description && <p className="mt-5 max-w-md text-sm leading-relaxed text-white/80 sm:text-base">{s.description}</p>}
                {s.buttonLabel && (
                  <div className="mt-8">
                    <ButtonLink to={s.buttonLink} variant="light">
                      {s.buttonLabel}
                    </ButtonLink>
                  </div>
                )}
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
            className="absolute bottom-4 right-16 hidden border border-white/30 p-2.5 text-white transition-colors hover:bg-white hover:text-primary sm:block"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => go(index + 1)}
            aria-label="Next slide"
            className="absolute bottom-4 right-4 hidden border border-white/30 p-2.5 text-white transition-colors hover:bg-white hover:text-primary sm:block"
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
