// /collections/:slug — link preview for New Arrivals, Winter Collection and the other collections.
import { pageShareMeta } from '../../src/lib/shareMeta';
import { slugOk } from '../../src/lib/sitemap';
import { appPage, origin, rest, siteDefaults, withShareTags, type Env } from '../_share';

export const onRequestGet = async ({ request, env, params }: { request: Request; env: Env; params: { slug?: string } }) => {
  const slug = params.slug;
  const o = origin(env, request);
  const rows = slugOk(slug) ? await rest(env, `collections?select=name,description,image_url&slug=eq.${slug}&limit=1`) : [];
  const c = rows[0] as { name: string; description?: string; image_url?: string } | undefined;
  if (!c) return appPage(env, request);
  const d = await siteDefaults(env, o);
  return withShareTags(env, request, pageShareMeta({ path: `/collections/${slug}`, title: c.name, description: c.description || `${c.name}. Cash on Delivery across Bangladesh.`, image: c.image_url }, o, d), d.storeName);
};
