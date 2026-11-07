import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSiteSettings } from '@/context/SiteContentContext';
import { getPageSeo, subscribeSeo } from '@/hooks/useSeo';
import { absoluteUrl, breadcrumbJsonLd, canonicalUrl, isGaId, isPrivatePath, organizationJsonLd, safeJsonLd, siteOrigin } from '@/lib/seo';

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!content) { el?.remove(); return; }
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.content = content;
}
function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!href) { el?.remove(); return; }
  if (!el) { el = document.createElement('link'); el.rel = rel; document.head.appendChild(el); }
  el.href = href;
}

/** Keeps canonical, description, Open Graph, robots and structured data in step with the current page. Renders nothing. */
export function HeadManager() {
  const { pathname } = useLocation();
  const s = useSiteSettings();
  const [page, setPage] = useState(getPageSeo());
  useEffect(() => subscribeSeo(() => setPage(getPageSeo())), []);

  useEffect(() => {
    const origin = siteOrigin();
    const url = canonicalUrl(origin, pathname);
    const noindex = page.noindex || isPrivatePath(pathname);
    const title = document.title;
    const description = page.description || s.seoDescription;
    const image = absoluteUrl(origin, page.image) || s.ogImage;
    setLink('canonical', noindex ? '' : url);
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    setMeta('name', 'description', description);
    setMeta('property', 'og:site_name', s.storeName);
    setMeta('property', 'og:type', page.type ?? 'website');
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:image', image);
    setMeta('property', 'og:locale', 'en_BD');
    setMeta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', image);
    setMeta('name', 'google-site-verification', s.verification);

    const data: object[] = [...(page.jsonLd ?? [])];
    if (pathname === '/') data.push(organizationJsonLd(origin, s.storeName, absoluteUrl(origin, '/favicon.svg'), [s.facebookUrl, s.instagramUrl, s.tiktokUrl, s.youtubeUrl].filter(Boolean)));
    if (!noindex && pathname !== '/' && !page.jsonLd?.length) data.push(breadcrumbJsonLd(origin, [{ name: 'Home', path: '/' }, { name: title.split(' — ')[0], path: pathname }]));
    document.head.querySelectorAll('script[data-seo-ld]').forEach((n) => n.remove());
    for (const d of data) {
      const el = document.createElement('script');
      el.type = 'application/ld+json';
      el.dataset.seoLd = '1';
      el.textContent = safeJsonLd(d);
      document.head.appendChild(el);
    }
  }, [pathname, page, s]);

  // Google Analytics only loads when the owner has entered a valid Measurement ID, and never on admin screens.
  useEffect(() => {
    if (!isGaId(s.gaId) || pathname.startsWith('/admin')) return;
    const w = window as unknown as { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void; __gaLoaded?: string };
    if (w.__gaLoaded === s.gaId) {
      w.gtag?.('event', 'page_view', { page_path: pathname });
      return;
    }
    w.__gaLoaded = s.gaId;
    w.dataLayer = w.dataLayer ?? [];
    w.gtag = function () { (w.dataLayer as unknown[]).push(arguments); };
    w.gtag('js', new Date());
    w.gtag('config', s.gaId, { anonymize_ip: true });
    const el = document.createElement('script');
    el.async = true;
    el.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(s.gaId)}`;
    document.head.appendChild(el);
  }, [s.gaId, pathname]);

  return null;
}
