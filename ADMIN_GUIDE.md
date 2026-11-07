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
| **Coupons** `/admin/coupons` | Super Admin, Admin | Percentage or fixed coupons with minimum order, max discount, total and per-customer limits, start/expiry; activate, deactivate, edit. Used coupons cannot be deleted (deactivate instead) |
| **Inventory** `/admin/inventory` | same | Stock for every variant, low/out-of-stock filters, quick quantity edits |

Notes
- Only products with status **Active** show on the storefront. A product with no variants in stock shows as unavailable.
- "Reserved" stock is held for open orders; you cannot set quantity below it.
- Flags (New Arrival, Best Seller, Trending, Featured) automatically place a product in those collections.
- Product Variants and Subcategories are managed inside the Products and Categories screens.

## How orders are priced (Phase 5)
Customers can only choose products, sizes, colours and quantities. The database sets every price, the coupon discount and the delivery charge, and re-checks stock when the order is placed. Stock is reserved on order, so two customers can never buy the last item.
Delivery rates come from Delivery Zones.

## Delivery and advance payment (Phase 6)
| Screen | Who | What |
|---|---|---|
| **Delivery Zones** | Super Admin, Admin | Charge per group of districts, optional free-delivery threshold, delivery days, priority. A warning lists districts no active zone covers (customers there cannot check out) |
| **Checkout & Advance Payment** | Super Admin, Admin | Turn the advance delivery charge on/off, guest checkout, attempts per order, hours to pay |
| **Payment Settings** | Super Admin, Admin, Payment Manager | Your bKash / Nagad / Upay numbers and instructions. A method needs a number before it can be enabled |
| **Payment Verification** | Super Admin, Admin, Payment Manager | Compare each submission with your own bKash/Nagad/Upay account (amount, sender number, Transaction ID), then Verify or Reject with a reason. Verifying confirms the order. "Cancel expired unpaid orders" releases stock held by orders never paid |

How it works: when the advance is on and delivery is not free, the customer places the order, sends the delivery charge to your number, and submits the sender number and Transaction ID. The order waits as "pending payment verification" with stock reserved. Nothing is ever approved automatically. The customer pays the remaining amount in cash on delivery.

## Website content and settings (Phase 8)
- **Dashboard**: today's orders, payments to verify, low stock, new messages. Product managers do not see sales figures.
- **Website Settings**: store name, phone, WhatsApp number (shows a chat button), email, address, social links, announcement bar, footer. Empty fields are simply hidden on the site.
- **Hero Slider / Banners**: upload a photo, add text and a link. Optional start and end dates. With no slides, a simple welcome slide shows.
- **Homepage Builder**: turn sections on or off and change their order and headings.
- **Website Pages**: edit About, policies and FAQ. Use `## ` for headings. Replace every "DRAFT" text before launch.
- **Navigation Menu**: add header links to replace the standard menu; footer headings with links under them.
- **Reviews**: approve or reject. **Newsletter** and **Customers**: view and export CSV. **Contact Messages**: mark read/resolved.
- **Admin Users** (Super Admin): add a role by the person's account email (they must sign up first). **Activity Logs**: who changed what.

## SEO, analytics and reports (Phase 9)
- **SEO Settings**: the default text Google shows, the picture shown when your site is shared, an optional Google Analytics ID (`G-...`) and Search Console code. Leave a field empty to switch it off. Each product and page also has its own search title and description.
- After deploying, open `https://your-site/sitemap.xml`; in Google Search Console add your site and submit that link.
- **Reports**: pick a period (Bangladesh time). Sales exclude cancelled, returned and refunded orders. Export daily sales, best sellers or districts as CSV.

## Blog
Admin > Blog: add a post with a title, address (slug), cover photo, short summary and text (`##` starts a heading). Tick **Published** to show it; set a future **Publish date** to schedule it. The Blog link appears in the footer after the first published post, or add it yourself in Navigation Menu. The cover photo and summary are what Facebook and WhatsApp show when the article link is shared.

## Sharing products on Facebook and WhatsApp
Every product page has Share buttons. A pasted product link shows that product's first photo, name, short description and price. Upload a clear main photo (landscape or square, at least 600 px wide) as the first image. The homepage link uses the Share image from SEO Settings. After you change a photo, Facebook may keep the old preview for a while: paste the link into the Facebook Sharing Debugger and press "Scrape Again". Shop, women, men, categories, collections, blog posts and the About/policy pages also get their own preview (category and collection photos come from their own image field; otherwise the Share image is used).

## Orders (Phase 7)
**Admin > Orders** (Super Admin, Admin, Order Manager). Open an order to see items, customer, address, payment and the full status history.
- Status moves only forward: Pending review > Confirmed > Processing > Shipped > Out for delivery > Delivered (Returned and Refunded after that). Cancelling needs a reason.
- Stock follows the status automatically: cancelling releases it; shipping deducts it for good; a returned order puts stock back.
- Shipping needs a courier company; add the courier tracking number so customers can see it.
- Each status change can carry a note, shown to the customer on their tracking page (untick "show customer" to keep it private). Internal notes are never shown to customers.
- Orders waiting for an advance payment are confirmed by verifying the payment (Payment Verification), not by hand.
- **Print** gives an invoice or packing slip. **Export CSV** downloads the filtered list.
Customers see their orders under My Account, can cancel before you confirm, and anyone can track at /track-order with the order number and phone.

## Not built yet
Orders list and status handling (Phase 7), customers, banners, homepage builder, reviews moderation, settings, reports (Phases 5-9). They are listed on the admin overview with their phase.

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
