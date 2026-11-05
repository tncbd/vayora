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

## 2. Apply the database
Run SQL in Supabase -> SQL Editor -> New query -> paste -> Run. **Never run a file twice.**

| Your project | Run this file |
|---|---|
| Brand new, empty project | `supabase/apply_all.sql` (everything) |
| Already has Phases 2-3 applied (migrations `20261103*`) | `supabase/apply_phase4.sql` only (adds the storefront views and catalogue functions; changes no data) |

Both are generated from `supabase/migrations/` with `npm run db:bundle`. Never edit an applied migration; add a new one. Alternative: Supabase CLI (`supabase link --project-ref wmtzqwwtdsmlproxonsy`, then `supabase db push`).

Migration status of the live project: `20261103000001`-`000006` applied. `20261104000001` and `20261104000007` are new in Phase 4 and must be applied (file above).

### Optional demo products
`supabase/demo/demo_products.sql` adds 8 clearly-marked demo products (SKUs start `DEMO-`) so you can see the storefront and admin working. `supabase/demo/remove_demo_products.sql` removes them. Invented names and prices: never launch with them.

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
- **URL Configuration:** Site URL = your production URL (use `http://localhost:5173` until deployed). Add Redirect URLs: `http://localhost:5173/**` and, later, your Netlify URL `/**`. Password-reset and email-confirm links only work for listed URLs.
- Email confirmation: keep ON for production. Supabase's built-in email sender is heavily rate-limited; configure your own SMTP before launch.
- Users: Authentication -> Users shows registered customers. Role changes are done only through SQL by a Super Admin (Phase 8 adds a screen).

## 5. Storage
Buckets are created by the migration: `product-images`, `banners`, `site-assets`, `review-images` (public) and `payment-proofs` (private). File size and type limits are set per bucket.

## 6. Edge Functions (Phases 5-6)
Order creation, coupon validation, price/delivery calculation, payment submission and rate limiting run in Edge Functions using the service role key (provided automatically inside Supabase functions; never copied elsewhere).

## Verification status
The migrations and RLS policies are tested against a real PostgreSQL engine (PGlite) with Supabase stand-ins: `npm test`. They have **not yet been run against your live project** — that happens when you apply them in step 2.
