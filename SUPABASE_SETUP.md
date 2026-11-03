# Supabase Setup

**Status: not yet implemented (Phase 2).**

You will need to provide (never commit these):
1. Supabase project URL and anon key -> `.env.local` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
2. Service role key -> Edge Function secrets only, never frontend or Netlify build env.

Initial Super Admin provisioning steps will be documented in Phase 3. Public registration will never grant admin roles.
