// One-segment pages: /shop /women /men /contact /blog and the editable text pages (about, faq, policies).
// Anything else with one segment (favicon.svg, /cart, /login...) is answered exactly as before.
import { DB_PAGES, FIXED_PAGES, pageShareMeta } from '../src/lib/shareMeta';
import { origin, passThrough, rest, siteDefaults, withShareTags, type Env } from './_share';

export const onRequestGet = async ({ request, env, params }: { request: Request; env: Env; params: { page?: string } }) => {
  const page = params.page ?? '';
  const fixed = Object.prototype.hasOwnProperty.call(FIXED_PAGES, page) ? FIXED_PAGES[page] : null;
  const isDb = (DB_PAGES as readonly string[]).includes(page);
  if (!fixed && !isDb) return passThrough(env, request);
  const o = origin(env, request);
  const d = await siteDefaults(env, o);
  let title = fixed?.title ?? '';
  let description: string | undefined = fixed?.description;
  if (isDb) {
    const r = (await rest(env, `pages?select=title,content,seo_title,seo_description&slug=eq.${page}&limit=1`))[0] as { title: string; content: string; seo_title?: string; seo_description?: string } | undefined;
    if (!r) return passThrough(env, request);
    title = r.seo_title || r.title;
    description = r.seo_description || r.content.replace(/^## /gm, '');
  }
  return withShareTags(env, request, pageShareMeta({ path: `/${page}`, title, description }, o, d), d.storeName);
};
