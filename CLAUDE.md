# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Mezzesalade Sipariş Yönetim Sistemi — a mobile-first (PWA) order management web app for a Turkish-cuisine restaurant operating in the Netherlands. UI strings are primarily in Turkish; some customer-facing text supports English (see `src/context/LanguageContext.jsx`). Prices are in EUR (€).

## Commands

```bash
npm install          # install dependencies
npm run dev          # Vite dev server on http://localhost:5173 (host:true → accessible on LAN, e.g. from iPhone on same WiFi)
npm run build        # production build to dist/
npm run preview      # preview the production build
```

There is no test suite, linter, or typecheck configured. `find_customers.js` and `test_whatsapp.js` in the repo root are ad-hoc scripts, not part of a test runner.

## Environment

The app requires these env vars (Vite exposes `VITE_`-prefixed vars to the client; `.env*` is gitignored). See `.env.example` for a template:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — Supabase project (used by `src/lib/supabase.js`)
- `VITE_ADMIN_USERNAME`, `VITE_ADMIN_PASSWORD` — admin panel login credentials (client-side check)
- `RESEND_API_KEY` — server-side only, used by the Vercel serverless function `api/send-email.js`

Deployed on Vercel. `vercel.json` rewrites `/api/*` to serverless functions and everything else to `index.html` (SPA fallback for client-side routing).

## Architecture

### Data layer — Supabase, not LocalStorage
**Important:** The README still describes LocalStorage persistence, but that is outdated. All orders, customers, and products are persisted in **Supabase** (Postgres). `src/lib/supabase.js` is the single data-access module — all DB reads/writes and real-time subscriptions live there. LocalStorage is now used only for the admin auth session (`admin_user` key).

Supabase tables: `customers`, `orders`, `order_items` (child of orders, cascade-deleted), `products`. Note the camelCase ↔ snake_case translation: the DB uses snake_case (`customer_id`, `variation_prices`, `is_active`) while the React app uses camelCase (`customerId`, `variationPrices`). The mapping happens **inside `supabase.js`** in each fetch/add/update function — keep that boundary; components should only ever see the camelCase shape.

### State flow
`src/App.jsx` (`AppContent`) is the central state container. It loads `orders`, `customers`, `products` once on mount, subscribes to Supabase real-time changes (which re-trigger `loadData`), and passes both the data and the CRUD wrapper functions (`addOrder`, `updateOrder`, etc.) down to route components as props. These wrappers call the `*Db` functions from `supabase.js` and optimistically update local React state. There is no Redux/Zustand/Context store for domain data — it's prop-drilled from `App.jsx`.

### Routing & access model — two distinct apps in one
Routing logic in `App.jsx` splits the app into public and admin surfaces:
- **Public routes** (no auth): `/` (CustomerLanding), `/toplu-siparis` (JoinOrderSelection), `/ozel-siparis` (CustomerOrderView). These let customers place orders. They fetch only anonymized/public data via `fetchPublicOrders` and write directly with the raw `*Db` functions.
- **Admin routes** (`/admin/*`): gated by `isAuthenticated`. Unauthenticated access renders `LoginPage`. The full management UI (dashboard, calendar, revenue, order/product/customer management, AI parser, daily summary) lives here.

Auth (`src/context/AuthContext.jsx`) reads credentials from `VITE_ADMIN_USERNAME` / `VITE_ADMIN_PASSWORD` env vars and stores the session in LocalStorage. There is no real server-side authorization; treat the admin gate as cosmetic, and remember the Supabase anon key plus RLS (configured in Supabase, not in this repo) is what actually protects data.

### Product matching (AI parser) — `src/hooks/useProductMatcher.js`
The "AI" order parser is **not** an LLM — it's Fuse.js fuzzy matching plus regex heuristics. `parseOrderText(text, productList)` parses pasted WhatsApp messages line-by-line: it strips metadata lines (phone/date/address detected by regex), extracts quantity+name from several patterns, normalizes Turkish characters (`ı→i`, `ş→s`, etc.) for matching, and returns matched products with confidence scores and alternatives. When editing matching behavior, the key tunables are the Fuse `threshold` and the `normalizeTurkish` map. Note this module imports a static `src/data/products.json` fallback, but live matching should use the Supabase `products` passed in as `productList`.

### Email — `api/send-email.js`
Vercel serverless function that sends order-confirmation emails via the Resend API. Recipients (restaurant addresses) and the email HTML template are hardcoded here.

## Conventions
- Components are plain function components with hooks; styling is per-feature CSS files co-located in component folders plus a global `src/index.css`. Icons via `lucide-react`.
- When adding a field that persists, update **both** the snake_case insert/update payload and the camelCase mapping in the relevant `supabase.js` function — forgetting one is the most common source of "data not saving / not showing" bugs.
- IDs may be either UUIDs (Supabase products) or integers (legacy); comparisons throughout use `String(a) === String(b)` to be safe — follow that pattern.
