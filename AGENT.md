# AGENT.md — AI Agent Operating Instructions

This document defines the rules of engagement and operational workflow for AI agents (**Antigravity**, **Claude Opus**, etc.) working on this codebase.

---

## 📜 Core Directives

1. **Check Coordination First**:
   - At the beginning of any session, check [`COORDINATION.md`](file:///home/mesuto/Documents/PROJELER/mezzesalade_OM/COORDINATION.md) and [`MEMORY.md`](file:///home/mesuto/Documents/PROJELER/mezzesalade_OM/MEMORY.md) to understand recent work and active tasks.

2. **Update Status & Handoffs**:
   - Before ending a task or when transferring work to another agent, update `COORDINATION.md` with:
     - Completed items
     - In-progress items
     - Handoff notes in the Activity Log

3. **Preserve Architectural Constraints**:
   - Always follow the data translation patterns in `src/lib/supabase.js` (`snake_case` ↔ `camelCase`).
   - Use `String(idA) === String(idB)` for ID comparisons.
   - Do not break existing CSS or component structures.

4. **Testing & Verification**:
   - After completing edits, verify using `npm run build` or `npm run dev` where applicable.
   - The project has a test suite: `npm test -- --run` (vitest). Run it; it must stay green.
   - Log any discovered issues or bugs in `COORDINATION.md`.

5. **Step-by-step approval (owner instruction, 2026-08-05)**:
   - Work **one step at a time**. Finish a step → verify it → report the result → **wait for the owner's explicit approval** before starting the next one.
   - Do not chain steps, and do not start the next phase just because the previous one succeeded. The owner sets the pace.

6. **Public data surface is RPC-only**:
   - No component reachable from a public route (`/`, `/toplu-siparis`, `/ozel-siparis`) may add a `supabase.from(...)` call. Public reads and writes go through `SECURITY DEFINER` Postgres functions.
   - Reason: an unfiltered `select('*')` on `customers` in a public code path leaked every customer's name, phone, email and address to any visitor.

7. **Secrets**:
   - The `VITE_` prefix means Vite **inlines the value into the browser bundle**. A server-side secret must never carry it.
   - Never hardcode keys in scripts — read them from `process.env` and fail fast. A pre-commit secret scanner is installed (`scripts/secret-scan.sh`).

8. **Deployment ordering**:
   - Pushing to `main` auto-deploys to Vercel. When a change depends on a database object (a new RPC, column or policy), the **SQL must be applied first**, then the code pushed. Reversing this breaks production immediately.

9. **Dates**:
   - Never build a `YYYY-MM-DD` string with `toISOString()`. Use `src/utils/dateUtils.js` — `toISOString()` shifts the date back one day in NL (UTC+1/+2).
