import { useEffect } from 'react';
import { siteSettings } from '@/data/placeholder';

/** Sets document.title. Full dynamic SEO metadata (OG, canonical, JSON-LD) arrives in Phase 9. */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title
      ? `${title} — ${siteSettings.storeName}`
      : `${siteSettings.storeName} — Style for Everyone`;
  }, [title]);
}
