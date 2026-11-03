# Security

## Current (Phase 1)
- No backend, no auth, no secrets in the repo; `.env*` git-ignored (only `.env.example` tracked).
- `npm audit`: 0 vulnerabilities (zod 4, react-router 7, vite 7 chosen to clear advisories).
- Security headers set in `netlify.toml`.
- Newsletter form fails honestly instead of faking a save.

## Planned rules
RLS on every sensitive table; server-side recalculation of prices, discounts, delivery and totals; backend-enforced roles; private `payment-proofs` bucket; audit logs; service role key only in Edge Functions.
