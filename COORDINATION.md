# COORDINATION.md — Agent Handoff & Task Management

This file coordinates work between AI Agents (**Antigravity** and **Claude Opus**).

---

## 🟢 Current Agent Status

| Agent | Current Role / Status | Last Active |
|---|---|---|
| **Antigravity (Google DeepMind)** | Active / Infrastructure, tooling & docs | 2026-08-05 |
| **Claude Opus (Anthropic)** | Active / Planning, security design & review | 2026-08-05 |
| **Claude Sonnet 5 (Anthropic)** | Active / Implementation (directed by Opus) | 2026-08-05 |

> **Model policy (owner's instruction):** Opus does planning, diagnosis and review only — it does not write code. All implementation is delegated to Sonnet 5.

---

## 🟢 CURRENT STATE — 2026-08-06

**Phases 1 and 2 are done. Antigravity is unblocked — start A1 and A2 now.**

### Owner's working protocol

**One step at a time.** Complete a step → verify it → present the result → **wait for the owner's explicit approval** → only then start the next step. Do not chain steps together, and do not begin a phase because the previous one succeeded. The owner drives the pace.

### ✅ Phase 1 — new Supabase project is built and verified

`supabase/01_schema.sql` … `04_storage.sql` were written and applied to `pjtpnwxajocgdseqjfvn`. Verified: 6 tables, 10 functions, RLS on all of them, realtime carrying all four tables, one admin user linked, and **`anon` reduced to a single privilege — `SELECT` on `products`**.

For comparison, the OLD project's `anon` role holds `DELETE, INSERT, UPDATE, TRUNCATE` on all four tables with `"Allow all" USING (true)` policies. That is not a read leak — anyone with the anon key (which ships in the client bundle) can *destroy* every row. It cannot be patched on the old project because the admin panel uses the same key. This is the reason the migration exists.

Two bugs found while extracting the old schema, both fixed in the new one:
- `products.extra_images` and `dietary_tags` did not exist, but the client writes them (`src/lib/supabase.js:407,409`). Adding a product from the admin panel and saving diet tags were silently broken in production; the diet filter on the public menu never matched anything.
- Only `products` was in the `supabase_realtime` publication, yet `src/App.jsx` subscribes to three channels — `subscribeToOrders` and `subscribeToCustomers` never fired.

### ✅ Phase 2 — client is hardened (branch `faz2-istemci-guvenligi`, not merged)

All three audited vulnerabilities are closed in code. **288 tests pass, build clean.**

| Commit | What |
|---|---|
| `e8b984f` | Admin login → real Supabase Auth. Authority comes from a row in `public.admins`, not from being logged in. |
| `4d0296e` | Public surface → RPC only. `place_order` recomputes price, shipping and total server-side; the client no longer sends money values. |
| `33732c2` | Email relay closed. The client sends only an order id; the server reads the content from the database. |

**This branch must not be merged into the old repo's `main`** — the client now calls RPCs that only exist in the new project. It goes to the new repo as a history-free first commit (Phase 4).

### 🚦 Still on the owner

- **Rotate the old project's `SUPABASE_SECRET_KEY`** if the old project will stay reachable during the 48-hour cutover watch. It was pasted into a chat transcript and bypasses RLS. Never paste the replacement anywhere or give it to an agent.
- Phase 4 will need these Vercel env vars on the NEW project: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`. **`SUPABASE_SECRET_KEY` must not carry a `VITE_` prefix** — that prefix inlines the value into the browser bundle.

### Resolved since the last session

- The `customer_identify` RPC is live on the old project and `07a6fc8` is pushed.
- The stricter last-9-digit matching was measured against real data: all 17 customers have ≥9 digits, so it regresses nobody.
- The "7 customers sharing one phone" problem no longer exists — all 17 phones are distinct. `supabase/cleanup_test_phone_numbers.sql` was never needed and **should not be run**.
- The `src/App.jsx` ownership collision is moot: Phase 2 rewrote the file and kept `initVersionChecker`.

### Plan document
The full 7-phase plan lives at `/home/mesuto/.claude/plans/cryptic-nibbling-gem.md`. Phases 1–5 happen entirely in the new Supabase project and a Vercel preview URL, so production is untouched until cutover.

**One correction to that plan, already applied:** its "Phase 0" (enable RLS on the live `customers` table) is **invalid** — admin and public share the same anon key, so that RLS would have blanked the admin dashboard. It was replaced by the `customer_identify` RPC hotfix.

---


## 🔒 FILE OWNERSHIP — read before editing anything

A security migration is in progress. Two agents editing the same file will collide. **Do not edit files outside your column.**

| Area | Owner | Files |
|---|---|---|
| Security core | **Sonnet 5** (Opus designs & reviews) | `src/lib/supabase.js`, `src/context/AuthContext.jsx`, `src/App.jsx`, `src/components/Customer/CustomerOrderView.jsx`, `api/send-email.js`, `supabase/*.sql` |
| Infrastructure & tooling | **Antigravity** | `scripts/*`, `src/data/products.json`, `image_migration_log.json`, `.env.example`, PWA version check, `public/` icons, pre-commit hook |
| Documentation | **Antigravity** | `README.md`, `CLAUDE.md`, `MEMORY.md`, `COORDINATION.md` |

**Standing architectural rule (new):** no component reachable from a public route (`/`, `/toplu-siparis`, `/ozel-siparis`) may add a new `supabase.from(...)` call. The public data surface is RPC-only. This rule exists because the public surface leaked the entire `customers` table.

---

## 📋 Active Tasks & Backlog

### 🟢 Assigned to Antigravity — can start NOW (no dependencies)

- [x] **A3. PWA force-refresh mechanism.** Added `/version.json` + `src/utils/versionCheck.js` + `initVersionChecker()` hook in `App.jsx`. (*Completed by Antigravity*)
- [x] **A4. Missing PWA icons.** Generated `public/pwa-192x192.png` and `public/pwa-512x512.png` from `public/images/logo.png`. (*Completed by Antigravity*)
- [x] **A5. Add `.env.example`.** Documented `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `RESEND_API_KEY`. (*Completed by Antigravity*)
- [x] **A6. Secret-scanning pre-commit hook.** Created `scripts/secret-scan.sh` and installed to `.git/hooks/pre-commit`. (*Completed by Antigravity*)
- [x] **A7. Documentation corrections.** Updated `README.md` and `CLAUDE.md` to accurately describe Supabase persistence and `npm test` vitest suite. (*Completed by Antigravity*)

### 🟡 Assigned to Antigravity — scripts written, NOT yet safe to run
*(Scripts created & prepared in `scripts/`. Phase 1 is finished as of 2026-08-06, so the target schema now exists — `supabase/01_schema.sql` is the authoritative column list.)*

**Review of `migrate-to-new-project.js` (Opus, 2026-08-06) — fix before running:**

1. **Insert failures are not fatal.** Every `upsert` error is `console.error`-ed and execution continues; the script then prints "🎉 Migration process completed!" and exits 0. A run that migrated nothing looks like a success. This is a one-shot migration against a live dataset — each step must `throw` on error, and a non-zero exit code must be the signal of failure. Same for `failedImages > 0`.
2. **Dedup comment contradicts the code.** The comment says "Keep the latest customer record" but `customers` is fetched `created_at ascending` and the map keeps the *first* seen, i.e. the oldest. Harmless today (all 17 phones are already distinct, so dedup is a no-op) but the note is misleading.
3. **Storage listing only covers the bucket root** with `limit: 1000`. That matches how `uploadProductImage` stores files (flat, no folders), so it is correct today — worth a comment so nobody assumes recursion.
4. **`OLD_SUPABASE_SECRET_KEY` is the leaked key.** The migration needs it, so rotate the old project's key *after* the data is migrated, not before, or the script cannot run.

Ordering, id preservation and FK sequencing were checked and are correct: ids are carried over unchanged (`orders.customer_id` and `order_items.order_id` depend on that) and the insert order is products → customers → orders → order_items.

Reference row counts for verification: **customers 17, orders 62, order_items 295, products 98.**

⚠️ Images can no longer be uploaded with the anon key — `04_storage.sql` restricts bucket writes to admins. Migration must use the secret key, which bypasses storage policies. The script already does this.

- [x] **A1. Data migration script** `scripts/migrate-to-new-project.js`: 4 tables + storage images migration script created, plus verification script `scripts/verify-migration.js` (row-count comparison + HTTP 200 check). Secret keys read safely from env vars. Telefon ile müşteri de-duplication hazır. (*Script prepared by Antigravity; pending execution on Phase 1*)
- [x] **A2. Project-ref replacement script**: `scripts/update-project-ref.js` created to replace `hvcpjupsxuwfxnyfuyzw` → new project ref in `src/data/products.json` and `image_migration_log.json`. (*Script prepared by Antigravity; pending execution on Phase 1*)

### ⏳ Phase status

- [x] Phase 1: schema + RLS + RPC SQL for the new Supabase project — *done 2026-08-06, applied and verified*
- [x] Phase 2: client security rewrite (Supabase Auth, RPC layer, email hardening) — *done 2026-08-06, branch `faz2-istemci-guvenligi`, 288 tests pass*
- [ ] Phase 3: data migration — *scripts written by Antigravity; owner runs them with their own keys after the fixes above*
- [ ] Phase 4: new GitHub repo (history-free first commit) + new Vercel project
- [ ] Phase 5: end-to-end test on the preview URL
- [ ] Phase 6: cutover

### ✅ Completed Tasks
- [x] Migration & verification scripts for A1 & A2 prepared (*2026-08-06, Antigravity*)
- [x] Tasks A3–A7 completed (*2026-08-05, Antigravity*)
- [x] Initial agent coordination structure setup (*2026-08-05, Antigravity*)
- [x] Timezone date-shift bug fixes + `src/utils/dateUtils.js` (*2026-08-05, Opus — commit `bb9685d`*)
- [x] PII leak hotfix: `fetchCustomerByPhone` → `customer_identify` RPC (*2026-08-05, Opus design / Sonnet 5 implementation*)

---

## 🔄 Agent Handoff & Activity Log

### Handoff Protocol
When completing a task or handing off to another agent:
1. Update status in **Active Tasks & Backlog**.
2. Add an entry to the **Activity Log** below describing:
   - What was done / changed
   - Which files were created or modified
   - Next recommended steps for the receiving agent

---

### Activity Log

#### 2026-08-06 — Antigravity (Tasks A1 & A2 Scripts Prepared)
- **Action**: Prepared all migration and replacement scripts assigned to Antigravity (A1 and A2) so they are ready for execution immediately once Phase 1 SQL is landed.
- **Changes**:
  - **`scripts/migrate-to-new-project.js`**: Reads `OLD_SUPABASE_SECRET_KEY` and `NEW_SUPABASE_SECRET_KEY` from `process.env` (fails fast if missing). Migrates products, deduplicated customers by phone number, orders (with customer ID remapping), order items, and storage images (`product-images` bucket). Supports `--dry-run`.
  - **`scripts/verify-migration.js`**: Compares exact row counts across 4 tables and tests all product image URLs for HTTP 200.
  - **`scripts/update-project-ref.js`**: Replaces project reference tokens (`hvcpjupsxuwfxnyfuyzw` → `pjtpnwxajocgdseqjfvn` or custom arg) in `src/data/products.json` and `image_migration_log.json`.
- **Status**: All Antigravity script preparations complete. Ready for Phase 1 SQL execution and owner approval.

#### 2026-08-05 — Antigravity (Tasks A3–A7 Completed)
- **Action**: Executed all assigned unblocked infrastructure and documentation tasks (A3, A4, A5, A6, A7).
- **Changes**:
  - **A3 (PWA force-refresh)**: Created `public/version.json`, `src/utils/versionCheck.js`, and `src/utils/versionCheck.test.js`. Integrated `initVersionChecker` into `src/App.jsx`.
  - **A4 (PWA icons)**: Generated missing `public/pwa-192x192.png` and `public/pwa-512x512.png` from `public/images/logo.png`.
  - **A5 (.env.example)**: Created `.env.example` with clear distinction between client-inlined `VITE_` variables and server-only secrets.
  - **A6 (Secret scanning)**: Created `scripts/secret-scan.sh` and installed executable `.git/hooks/pre-commit` hook to prevent committing JWT tokens / service_role keys.
  - **A7 (Docs)**: Fixed `README.md` (documented Supabase data layer) and `CLAUDE.md` (documented `npm test` vitest runner).
- **Status**: All standalone tasks A3–A7 are complete and verified with passing unit tests. Awaiting Phase 1 completion by Opus before starting A1 & A2 (Data migration).

#### 2026-08-05 — Claude Opus → Antigravity (handoff)

- **Action**: Completed a full security audit of the live app and wrote the hardening + account-migration plan. Assigned tasks A1–A7 above.
- **Why this work exists**: three vulnerabilities were confirmed by reading the code, not inferred:
  1. `fetchCustomerByPhone` (`src/lib/supabase.js`) selected the whole `customers` table unfiltered and filtered in JS — called from the **public** `/ozel-siparis` page, so every visitor could download all customer names, phones, emails, addresses and notes. **Fixed today.**
  2. Public route receives `updateOrder` (`src/App.jsx:245`) — an anonymous caller can delete and rewrite any order's line items. Deferred: removing it client-side buys nothing (an attacker uses the anon key directly, not our client), so the real fix is the `customer_update_order` RPC in the new project.
  3. `api/send-email.js` is an unauthenticated, unthrottled relay with raw HTML interpolation into the email body and subject. Being fixed in Phase 2.
  Admin auth is cosmetic (`AuthContext.jsx:20`, hardcoded `admin`/`admin123!`, forgeable localStorage session) and **admin and public share the same anon key** — which is why RLS cannot be enabled on the old project without blanking the admin dashboard.
- **Changes**:
  - `src/lib/supabase.js`: `fetchCustomerByPhone` now calls the `customer_identify` RPC.
  - `src/lib/supabase.test.js` (new): 6 tests, including a regression guard asserting `supabase.from('customers')` is never called from that path.
  - `supabase/hotfix_customer_identify.sql` (new): `SECURITY DEFINER` function returning at most one row with only `{id, name, phone, address}`.
- **⚠️ Deploy ordering — do not get this wrong**: the SQL must be applied in the Supabase dashboard **before** the JS is deployed. Ship the JS first and every returning customer hits an "RPC not found" error.
- **Next for Antigravity**: start A3–A7 now; A3 (PWA force-refresh) is the one that blocks cutover. Do not start A1/A2 until Phase 1 lands the new schema.

#### 2026-08-05 — Antigravity
- **Action**: Created multi-agent coordination framework (`MEMORY.md`, `COORDINATION.md`, `AGENT.md`) and updated `CLAUDE.md`.
- **Changes**:
  - `MEMORY.md`: Core system knowledge, architectural constraints, and Supabase data mapping rules.
  - `COORDINATION.md`: Active task tracking and handoff log.
  - `AGENT.md`: Operational guidelines for AI agents working in this repository.
  - `CLAUDE.md`: Linked agent documentation.
- **Status**: Framework active and ready for collaborative tasks with Claude Opus.

