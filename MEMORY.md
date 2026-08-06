# MEMORY.md — Project Knowledge & Decisions Memory

## Project Overview
- **Name**: Mezzesalade Sipariş Yönetim Sistemi
- **Type**: PWA / Web App (Mobile-first)
- **Target Audience**: Turkish-cuisine restaurant operating in the Netherlands.
- **Languages**: Primary UI in Turkish; English support in selected views (`src/context/LanguageContext.jsx`).
- **Currency**: EUR (€)

---

## Technical Stack & Architecture
- **Frontend**: React (Vite), Plain CSS co-located with components, `lucide-react` icons.
- **Backend / Database**: Supabase (Postgres). Real-time subscriptions enabled.
- **State Management**: Prop-drilling from `src/App.jsx` (`AppContent`). Optimistic updates via wrapper functions around `src/lib/supabase.js`.
- **Serverless / Email**: Vercel Serverless Function (`api/send-email.js`) via Resend API.
- **Hosting**: Vercel (SPA routing rewrite configured in `vercel.json`).

---

## Important System Constraints & Patterns

### 1. Supabase Data Mapping (CRITICAL)
- **Database (Postgres)**: Uses `snake_case` (e.g. `customer_id`, `variation_prices`, `is_active`).
- **React App**: Uses `camelCase` (e.g. `customerId`, `variationPrices`, `isActive`).
- **Mapping Location**: Done strictly inside `src/lib/supabase.js`. Components must **only** receive and handle `camelCase` objects.
- **Rule**: Whenever adding or modifying a database column, update both the insert/update payload (`snake_case`) AND the read parser (`camelCase`) in `src/lib/supabase.js`.

### 2. ID Comparisons
- IDs can be UUIDs (Supabase) or integer strings.
- Always use `String(idA) === String(idB)` when comparing IDs across components and state.

### 3. Order Parsing ("AI" Order Parser)
- Located at `src/hooks/useProductMatcher.js`.
- Uses **Fuse.js** fuzzy matching + regular expressions for phone, date, address extraction, and Turkish character normalization (`ı→i`, `ş→s`, `ğ→g`, etc.).
- Does **not** use an LLM API for matching; logic is purely heuristic and local.

### 4. Authentication & Security — ⚠️ CURRENTLY WEAK, MIGRATION IN PROGRESS
- Admin auth is client-side only (`src/context/AuthContext.jsx:18-27`): hardcoded `admin`/`admin123!` compared in the browser, session stored in `localStorage['admin_user']`. **Anyone can forge it from devtools.** No server-side authorization exists anywhere.
- **Admin and public customers share the same Supabase anon key** — no `supabase.auth.*` call exists in the codebase. This is the single most important fact about this system's security: **RLS cannot distinguish admin from anonymous visitor**, so enabling RLS on the live project would blank the admin dashboard. This is why the live PII leak was fixed with an RPC instead of RLS.
- Being replaced by Supabase Auth + RLS + an RPC-only public surface in the new project (`pjtpnwxajocgdseqjfvn`).

### 5. Public data surface is RPC-only (STANDING RULE)
- No component reachable from a public route (`/`, `/toplu-siparis`, `/ozel-siparis`) may add a `supabase.from(...)` call. Public reads/writes go through `SECURITY DEFINER` Postgres functions.
- Origin of the rule: `fetchCustomerByPhone` did an unfiltered `select('*')` on `customers` and filtered in JS, dumping every customer's name/phone/email/address/notes to any visitor. `src/lib/supabase.test.js` now carries a regression guard asserting `supabase.from('customers')` is never called on that path.

### 6. Dates: never use `toISOString()` to build a date key
- `src/utils/dateUtils.js` is the single source of truth (`toDateKey`, `parseDateKey`, `todayKey`, `yesterdayKey`, `addDays`, `toDateKeyFrom`).
- `new Date(y,m,d)` produces **local** midnight; `toISOString()` converts to UTC and shifts the date back one day in NL (UTC+1/+2). `new Date('YYYY-MM-DD')` has the opposite trap — it parses as **UTC** midnight.
- `orders.date` is a plain timezone-free `YYYY-MM-DD` "business day" — keep it that way.

---

## Lessons Learned & Decisions Log
- *2026-08-05*: Restructured agent coordination system with `COORDINATION.md`, `MEMORY.md`, and `AGENT.md`.
- *2026-08-05*: Fixed three timezone date-shift bugs (calendar → daily-summary off by one day; "today" wrong between local 00:00–02:00; day navigation skipping a day across the DST boundary). Centralised in `src/utils/dateUtils.js`. Commit `bb9685d`.
- *2026-08-05*: **Security audit.** Confirmed by reading code, not inferred: (1) full `customers` table dumped to every public visitor, (2) anonymous callers can rewrite any order's line items via the public `updateOrder` prop, (3) `api/send-email.js` is an unauthenticated, unthrottled relay with raw HTML interpolation into the email body and subject.
- *2026-08-05*: **Decision — client-side removal of a capability is not a security fix.** Removing `updateOrder` from the public route was deliberately skipped: an attacker uses the anon key against PostgREST directly, not our client, so the change would only have killed a real customer feature for zero security gain. The fix belongs server-side (`customer_update_order` RPC).
- *2026-08-05*: **Decision — no anon-key rotation.** The key leaked in git history decodes to `role: anon`, and Vite inlines it into the published bundle anyway, so it was never secret. The vulnerability was unrestricted table access, not key visibility. (No `service_role` key was ever committed — verified.) `admin123!` is treated as burned.
