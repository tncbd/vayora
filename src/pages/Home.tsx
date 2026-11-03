import { HeroSlider } from '@/components/home/HeroSlider';
import { TrustBar } from '@/components/home/TrustBar';
import { GenderCollections } from '@/components/home/GenderCollections';
import { ProductSection } from '@/components/home/ProductSection';
import { PromoBanners } from '@/components/home/PromoBanners';
import { DiscountSection } from '@/components/home/DiscountSection';
import { Reviews } from '@/components/home/Reviews';
import { Newsletter } from '@/components/home/Newsletter';
import { SocialSection } from '@/components/home/SocialSection';
import { getByCollection } from '@/lib/catalog';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function Home() {
  usePageTitle();
  return (
    <>
      <HeroSlider />
      <TrustBar />
      <GenderCollections />
      <ProductSection
        eyebrow="Just in"
        title="New Arrivals"
        description="The latest additions to our wardrobe."
        linkTo="/collections/new-arrivals"
        products={getByCollection('new-arrivals')}
      />
      <ProductSection
        tinted
        eyebrow="Loved by many"
        title="Best Sellers"
        description="Customer favourites, back in demand."
        linkTo="/collections/best-sellers"
        products={getByCollection('best-sellers')}
      />
      <PromoBanners />
      <ProductSection
        eyebrow="Now popular"
        title="Trending Products"
        linkTo="/collections/trending"
        products={getByCollection('trending')}
      />
      <ProductSection
        tinted
        eyebrow="Seasonal"
        title="Winter Collection"
        description="Warm, layered and effortlessly stylish."
        linkTo="/collections/winter"
        products={getByCollection('winter')}
      />
      <DiscountSection />
      <ProductSection
        eyebrow="Handpicked"
        title="Featured Products"
        linkTo="/collections/featured"
        products={getByCollection('featured')}
      />
      <Reviews />
      <Newsletter />
      <SocialSection />
    </>
  );
}
