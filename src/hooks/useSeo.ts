import { useEffect } from 'react';
import type { PageSeo } from '@/lib/seo';

// A tiny store: a page publishes its own SEO values, HeadManager (in Layout) merges them with the site defaults.
let current: PageSeo = {};
const listeners = new Set<() => void>();
export const getPageSeo = () => current;
export const subscribeSeo = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const publish = (v: PageSeo) => { current = v; listeners.forEach((l) => l()); };

/** Pages call this to add a description, image, JSON-LD or noindex. Cleared automatically when the page unmounts. */
export function useSeo(seo: PageSeo | null) {
  const key = seo ? JSON.stringify(seo) : '';
  useEffect(() => {
    if (!seo) return;
    publish(seo);
    return () => publish({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
