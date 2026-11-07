# Launch Checklist — VAYORA FASHION

Tick each line in order. Nothing here is automatic.

## 1. Database (Supabase → SQL Editor, each file once, in order)
- [ ] Simplest: run `apply_phase7_to_11.sql` once (safe to repeat). Or one by one: `apply_phase7.sql`, `apply_phase8.sql`, `apply_phase9.sql`, `apply_phase10.sql`, `apply_phase11.sql` (skip any already applied; see SUPABASE_SETUP.md)
- [ ] Authentication → Providers → Email: turn on "Confirm email"
- [ ] Authentication → SMTP: set a real sender (Supabase's built-in email is rate-limited and not for production)
- [ ] Authentication → URL Configuration: Site URL and redirect URLs = your live domain
- [ ] Edge Functions → place-order is deployed with the latest `deploy-single-file.ts` (needed for emails); secret `ALLOWED_ORIGINS` lists your live domain(s) only

- [ ] Optional: order emails (ADMIN_GUIDE.md, "Order emails")

## 2. First super admin
- [ ] Register on the site with your own email, confirm it
- [ ] Give yourself `super_admin` once (SUPABASE_SETUP.md, the `user_roles` insert with your email), then manage staff from Admin Users

## 3. Business setup (Admin)
- [ ] Website Settings: store name, phone, WhatsApp, email, address, social links
- [ ] Website Pages: replace every "DRAFT" text (About, Privacy, Terms, Returns, Shipping, FAQ) with reviewed text
- [ ] Delivery Zones: real charges, activate
- [ ] Payment Settings: real bKash/Nagad/Upay numbers, enable the ones you use
- [ ] Checkout & Advance Payment: decide whether the delivery charge is paid in advance
- [ ] Categories, Products (photos, variants, stock), Hero Slider, Banners, Homepage Builder
- [ ] SEO Settings: description, share image (1200x630), optional Analytics ID and Search Console code

## 4. Test like a customer (use real phone numbers you control)
- [ ] Register, log in, reset password email arrives
- [ ] Add to cart, apply a coupon, order with Cash on Delivery
- [ ] Order with advance payment: submit a Transaction ID, verify it in Payment Verification
- [ ] Move the order through every status; check stock goes down and, after cancelling another order, comes back
- [ ] Track the order from /track-order; cancel a fresh order from My Orders
- [ ] Contact form and newsletter sign-up appear in admin
- [ ] Paste a product link into WhatsApp and the Facebook Sharing Debugger: photo, name and price show
- [ ] Phone check: homepage, product page, cart and checkout at 360 px width

## 5. Hosting (Cloudflare)
- [ ] Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL` (your final domain), `NODE_VERSION=22`; redeploy after changing
- [ ] Custom domain connected, HTTPS on; update `VITE_SITE_URL`, Supabase URLs and `ALLOWED_ORIGINS` to match
- [ ] Security → Bot Fight Mode on
- [ ] Open `/sitemap.xml` and `/robots.txt`; submit the sitemap in Google Search Console

## 6. Safety
- [ ] Never share or commit the Supabase service key or any `.env` file
- [ ] Turn on Supabase backups (paid plan: daily; free plan: export data regularly)
- [ ] Activity Logs checked after your first day of staff use
