// /blog/:slug — an article's cover photo, title and summary in the link preview.
import { pageShareMeta } from '../../src/lib/shareMeta';
import { slugOk } from '../../src/lib/sitemap';
import { appPage, origin, rest, siteDefaults, withShareTags, type Env } from '../_share';

export const onRequestGet = async ({ request, env, params }: { request: Request; env: Env; params: { slug?: string } }) => {
  const slug = params.slug;
  const o = origin(env, request);
  const rows = slugOk(slug) ? await rest(env, `blog_posts?select=title,excerpt,content,cover_image_url,seo_title,seo_description&slug=eq.${slug}&limit=1`) : [];
  const p = rows[0] as { title: string; excerpt?: string; content?: string; cover_image_url?: string; seo_title?: string; seo_description?: string } | undefined;
  if (!p) return appPage(env, request);
  const d = await siteDefaults(env, o);
  return withShareTags(env, request, pageShareMeta({ path: `/blog/${slug}`, title: p.seo_title || p.title, description: p.seo_description || p.excerpt || (p.content ?? '').replace(/^## /gm, ''), image: p.cover_image_url, type: 'article' }, o, d), d.storeName);
};
