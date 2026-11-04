# Supabase Setup

Project URL: `https://wmtzqwwtdsmlproxonsy.supabase.co`

## 1. Environment variables
Create `.env.local` (git-ignored; see `.env.example`):
```
VITE_SUPABASE_URL=https://wmtzqwwtdsmlproxonsy.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key from Project Settings -> API>
VITE_SITE_URL=http://localhost:5173
```
The anon key is public by design; RLS protects the data. **Never** put the service role key in `.env.local`, the frontend, or Netlify.

## 2. Apply the database (first time only, on a fresh project)
Option A — SQL Editor (simplest):
1. Supabase dashboard -> SQL Editor -> New query.
2. Paste the entire contents of `supabase/apply_all.sql` -> Run. It must finish with no error.
   (Regenerate it after any migration change with `npm run db:bundle`.)

Option B — Supabase CLI: `supabase link --project-ref wmtzqwwtdsmlproxonsy` then `supabase db push`.

Run the migrations **once**. They are ordered by filename in `supabase/migrations/`; never edit an applied migration — add a new one.

## 3. Create the first Super Admin (secure, one time)
Public registration never grants admin rights. Do this by hand:
1. Create your account normally (Phase 3 register page, or Dashboard -> Authentication -> Users -> Add user).
2. In SQL Editor run, using your own email:
```sql
insert into public.user_roles (user_id, role)
select id, 'super_admin' from auth.users where email = 'YOUR-EMAIL@example.com';
```
3. Only a Super Admin can grant further roles afterwards. The last Super Admin cannot be removed.

## 4. Auth settings (Dashboard -> Authentication)
- Site URL: your Netlify/production URL; add `http://localhost:5173` to Redirect URLs for development.
- Email confirmation: keep ON for production.

## 5. Storage
Buckets are created by the migration: `product-images`, `banners`, `site-assets`, `review-images` (public) and `payment-proofs` (private). File size and type limits are set per bucket.

## 6. Edge Functions (Phases 5-6)
Order creation, coupon validation, price/delivery calculation, payment submission and rate limiting run in Edge Functions using the service role key (provided automatically inside Supabase functions; never copied elsewhere).

## Verification status
The migrations and RLS policies are tested against a real PostgreSQL engine (PGlite) with Supabase stand-ins: `npm test`. They have **not yet been run against your live project** — that happens when you apply them in step 2.
