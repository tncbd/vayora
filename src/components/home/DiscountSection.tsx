import { getMaxDiscount } from '@/lib/catalogApi';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAsync } from '@/hooks/useAsync';
import { ButtonLink } from '@/components/ui/Button';

/** The headline percentage comes from the real catalogue, never typed in by hand. */
export function DiscountSection() {
  const { data: maxOff } = useAsync(() => (isSupabaseConfigured ? getMaxDiscount() : Promise.resolve(0)), []);
  if (!maxOff) return null;
  return (
    <section className="bg-primary text-white">
      <div className="container-page flex flex-col items-center gap-6 py-14 text-center lg:py-20">
        <p className="eyebrow !text-accent">Special Offers</p>
        <h2 className="font-display text-4xl font-medium !text-white sm:text-5xl lg:text-6xl">Save up to {maxOff}% on selected styles</h2>
        <p className="max-w-lg text-sm text-white/70">Limited-time prices on customer favourites across men’s and women’s fashion.</p>
        <ButtonLink to="/collections/special-offers" variant="accent">Shop the Offers</ButtonLink>
      </div>
    </section>
  );
}
