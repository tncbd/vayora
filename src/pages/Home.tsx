import type { ReactNode } from 'react';
import { HeroSlider } from '@/components/home/HeroSlider';
import { TrustBar } from '@/components/home/TrustBar';
import { GenderCollections } from '@/components/home/GenderCollections';
import { ProductSection } from '@/components/home/ProductSection';
import { PromoBanners } from '@/components/home/PromoBanners';
import { DiscountSection } from '@/components/home/DiscountSection';
import { Reviews } from '@/components/home/Reviews';
import { Newsletter } from '@/components/home/Newsletter';
import { SocialSection } from '@/components/home/SocialSection';
import { useSiteContent } from '@/context/SiteContentContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { HomeSection } from '@/lib/siteContent';

// order, visibility and titles come from Admin > Homepage Builder; these are only the fallbacks
const RAILS: Record<string, { slug: string; eyebrow: string; title: string; description?: string; tinted?: boolean }> = {
  new_arrivals: { slug: 'new-arrivals', eyebrow: 'Just in', title: 'New Arrivals', description: 'The latest additions to our wardrobe.' },
  best_sellers: { slug: 'best-sellers', eyebrow: 'Loved by many', title: 'Best Sellers', description: 'Customer favourites, back in demand.', tinted: true },
  trending: { slug: 'trending', eyebrow: 'Now popular', title: 'Trending Products' },
  winter: { slug: 'winter', eyebrow: 'Seasonal', title: 'Winter Collection', description: 'Warm, layered and effortlessly stylish.', tinted: true },
  featured: { slug: 'featured', eyebrow: 'Handpicked', title: 'Featured Products' },
};

function render(s: HomeSection): ReactNode {
  const rail = RAILS[s.key];
  if (rail) return <ProductSection slug={rail.slug} tinted={rail.tinted} eyebrow={rail.eyebrow} title={s.title || rail.title} description={s.description ?? rail.description} />;
  switch (s.key) {
    case 'hero': return <HeroSlider />;
    case 'trust_bar': return <TrustBar />;
    case 'collections': return <GenderCollections />;
    case 'promo_banners': return <PromoBanners />;
    case 'discount': return <DiscountSection />;
    case 'reviews': return <Reviews />;
    case 'newsletter': return <Newsletter title={s.title} description={s.description} />;
    case 'social': return <SocialSection title={s.title} description={s.description} />;
    default: return null;
  }
}

export default function Home() {
  usePageTitle();
  const { home } = useSiteContent();
  return <>{home.map((s) => <div key={s.key}>{render(s)}</div>)}</>;
}
