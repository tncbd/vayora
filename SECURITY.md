# Security

## Current (Phase 1)
- No backend, no auth, no secrets in the repo; `.env*` git-ignored (only `.env.example` tracked).
- `npm audit`: 0 vulnerabilities (zod 4, react-router 7, vite 7 chosen to clear advisories).
- Security headers set in `netlify.toml`.
- Newsletter form fails honestly instead of faking a save.

## Database security (Phase 2, tested on PostgreSQL; not yet on the live project)
- RLS enabled on every public table; anonymous visitors have no write access anywhere.
- Roles enforced in the database; only a Super Admin can grant roles; last Super Admin protected.
- Order money fields immutable from the browser; payments verifiable only via `verify_payment()` with audit log.
- Stock functions callable only by the service role. Payment proofs bucket is private.
- All SECURITY DEFINER functions pin `search_path`.

## Authentication (Phase 3)
- Passwords handled only by Supabase Auth; minimum 8 characters with upper, lower, number.
- Admin roles come only from the `user_roles` table; registration never grants a role.
- Admin UI hiding is a convenience only; the database (RLS) enforces permissions.
- Post-login redirects restricted to same-site paths. Password reset never reveals whether an email exists.
- Rate limiting for sign-in/reset comes from Supabase Auth; review limits in the dashboard before launch.

## Catalogue (Phase 4)
- Storefront reads only ACTIVE products through read-only views/functions; draft products, exact stock and reservations are never exposed to visitors.
- Views grant SELECT only (all write privileges revoked; verified by test).
- Search/filter input is sanitised before reaching the database; admin CSV export neutralises spreadsheet formula injection.
- Admin catalogue writes run as the signed-in staff member, so row-level security (not the UI) decides what is allowed.
- Photo uploads are type- and size-checked in the browser and by the storage bucket.

## Cart, coupons and orders (Phase 5)
- The browser cart holds only variant ids and quantities. Price, discount, delivery charge, total and stock are decided in the database every time; a tampered cart or request body cannot change money.
- Orders are created only by `place_order()`, executable by the service role alone, called by the `place-order` Edge Function. Customers have no insert access to orders.
- Stock is reserved atomically with the order; a failure rolls everything back (tested). The customer's displayed total is sent as `expected_total`; a mismatch is refused.
- Coupons are not readable by customers; a rejected code gives one generic message. Usage limits are enforced under a row lock.
- Idempotency key per checkout attempt prevents double orders on double-click or retry.
- Edge Function: CORS allow-list, 20 KB body limit, per-IP brake. The brake is per function instance, so it is a soft limit; stronger rate limiting and bot protection are scheduled for Phase 10.
- Remaining by design: coupon codes can be guessed by trial through `quote_order` (Phase 10 adds throttling).

## Manual payments (Phase 6)
- A payment can only become "verified" through `verify_payment()` (role-checked, audit-logged). Customers and the browser cannot change payment status (database trigger; tested).
- Customers prove ownership of an order with its secret tracking token (guests) or by being signed in; the token is never listed or guessable.
- Transaction IDs are unique, so one transaction cannot pay two orders. Resubmissions are capped per order.
- Payment screenshots go to a private bucket, readable only by the owner and payment staff, via short-lived links. Guests cannot upload files.
- Merchant numbers are public by design (customers must see them), only for enabled methods.

## Content and admin (Phase 8)
- Contact form and newsletter sign-up are public RPCs with validation and a per-email/phone hourly limit; sign-up never reveals whether an email exists.
- Admin lists (customers, staff) are role-checked functions; staff lookup is Super Admin only. The last Super Admin cannot be removed (database trigger).
- Admin-entered links are accepted only as /paths or http(s); page text is plain text rendered as text, never HTML.
- Content and role changes are written to the activity log (labels only, not values).
- CSV exports neutralise spreadsheet formulas.

