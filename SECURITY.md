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

## Planned rules
RLS on every sensitive table; server-side recalculation of prices, discounts, delivery and totals; backend-enforced roles; private `payment-proofs` bucket; audit logs; service role key only in Edge Functions.
