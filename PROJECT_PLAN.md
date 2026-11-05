# VAYORA FASHION — Project Plan

**Tagline:** Style for Everyone. Fashion for Every Moment.
**Market:** Bangladesh · **Currency:** BDT (৳) · **Model:** Online fashion retail, Cash on Delivery, optional advance delivery-charge payment (bKash / Nagad / Upay, manually verified).

> Status legend: ⬜ not started · 🟡 in progress · ✅ complete (built, tested) · ⚠️ partial

---

## 1. Starting State (inspected 2026-11-03)

- Working directory was empty: no existing project, no `package.json`, no Git repository.
- Environment: Node v22, npm 10.
- Project created at `vayora-fashion/`, Git initialised on branch `main`. Nothing pushed anywhere.

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS 3, React Router 6, Lucide React, React Hook Form, Zod |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| Hosting | GitHub + Netlify |

## 3. Folder Structure

```
vayora-fashion/
├─ docs/                     # extra documentation
├─ public/                   # static assets, robots.txt, favicon
├─ src/
│  ├─ components/
│  │  ├─ layout/             # AnnouncementBar, Header, MobileNav, Footer, Layout
│  │  ├─ home/               # homepage sections
│  │  ├─ product/            # ProductCard, grids
│  │  └─ ui/                 # Button, Container, SectionHeading, ...
│  ├─ pages/                  # route pages
│  ├─ context/               # (later) auth, cart, wishlist, settings
│  ├─ hooks/
│  ├─ lib/                   # utils, formatters, (later) supabase client
│  ├─ types/
│  ├─ data/                  # Phase 1 placeholder content (replaced by Supabase in Phase 2+)
│  └─ styles/
├─ supabase/
│  ├─ migrations/            # version-controlled SQL (Phase 2)
│  └─ functions/             # Edge Functions (Phase 5+)
├─ .env.example
├─ netlify.toml
└─ *.md                      # README, PROJECT_PLAN, DATABASE_SCHEMA, SUPABASE_SETUP, ADMIN_GUIDE, DEPLOYMENT_GUIDE, SECURITY, CHANGELOG
```

## 4. Design System

- **Colors:** Primary `#171717`, Secondary `#F8F5F0`, Accent `#C6A46A`, White `#FFFFFF`, Text `#292929`, Muted `#777777`.
- **Typography:** Serif display font (Cormorant Garamond) for headings, clean sans (Inter) for body.
- **Principles:** minimalist, editorial, generous spacing, restrained motion, mobile-first.

## 5. Important Phase 1 Note (placeholder content)

The brief requires that all business content be editable from admin and stored in Supabase. Supabase does not exist until Phase 2. In Phase 1:

- Homepage content (hero slides, section titles, sample products, etc.) comes from a single placeholder module `src/data/placeholder.ts`, typed with the **same shapes** the database will use.
- The placeholder is clearly marked and will be **replaced by Supabase queries** in Phases 2–4 and admin editing in Phase 8.
- Placeholder products are **sample data only**, not a real catalogue.
- Interactive elements that need a backend (newsletter, cart, wishlist, account, search results) are either wired to a working local behaviour or routed to a real page; none are dead buttons. Anything not yet functional is listed under "Unfinished" in the phase report.

## 6. Phases

### PHASE 1 — Setup, architecture, design system, homepage & responsive UI  ✅ (pending your approval)
- [x] Vite + React + TS + Tailwind scaffold, stable pinned dependencies
- [x] Brand design tokens, typography, base styles
- [x] Layout: announcement bar, header, desktop nav, mobile nav drawer, footer
- [x] Routing for all 26 public pages (real pages where Phase 1 scope allows, clearly labelled scaffolds otherwise) + 404
- [x] Homepage: hero slider, women's/men's collections, new arrivals, best sellers, trending, winter, promo banners, discount section, featured, reviews, newsletter, social section
- [x] Documentation files + `.env.example` + `.gitignore` + `netlify.toml`
- [x] Production build passes

