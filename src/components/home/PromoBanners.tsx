import { useEffect, useState } from 'react';
import { fetchBanners } from '@/lib/contentApi';
import { safeLink, safeUrl } from '@/lib/siteContent';
import { isSupabaseConfigured } from '@/lib/supabase';
import { ButtonLink } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

interface Promo { id: string; title: string; subtitle: string; buttonLabel: string; buttonLink: string; imageUrl: string | null }
const TONES = ['from-[#d9cfc0] to-[#efe8dc]', 'from-[#c6a46a] to-[#e2cd9f]'];

/** Promotional banners from Admin > Banners (position "home_promo"). Nothing is shown until some exist. */
export function PromoBanners() {
  const [banners, setBanners] = useState<Promo[]>([]);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    fetchBanners('home_promo')
      .then((rows) => active && setBanners(rows.slice(0, 4).map((r) => ({
        id: r.id, title: r.title, subtitle: r.subtitle ?? '', buttonLabel: r.button_label ?? '', buttonLink: safeLink(r.button_link, '/shop'), imageUrl: safeUrl(r.image_url) || null,
      }))))
      .catch(() => undefined);
    return () => { active = false; };
  }, []);
  if (banners.length === 0) return null;
  return (
    <section className="container-page py-6 lg:py-10" aria-label="Promotions">
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {banners.map((b, i) => (
          <div key={b.id} className={cn('relative flex min-h-[260px] items-end overflow-hidden bg-gradient-to-br p-7 sm:min-h-[320px] sm:p-10', TONES[i % TONES.length])}>
            {b.imageUrl && <img src={b.imageUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />}
            <div className={cn('relative', b.imageUrl && 'text-white [&_p]:!text-white/85')}>
              <h3 className={cn('font-display text-3xl font-medium sm:text-4xl', b.imageUrl && '!text-white')}>{b.title}</h3>
              {b.subtitle && <p className="mt-2 text-sm text-primary/75">{b.subtitle}</p>}
              {b.buttonLabel && <div className="mt-6"><ButtonLink to={b.buttonLink}>{b.buttonLabel}</ButtonLink></div>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
