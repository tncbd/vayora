// /product/:slug — same page as everywhere, but with this product's name, photo and price in the link preview.
import { productShareMeta } from '../../src/lib/shareMeta';
import { slugOk } from '../../src/lib/sitemap';
import { appPage, origin, rest, siteDefaults, withShareTags, type Env } from '../_share';

export const onRequestGet = async ({ request, env, params }: { request: Request; env: Env; params: { slug?: string } }) => {
  const slug = params.slug;
  const o = origin(env, request);
  const d = await siteDefaults(env, o);
  const rows = slugOk(slug)
    ? await rest(env, `storefront_products?select=slug,name,short_description,description,seo_title,seo_description,selling_price,image_url&slug=eq.${slug}&limit=1`)
    : [];
  const row = rows[0] as Parameters<typeof productShareMeta>[0] | undefined;
  if (!row) return appPage(env, request); // the app shows its own "not found"
  return withShareTags(env, request, productShareMeta(row, o, d), d.storeName);
};
