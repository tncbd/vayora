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

## Planned rules
RLS on every sensitive table; server-side recalculation of prices, discounts, delivery and totals; backend-enforced roles; private `payment-proofs` bucket; audit logs; service role key only in Edge Functions.
