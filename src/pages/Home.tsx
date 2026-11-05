import { HeroSlider } from '@/components/home/HeroSlider';
import { TrustBar } from '@/components/home/TrustBar';
import { GenderCollections } from '@/components/home/GenderCollections';
import { ProductSection } from '@/components/home/ProductSection';
import { PromoBanners } from '@/components/home/PromoBanners';
import { DiscountSection } from '@/components/home/DiscountSection';
import { Reviews } from '@/components/home/Reviews';
import { Newsletter } from '@/components/home/Newsletter';
import { SocialSection } from '@/components/home/SocialSection';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function Home() {
  usePageTitle();
  return (
    <>
      <HeroSlider />
      <TrustBar />
      <GenderCollections />
      <ProductSection slug="new-arrivals" eyebrow="Just in" title="New Arrivals" description="The latest additions to our wardrobe." />
      <ProductSection slug="best-sellers" tinted eyebrow="Loved by many" title="Best Sellers" description="Customer favourites, back in demand." />
      <PromoBanners />
      <ProductSection slug="trending" eyebrow="Now popular" title="Trending Products" />
      <ProductSection slug="winter" tinted eyebrow="Seasonal" title="Winter Collection" description="Warm, layered and effortlessly stylish." />
      <DiscountSection />
      <ProductSection slug="featured" eyebrow="Handpicked" title="Featured Products" />
      <Reviews />
      <Newsletter />
      <SocialSection />
    </>
  );
}
