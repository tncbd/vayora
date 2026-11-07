# Changelog

## 1.2.0 — Guest screenshots and order emails (2026-11-07)
- Guests can attach a payment screenshot (private storage, only under their own order token, 3 files per order, JPG/PNG/WebP up to 3 MB, only while payment is awaited).
- Optional order confirmation email through Resend: sent only when `RESEND_API_KEY` and `EMAIL_FROM` secrets are set; otherwise nothing changes.
- `apply_phase11.sql`; the `place-order` function must be redeployed (`deploy-single-file.ts`).

## 1.1.0 — Blog and link previews everywhere (2026-11-07)
- Blog: admin screen (draft, publish, schedule, cover photo), `/blog`, `/blog/:slug`, sitemap entries, footer link once a post is published.
- Facebook/WhatsApp previews now also work for shop, women, men, categories, collections, blog posts, contact and the About/policy/FAQ pages. `public/_routes.json` limits the Pages Functions to these paths only.

## 1.0.1 — Link previews (2026-11-07)
- Facebook, WhatsApp and Telegram previews now show the product's name, photo and price: Cloudflare Pages Functions (`/product/:slug` and `/`) write the tags into the HTML, because those apps do not run JavaScript.
- Share buttons (WhatsApp, Facebook, Copy link) on every product page.

## 1.0.0 — Phase 10 (2026-11-07)
- Security audit test suite; anonymous table access reduced to public catalogue/content; trigger functions closed to RPC.
- Throttling for order tracking and coupon guessing.
- Content-Security-Policy and stricter headers.
- LAUNCH_CHECKLIST.md and final security notes.
- `apply_phase10.sql` for projects that already have Phase 9.

## 0.9.0 — Phase 9 (2026-11-07)
- Route-level code splitting and vendor chunks (first-load app code 832 KB to 80 KB).
- Dynamic SEO tags, structured data, canonical URLs, noindex for private pages, `/sitemap.xml` and `/robots.txt` functions.
- SEO Settings screen and optional Google Analytics.
- Reports screen backed by `admin_sales_report()` with CSV export.
- `apply_phase9.sql` for projects that already have Phase 8.

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
