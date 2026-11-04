# VAYORA FASHION

Style for Everyone. Fashion for Every Moment.

Premium e-commerce storefront and admin for a Bangladesh fashion brand (BDT ৳, Cash on Delivery, optional advance delivery charge via bKash / Nagad / Upay with manual verification).

**Status:** Phase 3 of 10 built (UI, database, authentication). See [PROJECT_PLAN.md](PROJECT_PLAN.md). Products and content are sample placeholders until Supabase is connected in Phase 2.

## Stack
React 18 · Vite 7 · TypeScript · Tailwind CSS 3 · React Router 7 · React Hook Form · Zod 4 · Supabase (from Phase 2) · Netlify

## Requirements
Node 22+ (Vite 7 requires Node 20.19+ or 22.12+).

## Getting started
```bash
npm install
cp .env.example .env.local   # Supabase values are only needed from Phase 2
npm run dev                  # http://localhost:5173
npm run build                # type-check + production build to dist/
npm test                     # unit + route smoke tests
```

## GitHub setup
```bash
git remote add origin <your-repo-url>
git push -u origin main      # only when you decide to publish
```
Before pushing: `git status`, review changes, confirm no secrets (`.env*` are git-ignored), run `npm run build`.

## Deployment
Netlify: build `npm run build`, publish `dist`. See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).

## Documentation
PROJECT_PLAN · DATABASE_SCHEMA · SUPABASE_SETUP · ADMIN_GUIDE · DEPLOYMENT_GUIDE · SECURITY · CHANGELOG
