import { ButtonLink } from '@/components/ui/Button';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function NotFound() {
  usePageTitle('Page not found');
  return (
    <div className="container-page flex flex-col items-center py-24 text-center sm:py-32">
      <p className="font-display text-8xl text-accent">404</p>
      <h1 className="mt-4 text-3xl font-medium sm:text-4xl">Page not found</h1>
      <p className="mt-3 max-w-md text-sm text-muted">
        The page you are looking for may have moved or no longer exists.
      </p>
      <div className="mt-8 flex gap-3">
        <ButtonLink to="/">Back to Home</ButtonLink>
        <ButtonLink to="/shop" variant="outline">Shop All</ButtonLink>
      </div>
    </div>
  );
}
