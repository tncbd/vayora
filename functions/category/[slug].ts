// /category/:slug — link preview with the category name, text and picture.
import { pageShareMeta } from '../../src/lib/shareMeta';
import { slugOk } from '../../src/lib/sitemap';
import { appPage, origin, rest, siteDefaults, withShareTags, type Env } from '../_share';

export const onRequestGet = async ({ request, env, params }: { request: Request; env: Env; params: { slug?: string } }) => {
  const slug = params.slug;
  const o = origin(env, request);
  const rows = slugOk(slug) ? await rest(env, `categories?select=name,description,image_url,seo_title,seo_description&slug=eq.${slug}&limit=1`) : [];
  const c = rows[0] as { name: string; description?: string; image_url?: string; seo_title?: string; seo_description?: string } | undefined;
  if (!c) return appPage(env, request);
  const d = await siteDefaults(env, o);
  return withShareTags(env, request, pageShareMeta({ path: `/category/${slug}`, title: c.seo_title || c.name, description: c.seo_description || c.description || `Shop ${c.name}. Cash on Delivery across Bangladesh.`, image: c.image_url }, o, d), d.storeName);
};
