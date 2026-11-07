// Link-preview tags for crawlers (Facebook, WhatsApp, Telegram, Google). Those bots do not run JavaScript,
// so Cloudflare Pages Functions write these tags into the HTML before it is sent. Pure functions: unit-tested.
import { absoluteUrl, canonicalUrl, clip } from './seo';

export interface ShareMeta { title: string; description: string; image: string; url: string; type: 'website' | 'product' | 'article'; priceAmount?: string }

export const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

interface ProductRow { slug: string; name: string; short_description?: string | null; description?: string | null; seo_title?: string | null; seo_description?: string | null; selling_price?: number | string | null; image_url?: string | null }
interface Defaults { storeName: string; description: string; image: string }

export function productShareMeta(p: ProductRow, origin: string, d: Defaults): ShareMeta {
  const price = Number(p.selling_price);
  return {
    title: `${(p.seo_title || p.name).trim()} — ${d.storeName}`,
    description: clip(p.seo_description || p.short_description || p.description, 200) || d.description,
    image: absoluteUrl(origin, p.image_url) || d.image,
    url: canonicalUrl(origin, `/product/${p.slug}`),
    type: 'product',
    ...(Number.isFinite(price) && price > 0 ? { priceAmount: price.toFixed(2) } : {}),
  };
}

export const siteShareMeta = (origin: string, path: string, d: Defaults & { tagline: string }): ShareMeta => ({
  title: `${d.storeName} — ${d.tagline.split('.')[0] || 'Fashion'}`,
  description: d.description,
  image: d.image,
  url: canonicalUrl(origin, path),
  type: 'website',
});

/** The tags to put in <head>. Every value is attribute-escaped. */
export function shareTags(m: ShareMeta, storeName: string): string {
  const t = (attr: 'name' | 'property', k: string, v: string | undefined) => (v ? `<meta ${attr}="${k}" content="${escAttr(v)}">` : '');
  return [
    `<link rel="canonical" href="${escAttr(m.url)}">`,
    t('name', 'description', m.description),
    t('property', 'og:site_name', storeName),
    t('property', 'og:type', m.type),
    t('property', 'og:title', m.title),
    t('property', 'og:description', m.description),
    t('property', 'og:url', m.url),
    t('property', 'og:image', m.image),
    t('property', 'og:image:alt', m.image ? m.title : ''),
    t('property', 'og:locale', 'en_BD'),
    t('property', 'product:price:amount', m.priceAmount),
    t('property', 'product:price:currency', m.priceAmount ? 'BDT' : ''),
    t('name', 'twitter:card', m.image ? 'summary_large_image' : 'summary'),
    t('name', 'twitter:title', m.title),
    t('name', 'twitter:description', m.description),
    t('name', 'twitter:image', m.image),
  ].filter(Boolean).join('\n');
}

/** Share links for the product page buttons. Text and URL are encoded, so a product name can never alter the link. */
export function shareLinks(url: string, text: string) {
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  };
}

/** Any other public page: shop, a category, a collection, a blog post, a policy page. */
export function pageShareMeta(
  p: { path: string; title: string; description?: string | null; image?: string | null; type?: ShareMeta['type'] },
  origin: string,
  d: Defaults,
): ShareMeta {
  return {
    title: `${p.title.trim()} — ${d.storeName}`,
    description: clip(p.description, 200) || d.description,
    image: absoluteUrl(origin, p.image) || d.image,
    url: canonicalUrl(origin, p.path),
    type: p.type ?? 'website',
  };
}

/** Fixed pages that exist even with an empty database. */
export const FIXED_PAGES: Record<string, { title: string; description: string }> = {
  shop: { title: 'Shop All', description: "Browse all men's and women's fashion. Cash on Delivery across Bangladesh." },
  women: { title: "Women's Fashion", description: 'Saree, three piece, kurti, tops and more. Cash on Delivery across Bangladesh.' },
  men: { title: "Men's Fashion", description: 'T-shirts, polo, panjabi, jeans and more. Cash on Delivery across Bangladesh.' },
  contact: { title: 'Contact Us', description: 'Questions about an order or a product? Send us a message.' },
  blog: { title: 'Blog', description: 'Style notes, guides and news.' },
};
/** Pages whose title and text are edited in Admin > Website Pages. */
export const DB_PAGES = ['about', 'faq', 'privacy-policy', 'terms-and-conditions', 'return-refund-policy', 'shipping-policy'] as const;
