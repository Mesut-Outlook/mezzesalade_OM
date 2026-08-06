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

## ⏸️ SESSION PAUSED — 2026-08-05

Work is **deliberately stopped** pending owner action. Read this section first in the next session.

### Owner's working protocol (instruction given 2026-08-05) — applies from the next session onward

**One step at a time.** Complete a step → verify it → present the result → **wait for the owner's explicit approval** → only then start the next step. Do not chain steps together, and do not begin a phase because the previous one succeeded. The owner drives the pace.

### 🚦 BLOCKING — nothing proceeds until the owner does these, in this order

1. **Rotate `SUPABASE_SECRET_KEY`** on the new project (`pjtpnwxajocgdseqjfvn`). It was pasted into a chat transcript. It bypasses RLS entirely. The replacement must go straight into Vercel env vars and must never be pasted anywhere or given to any agent.
2. **Measure the matching behaviour change** — run the `count(*)` query at the bottom of `supabase/hotfix_customer_identify.sql` against the OLD project. If `kisa_numarali > 0`, report the number: the new matching is stricter than the old JS and those customers would stop being auto-recognised. Do not skip this — it is the one place the hotfix can regress real users.
3. **Apply `supabase/hotfix_customer_identify.sql`** in the OLD project's SQL editor (`hvcpjupsxuwfxnyfuyzw`), then run its verification queries.
4. **Only then `git push`.** Commit `07a6fc8` is committed locally but **deliberately not pushed**: the repo auto-deploys to Vercel, and shipping the JS before the SQL exists would give every returning customer an "RPC not found" error. **Order is SQL first, push second.**
5. After deploying, test on the live site: identify with a known phone on `/ozel-siparis` → name/address should prefill; an unknown phone → new-customer form.

### Where things stand

| | Status |
|---|---|
| Tests | **137 passing**, 7 files |
| Build | clean |
| Local commits not yet pushed | `07a6fc8` (PII hotfix) |
| Uncommitted working tree | Antigravity's A3–A7 output (see below) |
| Live production | **unchanged** — still running the old, vulnerable bundle |
| Live PII leak | **still open** until steps 3–4 above are done |

### Plan document
The full 7-phase security + account-migration plan lives at `/home/mesuto/.claude/plans/cryptic-nibbling-gem.md`. Phases 1–5 happen entirely in the new Supabase project and a Vercel preview URL, so production is untouched until cutover.

**One correction to that plan, already applied:** its "Phase 0" (enable RLS on the live `customers` table) is **invalid** — admin and public share the same anon key, so that RLS would have blanked the admin dashboard. It was replaced by the `customer_identify` RPC hotfix.

### ⚠️ Ownership collision to resolve next session
Antigravity edited `src/App.jsx` (adding `initVersionChecker`) — that file is listed above as security-core, owned by Sonnet 5. No harm done (tests and build pass), but Phase 2 rewrites `src/App.jsx` for Supabase Auth, so **whoever does Phase 2 must preserve the `initVersionChecker` call** rather than overwrite it.

### ✅ Bug fixed in A6 (secret scanner) — by Antigravity
`scripts/secret-scan.sh` and `.git/hooks/pre-commit` were updated to scan for high-entropy JWT tokens, explicit `sb_secret_` / `sbp_` key patterns, and explicit key assignments rather than bare prose terms. Markdown files are exempted from prose keyword matching. Verified with test run.

### Next step when work resumes
Phase 1 — design the new project's schema + RLS + RPC SQL (`supabase/01_schema.sql` … `04_storage.sql`). Owner approval required before starting, and again before any of it is run against the new project.

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

### ⏸️ Assigned to Antigravity — BLOCKED until Phase 1 (new Supabase schema) is finished

- [ ] **A1. Data migration script** `scripts/migrate-to-new-project.js`: 4 tables + 93 storage images from `hvcpjupsxuwfxnyfuyzw` → `pjtpnwxajocgdseqjfvn`, plus a verification script (row-count comparison + HTTP 200 check on every image). **The secret key must be read from an env var — never hardcoded.** Must de-duplicate customers by phone.
- [ ] **A2. Project-ref replacement**: 184 occurrences of `hvcpjupsxuwfxnyfuyzw` → new ref, in `src/data/products.json` (92) and `image_migration_log.json` (92). `update_products_json_urls.js` is a usable template.

### ⏳ In Progress (Opus / Sonnet 5 — do not touch these files)

- [ ] Phase 1: schema + RLS + RPC SQL for the new Supabase project — *Opus*
- [ ] Phase 2: client security rewrite (Supabase Auth, RPC layer, email hardening) — *Sonnet 5*

### ✅ Completed Tasks
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

