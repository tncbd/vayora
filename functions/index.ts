// "/" — homepage link preview uses the store name, description and share image set in SEO Settings.
import { siteShareMeta } from '../src/lib/shareMeta';
import { origin, siteDefaults, withShareTags, type Env } from './_share';

export const onRequestGet = async ({ request, env }: { request: Request; env: Env }) => {
  const o = origin(env, request);
  const d = await siteDefaults(env, o);
  return withShareTags(env, request, siteShareMeta(o, '/', d), d.storeName);
};
