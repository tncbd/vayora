# Admin Guide

Sign in at `/login`, then open `/admin`. Each role sees only its own sections; the database enforces the same limits.

## Ready now (Phase 4)
| Screen | Who | What you can do |
|---|---|---|
| **Products** `/admin/products` | Super Admin, Admin, Product Manager | Search by name/SKU, filter by status and category, add, edit, duplicate (copies as a draft), delete, bulk activate/deactivate/feature/delete, export CSV |
| **Product page** | same | Name, slug, SKU, descriptions, category/subcategory, gender, regular/selling price (or discount %), status, flags, collections, SEO |
| **Photos** (on the product page) | same | Upload several (JPG/PNG/WebP/AVIF, max 5 MB), choose the main photo, reorder, alt text, delete |
| **Variants & stock** (on the product page) | same | Generate size x colour variants, each with its own SKU, optional price, active flag, quantity and low-stock level |
| **Categories / Subcategories** `/admin/categories` | same | Unlimited nested categories; hide or delete (blocked while in use) |
| **Inventory** `/admin/inventory` | same | Stock for every variant, low/out-of-stock filters, quick quantity edits |

Notes
- Only products with status **Active** show on the storefront. A product with no variants in stock shows as unavailable.
- "Reserved" stock is held for open orders; you cannot set quantity below it.
- Flags (New Arrival, Best Seller, Trending, Featured) automatically place a product in those collections.
- Product Variants and Subcategories are managed inside the Products and Categories screens.

## Not built yet
Orders, payment verification, customers, delivery zones, coupons, banners, homepage builder, reviews moderation, settings, reports (Phases 5-9). They are listed on the admin overview with their phase.

## Roles
| Role | Area |
|---|---|
| Super Admin | Everything, including admin users and roles |
| Admin | All content, catalogue, orders, payments, settings (not roles) |
| Order Manager | Orders, customers |
| Product Manager | Products, categories, variants, inventory |
| Payment Manager | Payment verification, payment settings |

Granting a role (Super Admin, until the Phase 8 screen exists):
```sql
insert into public.user_roles (user_id, role)
select id, 'order_manager' from auth.users where email = 'staff@example.com';
```
