# Deployment Guide (Netlify)

`netlify.toml` is prepared: build `npm run build`, publish `dist`, Node 22, SPA redirect, security headers.

Steps (when you authorize deployment):
1. Push the repository to GitHub.
2. Netlify -> Add site -> Import from Git.
3. Set env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL` (from Phase 2).
4. Never add `SUPABASE_SERVICE_ROLE_KEY` to Netlify; it belongs in Supabase Edge Function secrets.

Nothing has been deployed.

## Cloudflare Pages (alternative to Netlify)
`public/_redirects` (SPA fallback) and `public/_headers` (security headers) are included, and `.node-version` pins Node 22.
1. Cloudflare dashboard -> Workers & Pages -> Create -> Pages -> Connect to Git -> choose the repository, branch `main`.
2. Framework preset: None. Build command `npm run build`. Output directory `dist`.
3. Environment variables (Production): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL` (your `https://....pages.dev` address, later your own domain), `NODE_VERSION=22`.
4. Save and Deploy. Then add the final address to the Edge Function's allowed origins: `supabase secrets set ALLOWED_ORIGINS=http://localhost:5173,https://YOUR-SITE.pages.dev`.
5. Supabase -> Authentication -> URL Configuration: set Site URL and add `https://YOUR-SITE.pages.dev/**` to Redirect URLs.
Never add `SUPABASE_SERVICE_ROLE_KEY` to Cloudflare.
