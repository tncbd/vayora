# Changelog

## 0.2.0 — Phase 2 (2026-11-04)
- Added 6 SQL migrations: 33 tables, RLS everywhere, storage buckets/policies, baseline seed.
- Payment verification only via `verify_payment()`; stock functions service-role only; last super admin protected.
- Added Supabase client, setup/schema docs, `npm run db:bundle`.
- Added 36 tests (database/RLS + client). Total 75.

## 0.1.0 - Phase 1 (2026-11-03)
- Vite + React + TypeScript + Tailwind scaffold; brand design tokens.
- Layout: announcement bar, header with search overlay, mobile drawer, footer.
- Homepage sections; listing, search, FAQ, About, Contact, policy pages, 404.
- Scaffold pages (honestly labelled) for cart, checkout, account, orders.
- Tests: format utilities and route smoke tests (39 passing).
