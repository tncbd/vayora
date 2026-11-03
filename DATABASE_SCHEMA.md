# Database Schema

**Status: not yet implemented (Phase 2).** No tables exist yet. Migrations will live in `supabase/migrations/`.

Planned tables: profiles, user_roles, categories, products, product_images, product_variants, inventory, addresses, carts, cart_items, wishlists, wishlist_items, orders, order_items, payments, payment_methods, delivery_zones, coupons, coupon_usages, banners, hero_slides, homepage_sections, reviews, pages, menus, site_settings, newsletter_subscribers, blog_posts, order_status_history, admin_activity_logs.

Conventions: UUID keys, foreign keys, `numeric(12,2)` for BDT, created_at/updated_at, unique slugs, RLS on all sensitive tables.

TypeScript shapes in `src/types/index.ts` already anticipate these tables.