**Known gaps (by design):** all content is placeholder data; cart/checkout/account/product-detail pages are labelled scaffolds; contact form and newsletter need the backend; no hero/product photos yet.

### PHASE 2 — Supabase configuration, SQL migrations, database, RLS, storage  ✅ (pending your approval; not yet applied to the live project)
- [x] 6 migrations (schema, functions/triggers, RLS, storage, seed)
- [x] 35 automated database/RLS tests on real PostgreSQL (PGlite)
- [x] Supabase client (`src/lib/supabase.ts`), `SUPABASE_SETUP.md`, `DATABASE_SCHEMA.md`
- [ ] **You:** apply `supabase/apply_all.sql` in the SQL Editor and add the anon key to `.env.local`
- [ ] Verify against the live project after you apply it

### PHASE 3 — Authentication, customer profiles, admin authorization  ✅ (pending your approval; live sign-in not yet tested)
- [x] AuthContext (session, roles from `user_roles`), sign in / sign up / sign out / password reset
- [x] Pages: Login, Register, Forgot Password, Reset Password
- [x] Customer account: Overview, Profile, Addresses (add/edit/delete/default)
- [x] Route guards (`RequireAuth`, `RequireStaff`), open-redirect-safe return paths
- [x] `/admin` shell gated by role, sections filtered per role (screens arrive in later phases)
- [x] 39 new automated tests (validation, roles, guards)
- [ ] **You:** configure Supabase Auth URLs (see SUPABASE_SETUP.md section 4) and test sign-in locally
- Not in this phase: wishlist (Phase 4), orders (Phase 7), admin screens (Phases 4-8), guest checkout (Phase 5)

### PHASE 4 — Product catalogue, categories, variants, inventory  ✅ (pending your approval; not yet applied to the live project)
- [x] Migrations 7-8: storefront views and catalogue functions (tested on PostgreSQL)
- [x] Storefront from real data: shop, men, women, category, collection, search; filters (gender, category, price, size, colour, availability, new, discount), 5 sorts, pagination
- [x] Product page: gallery with zoom, size/colour selection, per-variant price and stock, related, recently viewed, reviews (moderated), quick view
- [x] Wishlist (signed-in customers), navigation and search suggestions from the database
- [x] Admin: products (CRUD, duplicate, bulk actions, CSV export), photos, variants, categories/subcategories, inventory
- [ ] **You:** run `supabase/apply_phase4.sql`, optionally the demo products, then test (see report)
- Not in this phase: Add to Cart / Buy Now (Phase 5, so they are shown disabled), hero/banners/homepage builder (Phase 8), orders (Phase 7)

### PHASE 5 — Cart, coupons, checkout (server-side pricing via Edge Functions)  ⬜
### PHASE 6 — Delivery management; bKash / Nagad / Upay manual advance payment  ⬜
### PHASE 7 — Order management, customer dashboard, tracking  ⬜
### PHASE 8 — Complete admin dashboard & all editable website settings  ⬜
### PHASE 9 — Analytics, SEO, reports, performance  ⬜
### PHASE 10 — Security audit, testing, documentation, deployment prep  ⬜

## 7. Working Rules

- Each phase ends with: summary, files created/modified, DB changes, tests, production build, fixes, plan update, unfinished-items report, then **wait for approval**.
- No secrets committed. No push to GitHub and no Netlify deploy without explicit authorization.
- Nothing is marked ✅ until it has been built and verified.

## 8. Credentials / External Setup Needed (later phases)

| Needed | Phase | Notes |
|---|---|---|
| Supabase project URL + anon key | 2 | Put in `.env.local` (never committed) |
| Supabase service role key | 5+ | Server/Edge Function secret only, never in frontend |
| GitHub repository | 10 | Push only on your approval |
| Netlify site | 10 | Deploy only on your approval |
| bKash / Nagad / Upay merchant numbers | 6 | Entered by admin in Payment Settings |
