import { useEffect } from 'react';
import { useSiteSettings } from '@/context/SiteContentContext';

/** Sets document.title. Full dynamic SEO metadata (OG, canonical, JSON-LD) arrives in Phase 9. */
export function usePageTitle(title?: string) {
  const { storeName, tagline } = useSiteSettings();
  useEffect(() => {
    document.title = title ? `${title} — ${storeName}` : `${storeName} — ${tagline.split('.')[0] || 'Fashion'}`;
  }, [title, storeName, tagline]);
}
