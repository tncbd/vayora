// Search-engine metadata helpers. Pure functions (tested); useSeo.ts / HeadManager apply them to <head>.
import type { ProductDetail } from '@/types';

/** Pages that must not appear in search results (private, per-visitor or thin). */
const PRIVATE_PREFIXES = ['/admin', '/account', '/cart', '/checkout', '/order-confirmation', '/track-order', '/login', '/register', '/forgot-password', '/reset-password', '/search'];

export const isPrivatePath = (pathname: string) => PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export const siteOrigin = (): string => {
  const env = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim().replace(/\/+$/, '');
  if (env) return env;
  return typeof window !== 'undefined' ? window.location.origin : '';
};

/** Absolute canonical URL: no query string, no hash, no trailing slash (except the homepage). */
export function canonicalUrl(origin: string, pathname: string): string {
  const path = pathname.replace(/\/+$/, '');
  return `${origin.replace(/\/+$/, '')}${path || '/'}`;
}

/** Plain text, one line, cut on a word boundary. */
export function clip(text: string | null | undefined, max = 160): string {
  const t = (text ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), Math.floor(max / 2))).trim()}…`;
}

export const absoluteUrl = (origin: string, url: string | null | undefined): string => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return url.startsWith('/') ? `${origin}${url}` : '';
};

export interface PageSeo {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'product' | 'article';
  noindex?: boolean;
  jsonLd?: object[];
}

export function productJsonLd(p: ProductDetail, origin: string, storeName: string): object {
  const images = p.images.map((i) => absoluteUrl(origin, i.url)).filter(Boolean);
  const prices = [p.sellingPrice, ...p.variants.map((v) => v.price ?? p.sellingPrice)];
  const inStock = p.variants.some((v) => v.inStock && v.availableQty > 0);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    sku: p.sku,
    description: clip(p.seoDescription || p.shortDescription || p.description, 300),
    ...(images.length ? { image: images.slice(0, 6) } : {}),
    brand: { '@type': 'Brand', name: storeName },
    offers: {
      '@type': 'Offer',
      url: canonicalUrl(origin, `/product/${p.slug}`),
      priceCurrency: 'BDT',
      price: Math.min(...prices).toFixed(2),
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };
}

export const organizationJsonLd = (origin: string, name: string, logo: string, sameAs: string[]): object => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name,
  url: origin,
  ...(logo ? { logo } : {}),
  ...(sameAs.length ? { sameAs } : {}),
});

export const breadcrumbJsonLd = (origin: string, items: { name: string; path: string }[]): object => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: canonicalUrl(origin, it.path) })),
});

/** JSON for a <script type="application/ld+json">: "<" is escaped so content can never close the tag. */
export const safeJsonLd = (data: object): string => JSON.stringify(data).replace(/</g, '\\u003c');

export const isGaId = (v: string) => /^G-[A-Z0-9]{6,12}$/.test(v);
