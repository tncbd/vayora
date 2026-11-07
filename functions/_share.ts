// Shared by the Pages Functions that add link-preview tags to the page HTML.
import { shareTags, type ShareMeta } from '../src/lib/shareMeta';

export interface Env { VITE_SUPABASE_URL?: string; VITE_SUPABASE_ANON_KEY?: string; VITE_SITE_URL?: string; ASSETS: { fetch: (r: Request) => Promise<Response> } }

export async function rest(env: Env, path: string): Promise<Record<string, unknown>[]> {
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) return [];
  try {
    const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` } });
    return res.ok ? ((await res.json()) as Record<string, unknown>[]) : [];
  } catch { return []; }
}

export const origin = (env: Env, req: Request) => (env.VITE_SITE_URL || new URL(req.url).origin).replace(/\/+$/, '');

export async function siteDefaults(env: Env, o: string) {
  const rows = await rest(env, 'site_settings?select=key,value&key=in.(store_name,tagline,seo_description,seo_og_image_url)');
  const m = Object.fromEntries(rows.map((r) => [r.key as string, r.value]));
  const s = (k: string, f: string) => (typeof m[k] === 'string' && (m[k] as string).trim() ? (m[k] as string).trim() : f);
  const img = s('seo_og_image_url', '');
  return {
    storeName: s('store_name', 'VAYORA FASHION'),
    tagline: s('tagline', 'Style for Everyone. Fashion for Every Moment.'),
    description: s('seo_description', "VAYORA FASHION: men's and women's fashion in Bangladesh. Style for Everyone. Fashion for Every Moment. Cash on Delivery."),
    image: /^https?:\/\//.test(img) ? img : '',
    origin: o,
  };
}

/** Returns the normal single-page-app HTML with the share tags swapped in. */
export async function withShareTags(env: Env, req: Request, meta: ShareMeta, storeName: string): Promise<Response> {
  const page = await env.ASSETS.fetch(new Request(new URL('/', req.url).toString(), { headers: req.headers }));
  // HTMLRewriter is provided by the Cloudflare Pages runtime
  const R = (globalThis as unknown as { HTMLRewriter: new () => { on: (s: string, h: object) => unknown; transform: (r: Response) => Response } }).HTMLRewriter;
  const rw = new R() as unknown as { on: (s: string, h: object) => typeof rw; transform: (r: Response) => Response };
  const drop = { element: (e: { remove: () => void }) => e.remove() };
  const out = rw
    .on('title', { element: (e: { setInnerContent: (t: string) => void }) => e.setInnerContent(meta.title) })
    .on('meta[property^="og:"]', drop).on('meta[name^="twitter:"]', drop).on('meta[name="description"]', drop).on('link[rel="canonical"]', drop)
    .on('head', { element: (e: { append: (h: string, o: { html: boolean }) => void }) => e.append(shareTags(meta, storeName), { html: true }) })
    .transform(page);
  const h = new Headers(out.headers);
  h.set('Cache-Control', 'public, max-age=0, must-revalidate'); // page HTML names hashed files: never serve a stale copy after a deploy
  return new Response(out.body, { status: 200, headers: h });
}

/** Not a page we add tags to (an asset, or an app-only route): let Cloudflare answer exactly as it would without us. */
export const passThrough = (env: Env, req: Request) => env.ASSETS.fetch(req);

/** The normal app page, untouched (the app itself shows "not found" for an unknown address). */
export const appPage = (env: Env, req: Request) => env.ASSETS.fetch(new Request(new URL('/', req.url).toString(), { headers: req.headers }));
