# Database Schema

Migrations (apply in order, once): `supabase/migrations/`
1. `..0001_foundation.sql` — enums, `set_updated_at()`
2. `..0002_core_tables.sql` — 33 tables, constraints, indexes, updated_at triggers
3. `..0003_functions_triggers.sql` — roles helpers, sign-up profile, order numbers, order history, payment verification, stock functions
4. `..0004_rls.sql` — row level security on every public table
5. `..0005_storage.sql` — buckets and storage policies
6. `..0006_seed.sql` — categories, collections, settings, homepage layout, draft pages (no products, prices, numbers)
7. `20261104000001_storefront_views.sql` — read-only views `storefront_products` (active products with main image, sizes, colours, in-stock flag, rating, collection slugs) and `public_reviews` (approved reviews with first name only); `variant_availability` made read-only
8. `20261104000007_catalog_functions.sql` — `list_products()` (search, filters, sorting and pagination in the database, so the catalogue scales), `catalog_facets()` (available sizes, colours, price range), `duplicate_product()`, `set_main_image()`
9. `20261105000001_checkout.sql` — `quote_order()` (public, read-only: prices a cart from database prices, applies coupon and delivery zone), `place_order()` (service role only: re-prices, validates, reserves stock and writes order, items and coupon usage in one transaction), internal `_quote()`, and `orders.idempotency_key` (stops double orders)

## Tables
**Identity:** profiles, user_roles, addresses
**Catalogue:** categories (self-referencing: unlimited subcategories), collections, products, product_collections, product_images, product_variants (size/colour/optional price/active), inventory (quantity, reserved, low-stock threshold)
**Shopping:** carts, cart_items, wishlists, wishlist_items
**Commerce:** orders, order_items (price/name snapshots), payments, payment_methods, order_status_history, delivery_zones, coupons, coupon_usages
**Content:** banners, hero_slides, homepage_sections, pages, menus, site_settings, blog_posts, reviews, newsletter_subscribers, contact_messages
**Audit:** admin_activity_logs
**View:** `variant_availability` (storefront sees only in-stock flag and a quantity capped at 10)

## Key rules enforced by the database
- Money is `numeric(12,2)` BDT. Bangladeshi mobiles must match `01[3-9]XXXXXXXX`.
- `selling_price <= regular_price`; slugs are lowercase-hyphenated and unique.
- Order arithmetic is a CHECK: `total = subtotal - discount + delivery`; `advance_amount` is `0` or exactly the delivery charge; `cod_amount = total - advance_amount`.
  - Advance ON: ৳1,200 + ৳80 -> advance 80, COD 1,200. Advance OFF: advance 0, COD 1,280.
- Order numbers look like `VAY-261103-00001` (Asia/Dhaka date). Every status change is written to `order_status_history`.
- Signed-in clients cannot change an order's money, owner, number or coupon, even with order-manager access.
- A payment can only become `verified`/`rejected` through `verify_payment()` (payment manager, admin, super admin). Rejection needs a reason; it is logged in `admin_activity_logs`.
- A transaction ID can be used once per method while live; a rejected payment frees it for resubmission.
- Stock: `reserve_stock / release_stock / commit_stock` are callable only by the service role (Edge Functions); `reserved <= quantity` and quantity never goes negative, so overselling is impossible.
- The last `super_admin` cannot be removed.

## Access summary (RLS)
| Who | Can |
|---|---|
| Anonymous | Read active catalogue, enabled payment methods, active zones, published content, approved reviews, public settings. **No writes.** |
| Customer | Own profile, addresses, cart, wishlist, orders, payments, status history; write pending reviews |
| Product manager | Catalogue, variants, inventory, product images |
| Order manager | View/update orders (status, courier, tracking, notes); never money |
| Payment manager | View orders/payments; verify or reject payments; edit payment methods |
| Admin | All of the above plus content, zones, coupons, reviews, newsletter, logs |
| Super admin | Everything, plus granting/revoking roles |

Orders, payments, newsletter signups and contact messages are created only by Edge Functions (Phases 5-8); there is intentionally no public insert policy.

## Storage
public: product-images, banners, site-assets, review-images · private: payment-proofs (owner + payment staff read only; customers cannot edit or delete submitted proofs).

## Migration 12 (Phase 8): content and admin functions
`submit_contact_message`, `subscribe_newsletter` (anon + authenticated), `admin_dashboard_stats`, `admin_list_customers`, `admin_list_staff`, `admin_find_user` (staff, role-checked inside), and `audit_content_change` trigger on banners, hero_slides, homepage_sections, pages, menus, site_settings, coupons, delivery_zones, payment_methods, categories and user_roles. No tables or columns changed.

## Migration 13 (Phase 9): reports
`admin_sales_report(from date, to date)` returns summary, daily, by-status, products, districts and coupons as JSON for Super Admin / Admin. Read-only; no tables changed.
