# Changelog

## 0.8.0 — Phase 8 (2026-11-07)
- Editable website: settings, hero slider, banners, homepage sections, menus and pages managed in admin.
- Admin dashboard with live numbers; reviews moderation, newsletter export, contact messages, customers, staff roles, activity logs.
- Working Contact form and newsletter sign-up (throttled).
- `apply_phase8.sql` for projects that already have Phase 7.

## 0.7.0 — Phase 7 (2026-11-06)
- Admin order management with a strict status flow, notes, courier/tracking, invoice and packing slip, CSV export.
- Customer My Orders, order timeline, cancel-before-confirmation, public Track Order.
- Order status can change only through `set_order_status()` so stock never drifts from status.
- `apply_phase7.sql` for projects that already have Phase 6.

## 0.6.0 — Phase 6 (2026-11-06)
- Manual advance delivery-charge payment (bKash / Nagad / Upay): customer submits Transaction ID, staff verify; remaining amount is cash on delivery.
- Unpaid advance orders can be cancelled after the payment window, releasing their stock.
- Admin: Delivery Zones, Checkout & Advance Payment settings, Payment Settings, Payment Verification.
- `apply_phase6.sql` for projects that already have Phase 5.

## 0.5.0 — Phase 5 (2026-11-05)
- Cart, checkout (guest or signed-in), order confirmation, Add to Cart / Buy Now, header cart count.
- Server-side pricing: `quote_order()` and `place_order()`; `place-order` Edge Function; stock is reserved at order time; duplicate submissions are ignored.
- Coupons: percentage/fixed, minimum order, max discount, total and per-customer limits, schedule; admin Coupons screen.
- `apply_phase5.sql` for projects that already have Phases 2-4.
- 48 new tests (239 total).

## 0.4.0 — Phase 4 (2026-11-05)
- Storefront reads real data: filters, sorting, pagination, search suggestions, product pages with variants, wishlist, recently viewed, reviews, quick view.
- Database: `storefront_products`/`public_reviews` read-only views, `list_products()`, `catalog_facets()` (migrations 20261104000001/07).
- Admin: products, photos, variants, categories/subcategories, inventory; per-section role guards.
- Sample products removed from the code: an empty store shows no products instead of invented ones.
- `apply_phase4.sql` for projects that already have Phases 2-3.
- 77 new tests (191 total).

## 0.3.0 — Phase 3 (2026-11-04)
- Supabase Auth: sign in, register, forgot/reset password, sign out.
- Customer account: overview, profile, saved addresses (64-district list, BD phone validation).
- Route guards; role-gated `/admin` shell with 27 role-filtered sections.
- Open-redirect-safe post-login redirects; friendly auth error messages; no email enumeration on password reset.
- 39 new tests (114 total).

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
