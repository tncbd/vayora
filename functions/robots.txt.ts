import { robotsTxt } from '../src/lib/sitemap';

export const onRequestGet = async ({ request, env }: { request: Request; env: { VITE_SITE_URL?: string } }) =>
  new Response(robotsTxt(env.VITE_SITE_URL || new URL(request.url).origin), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