## SEO, analytics and reports (Phase 9)
- `admin_sales_report()` is Super Admin / Admin only (checked inside the function), range-limited to one year.
- Analytics loads only for a validated `G-` ID, never on admin pages; the ID, share image and verification code are validated before use, JSON-LD escapes `<`.
- Sitemap and robots functions read only public data with the anon key; slugs are re-validated before they are written into the XML.
- Private pages carry `noindex` and are disallowed in robots.txt.

## Orders (Phase 7)
- Order status cannot be changed by a direct table update from the browser (trigger); only `set_order_status()` (role-checked, audit-logged), `verify_payment()` and `expire_unpaid_orders()` can, and each keeps stock consistent.
- Tracking needs the order number AND the phone on the order; it returns no address line, email or internal notes. Failed lookups give one generic message.
- Customers can cancel only before confirmation, only their own order (or with its secret token).
- Repeated tracking lookups are throttled (Phase 10, below).

## Final audit and hardening (Phase 10)
Automated by `supabase/tests/audit.test.ts`; a future migration that widens access makes it fail.
- Every public table has row-level security. Every SECURITY DEFINER function pins `search_path`.
- Visitors (anon) may run only an allow-listed set of functions and read only public catalogue/content tables; they have no table privileges on orders, payments, customers, messages, coupons, stock or logs. Signed-in customers cannot call trigger or internal functions.
- Trigger/internal functions (including `generate_order_number`) are no longer callable as RPC.
- Throttling: order tracking 10 tries / 10 min per order number and 30 / 10 min per visitor; coupon codes 60 quotes / 10 min per visitor; contact form 5 / hour; order placement per-IP brake in the Edge Function. Counts live in `rate_limits` (no access for clients). A failed tracking lookup returns `null` rather than raising, because an exception would roll the counter back.
- Browser headers (`public/_headers`): Content-Security-Policy (own scripts, Supabase, Google Analytics only), `frame-ancestors 'none'`, HSTS, nosniff, referrer and permissions policies. Checked in a real browser: no violations.
- `npm audit`: 0 vulnerabilities (production and dev).
- Code review greps: no `dangerouslySetInnerHTML`/`eval`/`innerHTML`; external links use `rel="noopener noreferrer"`; no service key in the browser bundle; only `.env.example` is tracked.
- A regression found by the tests during this phase: re-defining `quote_order` for throttling initially dropped the Phase 6 advance/COD fields; fixed and covered by `payments.test.ts`.

### Known limits (honest list)
- No CAPTCHA or bot challenge. Turn on Cloudflare "Bot Fight Mode" and, if abuse appears, Turnstile on the order and contact forms.
- Order confirmation emails exist but need your own Resend account (optional). No SMS. Password-reset and sign-up emails come from Supabase Auth (set up custom SMTP in Supabase before launch).
- Edge Function still reads the default `SUPABASE_SERVICE_ROLE_KEY`. Supabase is moving projects to new secret keys; switch when your project dashboard says so (the function is the only place that holds it).
- IP for throttling comes from the `x-forwarded-for` header Supabase sets; behind unusual proxies all visitors could share one counter (fail-safe: stricter, not looser).
- Not independently penetration-tested. Do a test order and test sign-ups before real marketing spend.

## Guest screenshots and emails (v1.2)
- Guests upload only to `guest/<secret order token>/<uuid>.<jpg|png|webp>`; a storage policy calls `guest_can_upload_proof()` which checks the token belongs to an order still awaiting its advance payment and caps 3 files per order. `submit_payment` re-checks that the file exists and belongs to the caller's token. Files are private (payment staff and the owner only).
- Emails go out from the Edge Function only; the API key is a function secret, never in the browser or in logs. Addresses are validated (no header-injection characters), the body escapes the customer name and contains no tracking token. A failed email never fails the order.

## Planned rules
RLS on every sensitive table; server-side recalculation of prices, discounts, delivery and totals; backend-enforced roles; private `payment-proofs` bucket; audit logs; service role key only in Edge Functions.
