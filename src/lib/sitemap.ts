// Sitemap and robots.txt text. Pure functions so they are unit-tested; functions/*.ts serve them on Cloudflare Pages.
export interface SitemapEntry { path: string; lastmod?: string | null; priority?: number }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const day = (s?: string | null) => (s && !Number.isNaN(Date.parse(s)) ? new Date(s).toISOString().slice(0, 10) : '');

export const STATIC_PATHS: SitemapEntry[] = [
  { path: '/', priority: 1 }, { path: '/shop', priority: 0.9 }, { path: '/women', priority: 0.8 }, { path: '/men', priority: 0.8 },
  { path: '/about', priority: 0.4 }, { path: '/contact', priority: 0.4 }, { path: '/faq', priority: 0.4 },
  { path: '/privacy-policy', priority: 0.2 }, { path: '/terms-and-conditions', priority: 0.2 },
  { path: '/return-refund-policy', priority: 0.2 }, { path: '/shipping-policy', priority: 0.2 },
];

export function buildSitemap(origin: string, entries: readonly SitemapEntry[]): string {
  const base = origin.replace(/\/+$/, '');
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const e of entries) {
    if (!e.path.startsWith('/') || seen.has(e.path)) continue;
    seen.add(e.path);
    const lm = day(e.lastmod);
    urls.push(`  <url><loc>${esc(base + (e.path === '/' ? '/' : e.path))}</loc>${lm ? `<lastmod>${lm}</lastmod>` : ''}${e.priority ? `<priority>${e.priority}</priority>` : ''}</url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

/** Blog pages for the sitemap: the index only when at least one post is published. */
export const blogEntries = (posts: { slug: unknown; published_at?: string | null; created_at?: string | null }[]): SitemapEntry[] => {
  const ok = posts.filter((p): p is typeof p & { slug: string } => slugOk(p.slug));
  return ok.length ? [{ path: '/blog', priority: 0.5 }, ...ok.map((p) => ({ path: `/blog/${p.slug}`, lastmod: p.published_at ?? p.created_at, priority: 0.5 }))] : [];
};

export const slugOk = (s: unknown): s is string => typeof s === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);

export function robotsTxt(origin: string): string {
  return ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /account', 'Disallow: /cart', 'Disallow: /checkout', 'Disallow: /order-confirmation', 'Disallow: /track-order', 'Disallow: /search', '', `Sitemap: ${origin.replace(/\/+$/, '')}/sitemap.xml`, ''].join('\n');
}
