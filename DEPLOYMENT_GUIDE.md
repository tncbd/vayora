# Deployment Guide (Netlify)

`netlify.toml` is prepared: build `npm run build`, publish `dist`, Node 22, SPA redirect, security headers.

Steps (when you authorize deployment):
1. Push the repository to GitHub.
2. Netlify -> Add site -> Import from Git.
3. Set env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL` (from Phase 2).
4. Never add `SUPABASE_SERVICE_ROLE_KEY` to Netlify; it belongs in Supabase Edge Function secrets.

Nothing has been deployed.
