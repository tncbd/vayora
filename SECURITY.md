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

## Planned rules
RLS on every sensitive table; server-side recalculation of prices, discounts, delivery and totals; backend-enforced roles; private `payment-proofs` bucket; audit logs; service role key only in Edge Functions.
