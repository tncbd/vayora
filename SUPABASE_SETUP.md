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
| Already has Phases 2-3 applied (migrations `20261103*`) | `supabase/apply_phase4.sql`, then `supabase/apply_phase5.sql` (each once, in this order) |
| Already has Phase 4 applied | `supabase/apply_phase5.sql`, then `supabase/apply_phase6.sql` |
| Already has Phase 5 applied | `supabase/apply_phase6.sql`, then `supabase/apply_phase7.sql` |
| Already has Phase 7 applied | `supabase/apply_phase8.sql` only (content admin; adds functions and an audit trigger, changes no data) |
| Already has Phase 6 applied | `supabase/apply_phase7.sql` only (order management and tracking; changes no data) |

Both are generated from `supabase/migrations/` with `npm run db:bundle`. Never edit an applied migration; add a new one. Alternative: Supabase CLI (`supabase link --project-ref wmtzqwwtdsmlproxonsy`, then `supabase db push`).

Migration status of the live project: `20261103000001`-`000006` applied. `20261104000001` and `20261104000007` are new in Phase 4 and must be applied (file above).

### Phase 5: deploy the `place-order` Edge Function
Orders are created only by this function (it uses the service role key, which Supabase injects automatically; you never paste it anywhere).
1. Install the Supabase CLI and log in: `supabase login`
2. From the project folder: `supabase link --project-ref wmtzqwwtdsmlproxonsy`
3. Allow your site address: `supabase secrets set ALLOWED_ORIGINS=http://localhost:5173,https://YOUR-NETLIFY-SITE.netlify.app`
4. Deploy: `supabase functions deploy place-order`
Without step 4 checkout will show "We could not place your order".

### Phase 5: turn delivery on
Use **Admin > Delivery Zones** (Phase 6). Or, with SQL: delivery zones are seeded inactive with a 0 charge, so checkout says "We do not deliver to this district yet" until you set real rates. Edit the numbers, then run once in the SQL Editor:
```sql
update public.delivery_zones set charge = 80,  is_active = true, estimated_days_min = 1, estimated_days_max = 3 where name = 'Inside Dhaka';
update public.delivery_zones set charge = 130, is_active = true, estimated_days_min = 3, estimated_days_max = 5 where name = 'Outside Dhaka';
```
(80 and 130 are examples, not recommendations.) Optional free delivery: `free_delivery_threshold = 3000`.

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
