// Cloudflare Pages Function: /sitemap.xml built from the live catalogue (public data only, read with the anon key).
import { STATIC_PATHS, buildSitemap, slugOk, type SitemapEntry } from '../src/lib/sitemap';

interface Env { VITE_SUPABASE_URL?: string; VITE_SUPABASE_ANON_KEY?: string; VITE_SITE_URL?: string }

async function rows(env: Env, table: string, select: string): Promise<Record<string, string>[]> {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${table}?select=${select}&limit=5000`, {
    headers: { apikey: env.VITE_SUPABASE_ANON_KEY ?? '', Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY ?? ''}` },
  });
  return res.ok ? ((await res.json()) as Record<string, string>[]) : [];
}

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  const origin = (env.VITE_SITE_URL || new URL(request.url).origin).replace(/\/+$/, '');
  const entries: SitemapEntry[] = [...STATIC_PATHS];
  if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY) {
    try {
      const [products, categories, collections] = await Promise.all([
        rows(env, 'storefront_products', 'slug,created_at'),
        rows(env, 'categories', 'slug'),
        rows(env, 'collections', 'slug'),
      ]);
      for (const p of products) if (slugOk(p.slug)) entries.push({ path: `/product/${p.slug}`, lastmod: p.created_at, priority: 0.7 });
      for (const c of categories) if (slugOk(c.slug)) entries.push({ path: `/category/${c.slug}`, priority: 0.6 });
      for (const c of collections) if (slugOk(c.slug)) entries.push({ path: `/collections/${c.slug}`, priority: 0.6 });
    } catch { /* serve the static part only */ }
  }
  return new Response(buildSitemap(origin, entries), { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};
