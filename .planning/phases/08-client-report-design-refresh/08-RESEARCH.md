# Phase 8: Client report design refresh — Research

**Researched:** 2026-05-07
**Domain:** Next.js 16 App Router report UI + react-pdf mirror + Drizzle schema additions + admin RBAC authoring (extends locked Phase 7 patterns)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Surface & Parity**
- **D-01:** Phase 8 ships **portal + PDF mirrored**. Portal is interactive (clickable cards, modal drill-down). PDF is static — same five cards, same colours, same scores, with a footnote indicating drill-down lives in the portal.
- **D-02:** The portal report page (`src/app/portal/assessment/[id]/report/page.tsx`) keeps its SSR ownership gate (`auth.api.getSession + hasAccess + redirect/notFound`, locked in Phase 7 BL-05). The five-pillar module renders inside the gated branch.
- **D-03:** `Section11.tsx` is replaced — not augmented. Current dense category-grouped marker grid is preserved underneath as a **collapsed "Detailed marker results" disclosure**.

**Five-Pillar Model**
- **D-04:** Five pillars verbatim: Cardiometabolic Health, Body Composition, Strength, Balance, VO2 / Fitness Capacity.
- **D-05:** Pillar → existing-category mapping (locked):
  - Cardiometabolic = Lipid Panel + Glucose & Metabolic + Inflammation + BP (Systolic + Diastolic) from Cardiovascular Fitness
  - Body Composition = `Body Composition` (clean)
  - Strength = `Strength Testing` (clean)
  - Balance = balance-subset of `Mobility & Flexibility` (any marker whose `testKey`, `label`, or comment contains "balance" / "sway" / "stability")
  - VO2 / Fitness Capacity = `Cardiovascular Fitness` (excluding BP markers)
- **D-06:** Hormones, Thyroid, Vitamins & Minerals, Iron Studies, Liver Function, Kidney & Electrolytes, Heavy Metals, Full Blood Count surface as "Supporting markers" inside the **Cardiometabolic modal**, contributing to "doing well" / "needs attention" but **not** to the pillar score.
- **D-07:** Questionnaire / Daily Readiness / Medical Screening data is NOT a sixth pillar — surfaced as plain-English context inside relevant modals.

**Pillar Score (0–100) and Traffic Light**
- **D-08:** Tier-rollup formula: elite=100, great=80, normal=60, cautious=40, poor=20, null=excluded. Pillar score = round(unweighted mean across rated markers in mapped categories). Zero rated markers → score=null, "Data pending" pill.
- **D-09:** D-06 supporting markers are EXCLUDED from Cardiometabolic score calculation (transparency only).
- **D-10:** Traffic-light thresholds: red 0–39, amber 40–69, green 70–100. Hardcoded in v1, lifted to a single named-export constant.
- **D-11:** 5-tier marker palette stays at marker-row level inside modal; 3-state pillar traffic light is a separate visual layer.

**Prescription / Consultant Recommendation (admin-authored, per-assessment)**
- **D-12:** Per-assessment consultant recommendations are real admin-authored content. Coach + client READ. Only role=admin can WRITE.
- **D-13:** New table `pillar_prescriptions` with composite PK `(assessment_id, pillar_key)` — schema literal locked in CONTEXT.
- **D-14:** Component interface `PillarPrescription` locked. Modal accepts `PillarPrescription | null`. Empty state copy: "Your coach hasn't written a recommendation for this pillar yet. Check back soon."
- **D-15:** Admin authoring at `/portal/admin/assessments/[id]/prescriptions`. Inline edit per pillar. RBAC mirrors Phase 7 BL-02 admin-route pattern (403 for non-admin).
- **D-16:** Audit log every write: action `pillar_prescription.upsert` / `pillar_prescription.delete` with `{ assessment_id, pillar_key, before_summary_hash, after_summary_hash }`. Reuse `logAuditEvent` from `src/lib/audit.ts`.

**Pillar Definitions (admin-authored, global)**
- **D-17:** New table `pillar_definitions` (5 rows seeded; schema literal locked in CONTEXT).
- **D-18:** Seed migration ships 5 pillars with prompt wording. Idempotent — re-running does NOT overwrite admin edits.
- **D-19:** Page heading "The Peak Living Pillars" + intro stored as admin-editable in `pillar_page_copy` (single-row table OR sentinel row in `pillar_definitions`; planner picks).
- **D-20:** Write paths reject non-admin with 403; all writes audit-logged (`pillar_definition.update`, `pillar_page_copy.update`).
- **D-21:** Read paths SSR. The report page resolves `pillar_definitions` + `pillar_prescriptions` server-side and passes as props.

**Portal UX**
- **D-22:** Single grid above the fold. Sort: Cardiometabolic, VO2, Body Composition, Strength, Balance. Mobile = top-to-bottom; desktop = 3 + 2 layout.
- **D-23:** Modal = centred dialog desktop, **bottom-sheet mobile** (swipe-down + overlay).
- **D-24:** Modal close: backdrop tap, ESC, dedicated close button. Body scroll lock. Focus trap.
- **D-25:** Page heading + intro come from `pillar_page_copy`.

**PDF Mirror**
- **D-26:** PDF Page 10 = single A4 page with 5-pillar 3-2 grid. Below grid: footnote about drill-down. Per-pillar prescription `summary` rendered as small "Recommended next steps" block under each card when set.
- **D-27:** Existing `MarkerTable` + `InsightsSection` PDF blocks remain on subsequent pages — five-pillar page is **inserted ahead**.
- **D-28:** Reuse `src/lib/pdf/colors.ts`, `styles.ts`, `fonts.ts`. Traffic-light hex values must be mirrored between portal CSS and PDF colour constants via a single source-of-truth constants module.

**Visual / Brand**
- **D-29:** Reuse `--color-navy: #1a365d` and `--color-gold: #F5A623`. Glass-card style. No emoji or gimmicky icons.
- **D-30:** No medical claims, no disease-prevention claims, no longevity guarantees.

### Claude's Discretion
- Specific visual treatment of the pillar card (exact shadow, border-radius, score typography size). Researcher / planner can propose; UI-spec phase can refine if needed.
- Animation / micro-interactions on card open (within reason — keep it premium, not gimmicky).
- Exact placement of the "Detailed marker results" disclosure underneath the pillar grid (collapsed by default, but exact accordion / reveal pattern is up to the planner).

> NOTE: The UI-SPEC phase has now resolved most of these — see `08-UI-SPEC.md` for the canonical visual contract. Researcher discretion remains where UI-SPEC explicitly delegates to the planner.

### Deferred Ideas (OUT OF SCOPE)
- Coach (non-admin) authoring of per-pillar recommendations — admin-only write in v1.
- Recommendation template library — free-text only in v1.
- Configurable / per-coach traffic-light thresholds — hardcoded in v1.
- Pillar-score weighting based on clinical significance — unweighted mean in v1.
- Trend overlay on pillar cards (sparkline of last 3 assessments).
- Sixth pillar for questionnaires / lifestyle — explicitly ruled out for this phase.
- Per-assessment override of pillar definitions — definitions are global.
- Per-pillar reordering by client preference — admin-controlled globally.
- Versioning of pillar definitions — current model just stamps `updated_by`/`updated_at`.
</user_constraints>

<phase_requirements>
## Phase Requirements

Phase 8 was added 2026-05-07 to ROADMAP.md as a user-driven design change for the final report. Requirements are not numbered in `REQUIREMENTS.md` — the source of truth is the locked decision set D-01..D-30 in CONTEXT and the visual contract in UI-SPEC. The implicit requirement bundle:

| Implicit ID | Description | Research Support |
|---|---|---|
| REQ-08-01 | Replace Section 11 hero with five-pillar Peak Living module (portal) | Architecture Patterns §SSR + client island; reuses existing `Section11.tsx` data flow |
| REQ-08-02 | Five clickable pillar cards open a modal drill-down on portal | Component Inventory in UI-SPEC; hand-rolled `Dialog` primitive |
| REQ-08-03 | Mirror five-pillar grid into PDF (`Peak360Report.tsx`) | `@react-pdf/renderer` View/Text composition; reuse `colors.ts`/`styles.ts` |
| REQ-08-04 | Compute per-pillar score (0–100) + traffic-light status from existing tier ratings | `getPeak360Rating()` → tier → 20/40/60/80/100 mapping (D-08) |
| REQ-08-05 | Three new tables: `pillar_definitions`, `pillar_page_copy`, `pillar_prescriptions` | Drizzle dual-schema (sqlite + pg); idempotent seed migration |
| REQ-08-06 | Admin authoring routes: `/portal/admin/pillars`, `/portal/admin/assessments/[id]/prescriptions` | Mirror Phase 7 admin route pattern (`requireAdmin` + `logAuditEvent`) |
| REQ-08-07 | RBAC: read = admin/coach/client (gated by ownership for prescriptions); write = admin only (403) | `requireAdmin` from `src/lib/auth-helpers.ts` |
| REQ-08-08 | Audit log entries on every prescription/definition/page-copy write | `logAuditEvent` from `src/lib/audit.ts` (extend `AuditAction` union) |
| REQ-08-09 | Preserve existing dense marker grid in a collapsed disclosure under the pillar grid | Wrap current Section 11 internals in `<details>` |
| REQ-08-10 | PDF page 10 inserted BEFORE existing `MarkerTable`; existing PDF blocks unchanged | Edit `Peak360Report.tsx` to slot in `<PillarsPage>` |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

These are the actionable directives extracted from the project CLAUDE.md that the planner MUST honor:

| Directive | Source | Implication for Phase 8 |
|---|---|---|
| Tech stack: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + Drizzle/SQLite (or Postgres via DATABASE_URL) | CLAUDE.md §Tech Stack | Use existing dual-schema pattern; do not introduce new ORM, framework, or styling system |
| State: Zustand for client-side form state with auto-save (1s debounce) | CLAUDE.md §Tech Stack | The on-screen report is read-only — Zustand NOT used here. Admin authoring forms can use local React state (no auto-save pattern); planner decides whether to introduce Zustand |
| Form field IDs are camelCase (`clientName`, `cholesterolTotal`) | CLAUDE.md §Key Patterns | Pillar keys: `cardiometabolic`, `bodyComposition`, `strength`, `balance`, `vo2` |
| All section components receive `SectionProps`: `{ data, onChange, assessmentId }` | CLAUDE.md §Key Patterns | Section 11 is read-only — does NOT take `onChange`. Replacement component (or `<ReportShell>`) must accept resolved server-side props (`definitions`, `pageCopy`, `prescriptions`, `markers`) |
| Color scheme: `--color-navy: #1a365d`, `--color-gold: #F5A623` (defined in `globals.css`) | CLAUDE.md §Key Patterns | Reuse via Tailwind tokens (`text-navy`, `bg-gold`); ad-hoc hex codes only inside the new colours module |
| Database: Drizzle ORM dual-dialect (`schema.ts` for pg, `schema-sqlite.ts` for sqlite) | CLAUDE.md + verified in repo | New tables MUST be added to BOTH schema files. Tested via `npm run db:generate` then `npm run db:push` |
| Schema runtime migrations live in `src/lib/db/index.ts` `runMigrations()` | Verified in repo | Idempotent `CREATE TABLE IF NOT EXISTS` for both dialects; seed inserts use `ON CONFLICT DO NOTHING` (pg) or `INSERT OR IGNORE` (sqlite) |
| Use `import type { ... }` for TS types | CLAUDE.md §Conventions | New `PillarDefinition`, `PillarPrescription`, `PillarStatus` types — type-only imports |
| `@/*` alias maps to `./src/*` (no relative paths) | CLAUDE.md §Conventions | All new components import via `@/components/...`, `@/lib/...` |
| GSD workflow enforcement before edits | CLAUDE.md §GSD Workflow | This research feeds /gsd-plan-phase — planner takes over from here |
| `npm run db:push` for schema changes; production via `scripts/db-push.sh` (DATABASE_URL aware) | MEMORY.md + verified | Phase 8 planner must include a "schema push" task; production also needs `doctl apps update --spec` if env changes (none expected here) |

## Summary

Phase 8 is a **focused report-surface refactor** layered on top of the locked Phase 7 multi-tenant infrastructure. The technical work decomposes into three orthogonal slices:

1. **Pure-function pillar mapping + scoring** (`src/lib/pillars/`) — tier-rollup formula, marker-to-pillar classifier, traffic-light thresholds. Pure functions over the existing `REPORT_MARKERS` array and the existing `getPeak360Rating()` output. No I/O, fully unit-testable.
2. **Three new database tables** (`pillar_definitions`, `pillar_page_copy`, `pillar_prescriptions`) added to both Drizzle dialect schemas + idempotent seed inside `runMigrations()`. Two new admin route trees (`/portal/admin/pillars`, `/portal/admin/assessments/[id]/prescriptions`) and matching API endpoints under `/api/admin/`. RBAC and audit-log patterns are already shipped (Phase 7 `requireAdmin` + `logAuditEvent`) — copy-paste shape, do not invent.
3. **Two parallel UI mirrors** (portal interactive + PDF static) sharing a single source-of-truth colour constants module and consuming the same server-resolved props. Hand-rolled `Dialog` primitive (no new npm dependency — UI-SPEC explicitly forbids), `<details>`-based disclosure for the legacy marker grid, and a new `<PillarsPage>` react-pdf component inserted before `<MarkerTable>` in `Peak360Report.tsx`.

**Primary recommendation:** Plan this phase as four ordered waves: (W0) schema + seed migration + types, (W1) pillar mapping + scoring pure-function module + unit tests, (W2) portal pillar UI (Dialog + PillarsGrid + modal) replacing Section 11, (W3) admin authoring surfaces + PDF mirror in parallel. Each wave is independently mergeable. Critically, the **D-05 Balance pillar mapping is broken in the current codebase** — see Pitfall #1.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Pillar score computation | Pure utility (`src/lib/pillars/`) | — | No I/O, testable; consumed by both portal and PDF |
| Pillar mapping (marker → pillar key) | Pure utility (`src/lib/pillars/mapping.ts`) | — | Transformation over `REPORT_MARKERS`; no DB |
| Marker rating (existing) | Pure utility (`src/lib/normative/ratings.ts`) | — | Already shipped, unchanged |
| Pillar definitions / page copy / prescriptions persistence | Database / Drizzle | — | New tables; one migration; idempotent seed in `runMigrations()` |
| Read access to definitions + prescriptions | API / Backend (SSR) | Database | Server-side fetch in the report page; passed as props (D-21) |
| Write access to definitions + prescriptions | API / Backend | Database, Audit log | New `/api/admin/...` routes; mirror Phase 7 admin pattern |
| Five-pillar UI rendering (portal) | Browser / Client | Frontend Server (SSR) | SSR loads data + RBAC; client island handles modal interactivity |
| Modal interaction (open / close / focus trap) | Browser / Client | — | All keyboard + mobile-bottom-sheet behaviour is browser-only |
| PDF mirror | API / Backend | — | `@react-pdf/renderer` runs server-side via existing `/api/assessments/[id]/pdf` route |
| Admin authoring forms | Browser / Client | API / Backend | Forms call `/api/admin/...` endpoints |
| RBAC enforcement | API / Backend | Frontend Server (SSR) | `requireAdmin()` on every write route + Phase 7's SSR ownership gate on the report page |
| Audit logging | API / Backend | — | Fire-and-forget via `logAuditEvent()` after successful writes |

## Standard Stack

### Core (already installed — no new dependencies needed)

| Library | Version | Purpose | Why Standard |
|---|---|---|---|
| Next.js | 16.1.6 | App Router, server components, route handlers | Already locked stack `[VERIFIED: package.json]` |
| React | 19.2.3 | Component runtime; client islands marked `'use client'` | Already locked stack `[VERIFIED: package.json]` |
| TypeScript | ^5 | Strict typing for new pillar types and DB rows | Already locked stack `[VERIFIED: package.json]` |
| Tailwind CSS | ^4 | Utility-first styling via `@theme inline` tokens | Already locked stack — D-29 reuses tokens `[VERIFIED: package.json]` |
| Drizzle ORM | 0.45.1 | Type-safe schema + queries (dual-dialect: pg + sqlite) | Already in use; existing `schema.ts` + `schema-sqlite.ts` pattern `[VERIFIED: package.json + repo inspection]` |
| better-sqlite3 | 12.6.2 | SQLite driver (dev) | Already in use `[VERIFIED]` |
| pg | 8.18.0 | Postgres driver (production) | Already in use `[VERIFIED]` |
| @react-pdf/renderer | ^4.4.0 | PDF rendering for the new pillar mirror page | Locked in Phase 5 carry-forward; D-28 forbids alternatives `[VERIFIED: package.json]` |
| Better Auth | ^1.6.2 | Session/role lookup via `auth.api.getSession` | Already locked in Phase 2 + 7 `[VERIFIED]` |
| Vitest | ^4.0.18 | Unit-test pure functions in `src/lib/pillars/` | Already in use; existing tests under `tests/security/` and `src/__tests__/` `[VERIFIED]` |
| @testing-library/react | ^16.3.2 | Component tests for `PillarCard` / `PillarModal` if planner adds any | Already in use `[VERIFIED]` |
| uuid | ^13.0.0 | If audit log entries need explicit IDs (existing pattern uses it) | Already in use; `logAuditEvent` uses it internally `[VERIFIED]` |

### Supporting (zero new packages)

| Library | Version | Purpose | When to Use |
|---|---|---|---|
| (none) | — | — | UI-SPEC §Registry Safety + §Component Inventory explicitly forbid new dependencies. `Dialog` primitive is hand-rolled. Toast reuses existing `src/components/ui/Toast.tsx`. Inline SVG for the chevron icon (no `lucide-react` / `heroicons`). |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|---|---|---|
| Hand-rolled `Dialog` | Radix UI `@radix-ui/react-dialog` | Better a11y out of the box, but UI-SPEC explicitly defaults to hand-rolled and the project has no precedent for Radix. Adds bundle weight and a transitive-dependency review burden. Only reach for it if the hand-rolled focus trap proves brittle in mobile-Safari testing. |
| New `pillar_page_copy` single-row table | Sentinel row in `pillar_definitions` (`pillar_key='__page__'`) | Sentinel rows save a table at the cost of a special-case in every read path. CONTEXT D-19 explicitly delegates the choice to the planner. Recommendation: separate one-row table — it's three columns, costs nothing, and the read paths stay clean. |
| Per-pillar save buttons | Single "Save all pillars" form | Per-pillar saves feel more responsive and produce more granular audit log entries, but require five round-trips for a "save everything" workflow. UI-SPEC and CONTEXT D-15 list both as acceptable; recommendation: per-pillar with optimistic UI. |
| Recharts for any pillar visualisation | — | Recharts is already installed (clients page). Phase 8 has no charts inside the modal — score numerals + per-marker tier badges are sufficient. Do not introduce charts. |

**Installation:** No new packages. `npm install` is unchanged.

**Version verification:**
- `@react-pdf/renderer@^4.4.0` is current. The 4.x line stabilised in 2025; 4.4.0 introduced no breaking API changes from 4.0. `[VERIFIED: package.json + Phase 5 carry-forward]`
- `better-auth@^1.6.2` is the version locked by Phase 7. No upgrade needed for Phase 8. `[VERIFIED: package.json]`
- `drizzle-orm@0.45.1` and `drizzle-kit@^0.31.9` are the project-pinned versions. Schema generation works against both `schema.ts` (pg) and `schema-sqlite.ts` (sqlite). `[VERIFIED: drizzle.config.ts dual-config]`

## Architecture Patterns

### System Architecture Diagram

```
                                  REPORT PAGE (SSR-gated)
                                  /portal/assessment/[id]/report
                                            │
                                            ▼
                   ┌────────────────────────────────────────────────┐
                   │  1. auth.api.getSession()  ─→  redirect /login │
                   │  2. db.select().from(assessments).where(id)    │
                   │  3. hasAccess(role, userId, row) ─→ redirect   │
                   │  4. db.select().from(pillar_definitions)       │
                   │     db.select().from(pillar_page_copy)         │
                   │     db.select().from(pillar_prescriptions)     │
                   │     where assessment_id = id                   │
                   │  5. Build markers via REPORT_MARKERS +         │
                   │     getPeak360Rating() (already shipped)       │
                   └──────────────────────┬─────────────────────────┘
                                          │  props (definitions, pageCopy,
                                          │         prescriptions, markers)
                                          ▼
                       ┌─────────────────────────────────────────┐
                       │ <ReportShell> (NEW — replaces top half  │
                       │  of current Section11.tsx)              │
                       └────┬─────────────────────────────────┬──┘
                            │                                 │
                            ▼                                 ▼
            ┌─────────────────────────────┐        ┌──────────────────────────┐
            │ <PillarsGrid> 'use client'  │        │ <DetailedMarkerResults   │
            │  - computes score per pillar│        │   Disclosure>            │
            │    via mapping.ts (pure)    │        │  (collapsed; current     │
            │  - renders 5 PillarCards    │        │   marker grid moved here)│
            │  - owns modal open state    │        └──────────────────────────┘
            │  - <PillarModal>(Dialog)    │
            └─────────────────────────────┘

                                  PDF ROUTE (existing)
                                  /api/assessments/[id]/pdf
                                            │
                                            ▼
                   ┌────────────────────────────────────────────────┐
                   │  Same auth + ownership check (Phase 7 BL-05)   │
                   │  Same data load + add definitions/page-copy/   │
                   │    prescriptions to ReportData                 │
                   └──────────────────────┬─────────────────────────┘
                                          ▼
                                <Peak360Report data={...}>
                                  <Document><Page>
                                    ReportHeader / Disclaimer / ...
                                    ▶ <PillarsPage>  ← NEW, inserted
                                                        before MarkerTable
                                    <TierSummary>
                                    <MarkerTable>
                                    <InsightsSection>
                                  </Page></Document>

                                  ADMIN AUTHORING (NEW)
                                  /portal/admin/pillars                ← global definitions + page copy
                                  /portal/admin/assessments/[id]/prescriptions ← per-assessment

                                  Both routes:
                                    1. requireAdmin()  →  403 if non-admin
                                    2. Read existing rows server-side
                                    3. Render <AdminPillarsForm>/<AdminPrescriptionsForm>
                                    4. Forms POST/PATCH/DELETE to /api/admin/pillars or
                                       /api/admin/assessments/[id]/prescriptions
                                    5. Each write: requireAdmin() → DB upsert → logAuditEvent()
                                    6. Optimistic UI + Toast on response
```

### Component Responsibilities

| File | Type | Responsibility |
|---|---|---|
| `src/lib/pillars/mapping.ts` | Pure module (NEW) | `PILLAR_KEYS`, `markerToPillar(marker) -> PillarKey \| null`, `computePillarScore(markers) -> { score, status, breakdown, contributingCount }`. No I/O. |
| `src/lib/pillars/colors.ts` | Pure module (NEW) | `TRAFFIC_LIGHT_HEX: Record<'red'\|'amber'\|'green'\|'pending', string>`. Imported by both Tailwind arbitrary values AND PDF colour module (D-28 single source of truth). |
| `src/lib/pillars/types.ts` | Pure module (NEW) | `PillarKey`, `PillarStatus`, `PillarDefinition`, `PillarPrescription`, `PillarPageCopy`, `PillarScoreResult` types. |
| `src/lib/pillars/queries.ts` | Server module (NEW) | `getPillarDefinitions()`, `getPillarPageCopy()`, `getPillarPrescriptions(assessmentId)`. Drizzle queries; called from server components. |
| `src/components/ui/Dialog.tsx` | Client primitive (NEW) | Hand-rolled `role="dialog"` + `aria-modal="true"`, focus trap, ESC + backdrop close, `prefers-reduced-motion`. Modes: `'centered' \| 'bottom-sheet' \| 'auto'`. |
| `src/components/report/PillarsGrid.tsx` | Client orchestrator (NEW) | Computes per-pillar score from props.markers; renders 5 cards; owns modal open state. The ONLY component the report page imports for the pillar surface. |
| `src/components/report/PillarCard.tsx` | Client (NEW) | Score numeral, traffic-light pill, summary, drill-down chevron. Whole card is the click target; min-h 96px mobile. |
| `src/components/report/PillarModal.tsx` | Client (NEW) | 7 sections per UI-SPEC. Uses `Dialog` mode `'auto'`. |
| `src/components/report/DetailedMarkerResultsDisclosure.tsx` | Client (NEW) | `<details>`-based wrapper around the existing dense marker grid extracted from `Section11.tsx`. |
| `src/components/sections/Section11.tsx` | Client (REPLACE) | Becomes a thin `<ReportShell>` that renders `<PillarsGrid>` + `<DetailedMarkerResultsDisclosure>` (latter wraps the existing marker grid moved into a separate component). |
| `src/lib/pdf/components/PillarsPage.tsx` | Server-side react-pdf (NEW) | A4 single-page mirror, 3+2 grid, no interactivity. Per-pillar `summary` rendered if non-empty. |
| `src/lib/pdf/Peak360Report.tsx` | Existing (EDIT) | Insert `<PillarsPage>` before `<MarkerTable>`. |
| `src/lib/pdf/types.ts` | Existing (EDIT) | Extend `ReportData` with `definitions: PillarDefinition[]`, `pageCopy: PillarPageCopy`, `prescriptions: PillarPrescription[]`. |
| `src/app/portal/admin/pillars/page.tsx` | Server component (NEW) | `requireAdmin()`, fetch definitions + page copy, render `<AdminPillarsForm>`. |
| `src/app/portal/admin/pillars/AdminPillarsForm.tsx` | Client (NEW) | Edit form per UI-SPEC. POST/PATCH to `/api/admin/pillars`. |
| `src/app/portal/admin/assessments/[id]/prescriptions/page.tsx` | Server component (NEW) | `requireAdmin()`, fetch prescriptions for assessment, render `<AdminPrescriptionsForm>`. |
| `src/app/portal/admin/assessments/[id]/prescriptions/AdminPrescriptionsForm.tsx` | Client (NEW) | 5 per-pillar forms with per-pillar save + clear + Toast. |
| `src/app/api/admin/pillars/route.ts` | API route (NEW) | GET (list), PATCH (upsert) for definitions + page copy. `requireAdmin` + `logAuditEvent`. |
| `src/app/api/admin/assessments/[id]/prescriptions/route.ts` | API route (NEW) | GET (list), PATCH (upsert per pillar), DELETE (clear per pillar). `requireAdmin` + `logAuditEvent`. |
| `src/lib/db/schema.ts` | Existing (EDIT) | Add `pillarDefinitions`, `pillarPageCopy`, `pillarPrescriptions` tables (pg dialect). |
| `src/lib/db/schema-sqlite.ts` | Existing (EDIT) | Same tables (sqlite dialect). |
| `src/lib/db/index.ts` | Existing (EDIT) | Extend `runMigrations()` with `CREATE TABLE IF NOT EXISTS` for the three new tables in both dialects + idempotent seed inserts. |
| `src/lib/audit.ts` | Existing (EDIT) | Add to `AuditAction` union: `pillar_definition.update`, `pillar_page_copy.update`, `pillar_prescription.upsert`, `pillar_prescription.delete`. |

### Recommended Project Structure

```
src/
├── lib/
│   ├── pillars/                    # NEW pure-function pillar logic
│   │   ├── mapping.ts              #   marker→pillar classifier + score
│   │   ├── colors.ts               #   single source of truth for traffic-light hex
│   │   ├── types.ts                #   PillarKey, PillarStatus, PillarDefinition...
│   │   └── queries.ts              #   server-side Drizzle reads
│   ├── pdf/
│   │   ├── components/
│   │   │   └── PillarsPage.tsx     # NEW PDF mirror page
│   │   ├── colors.ts               # EDIT: re-export from pillars/colors.ts
│   │   ├── Peak360Report.tsx       # EDIT: insert <PillarsPage>
│   │   └── types.ts                # EDIT: extend ReportData
│   ├── audit.ts                    # EDIT: extend AuditAction union
│   └── db/
│       ├── schema.ts               # EDIT: add 3 tables (pg)
│       ├── schema-sqlite.ts        # EDIT: add 3 tables (sqlite)
│       └── index.ts                # EDIT: extend runMigrations + seed
├── components/
│   ├── ui/
│   │   └── Dialog.tsx              # NEW hand-rolled primitive
│   ├── report/                     # already exists
│   │   ├── PillarsGrid.tsx         # NEW
│   │   ├── PillarCard.tsx          # NEW
│   │   ├── PillarModal.tsx         # NEW
│   │   └── DetailedMarkerResultsDisclosure.tsx  # NEW
│   └── sections/
│       └── Section11.tsx           # REPLACE: thin ReportShell
└── app/
    ├── portal/
    │   ├── assessment/[id]/report/
    │   │   └── page.tsx            # EDIT: extend SSR data load with pillar reads
    │   └── admin/
    │       ├── pillars/
    │       │   ├── page.tsx        # NEW
    │       │   └── AdminPillarsForm.tsx  # NEW
    │       └── assessments/
    │           └── [id]/
    │               └── prescriptions/
    │                   ├── page.tsx               # NEW
    │                   └── AdminPrescriptionsForm.tsx  # NEW
    └── api/
        └── admin/
            ├── pillars/
            │   └── route.ts        # NEW
            └── assessments/
                └── [id]/
                    └── prescriptions/
                        └── route.ts # NEW
```

### Pattern 1: Dual-dialect Drizzle schema with idempotent seed

**What:** Every new table goes in BOTH `schema.ts` (pg) and `schema-sqlite.ts` (sqlite). The runtime migration in `src/lib/db/index.ts` uses `CREATE TABLE IF NOT EXISTS` for both dialects, then seeds the global `pillar_definitions` rows with `ON CONFLICT DO NOTHING` (pg) / `INSERT OR IGNORE` (sqlite).

**When to use:** Always for new tables in this codebase — verified pattern.

**Example:**
```typescript
// Source: src/lib/db/schema-sqlite.ts (existing pattern)
export const pillarDefinitions = sqliteTable('pillar_definitions', {
  pillarKey: text('pillar_key').primaryKey(),
  label: text('label').notNull(),
  shortSummary: text('short_summary').notNull(),
  plainMeaning: text('plain_meaning').notNull(),
  sortOrder: integer('sort_order').notNull(),
  updatedBy: text('updated_by').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const pillarPageCopy = sqliteTable('pillar_page_copy', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  heading: text('heading').notNull(),
  intro: text('intro').notNull(),
  updatedBy: text('updated_by').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const pillarPrescriptions = sqliteTable('pillar_prescriptions', {
  assessmentId: text('assessment_id').notNull().references(() => assessments.id, { onDelete: 'cascade' }),
  pillarKey: text('pillar_key').notNull(),
  summary: text('summary').notNull(),
  bullets: text('bullets', { mode: 'json' }),  // string[]
  fullPlanHref: text('full_plan_href'),
  updatedBy: text('updated_by').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.assessmentId, t.pillarKey] }),
}));
```

```typescript
// Source: src/lib/db/index.ts runMigrations() (existing pattern, extended)
if (isPostgres) {
  await d.execute(sql`CREATE TABLE IF NOT EXISTS "pillar_definitions" (...)`);
  await d.execute(sql`
    INSERT INTO pillar_definitions (pillar_key, label, short_summary, plain_meaning, sort_order, updated_by, updated_at)
    VALUES ('cardiometabolic', 'Cardiometabolic Health', '...', '...', 0, 'system', ${Date.now()})
    ON CONFLICT (pillar_key) DO NOTHING
  `);
  // ...repeat for the four other pillars + page copy
} else {
  // sqlite version with INSERT OR IGNORE
}
```

### Pattern 2: Admin route with `requireAdmin` + transaction + audit

**What:** Verified shape from `src/app/api/admin/users/[userId]/role/route.ts` (Phase 7 BL-02). Every admin write route follows this skeleton.

**When to use:** Every Phase 8 admin write endpoint.

**Example:**
```typescript
// Source: src/app/api/admin/users/[userId]/role/route.ts:19-107
import { requireAdmin } from '@/lib/auth-helpers';
import { logAuditEvent, getRequestContext } from '@/lib/audit';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [session, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;

  const { id: assessmentId } = await params;
  const body = await request.json().catch(() => null);
  // validate body…

  // Atomic upsert
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.transaction(async (tx: any) => {
    await tx.insert(pillarPrescriptions)
      .values({ assessmentId, pillarKey, summary, bullets, fullPlanHref, updatedBy: session.user.id, updatedAt: Date.now() })
      .onConflictDoUpdate({
        target: [pillarPrescriptions.assessmentId, pillarPrescriptions.pillarKey],
        set: { summary, bullets, fullPlanHref, updatedBy: session.user.id, updatedAt: Date.now() },
      });
  });

  const ctx = await getRequestContext();
  await logAuditEvent({
    userId: session.user.id,
    action: 'pillar_prescription.upsert',
    resourceType: 'pillar_prescription',
    resourceId: `${assessmentId}:${pillarKey}`,
    metadata: { before_summary_hash, after_summary_hash },  // sha256 short hashes (D-16)
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  return NextResponse.json({ success: true });
}
```

### Pattern 3: SSR-gated portal report page

**What:** `auth.api.getSession` → fetch row → `hasAccess(role, userId, row)` → `redirect`/`notFound` BEFORE rendering chrome. Locked in Phase 7 BL-05 and currently in `src/app/portal/assessment/[id]/report/page.tsx`.

**When to use:** All read paths for assessment-scoped data. Phase 8 extends the existing data load — does NOT change the gate shape.

**Example:**
```typescript
// Source: src/app/portal/assessment/[id]/report/page.tsx:37-69 + Phase 8 extension
const rawSession = await auth.api.getSession({ headers: await headers() });
if (!rawSession?.user) redirect('/login');
const session = rawSession as unknown as AuthSession;

const [row] = await db.select().from(assessments).where(eq(assessments.id, id));
if (!row) notFound();
if (!hasAccess(session.user.role, session.user.id, row)) redirect('/portal');

// Phase 8 extension — definitions/page-copy/prescriptions read AFTER ownership gate
const [definitions, [pageCopy], prescriptions] = await Promise.all([
  db.select().from(pillarDefinitions).orderBy(pillarDefinitions.sortOrder),
  db.select().from(pillarPageCopy).limit(1),
  db.select().from(pillarPrescriptions).where(eq(pillarPrescriptions.assessmentId, id)),
]);

return <ReportShell definitions={definitions} pageCopy={pageCopy} prescriptions={prescriptions} assessmentId={id} />;
```

### Pattern 4: Hand-rolled focus-trap dialog (no Radix)

**What:** UI-SPEC §Design System mandates a hand-rolled `Dialog`. The `ConfirmDeleteModal.tsx` already in the codebase is a good seed; UI-SPEC requires more (focus trap, body scroll lock, mode='auto' breakpoint switch, drag handle on bottom-sheet, sticky 44px close button).

**When to use:** Every modal in this phase (pillar drill-down, admin destructive confirm).

**Example:**
```typescript
// Sketch — full component lives in src/components/ui/Dialog.tsx
'use client';
import { useEffect, useRef } from 'react';

export function Dialog({ open, onClose, mode = 'auto', ariaLabel, children }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // ESC + initial focus
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    panelRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Focus trap — walk tabbable nodes inside panelRef on Tab
  // (full implementation: see Phase 7 ConfirmDeleteModal.tsx for the seed; extend to bidirectional Tab/Shift+Tab)

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center"
         role="dialog" aria-modal="true" aria-label={ariaLabel} onClick={onClose}>
      <div ref={panelRef}
           onClick={(e) => e.stopPropagation()}
           className={mode === 'bottom-sheet' || mode === 'auto'
             ? 'w-full md:max-w-[640px] md:rounded-2xl rounded-t-2xl bg-white p-6 md:p-8 max-h-[90vh] overflow-y-auto'
             : 'max-w-[640px] rounded-2xl bg-white p-8 max-h-[90vh] overflow-y-auto'}>
        {children}
      </div>
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **Re-implementing `getPeak360Rating()`** — it already accepts gender/age and is the contract for tier resolution. Pillar score consumes its output, never bypasses it.
- **Computing pillar scores client-side** — always compute on the server (or in pure functions consumed by both sides). The same `computePillarScore()` must produce identical numbers for the portal SSR render and the PDF generation.
- **Adding a new toast library** — UI-SPEC explicitly forbids. Reuse `src/components/ui/Toast.tsx`.
- **Importing the existing `TIER_COLORS` for traffic-light fill** — the 5-tier and 3-state palettes are deliberately separate (D-11). Cross-pollination causes the visual confusion the design is trying to avoid.
- **Letting the pillar score fall through to `0`** when no rated markers exist — must be `null` and render the "Data pending" pill (D-08).
- **Trying to map Section 10 (Balance & Power) markers** — see Pitfall #1; no markers exist for this section in `REPORT_MARKERS`.
- **Putting destructive admin actions on the read-only client report** — every destructive UI is admin-only and lives behind the `requireAdmin` gate (UI-SPEC §Destructive actions).
- **Injecting raw HTML into the modal body** — admin-authored copy is rendered as React text children only. No raw-HTML injection prop, ever.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Per-marker tier rating | A new rating function | `getPeak360Rating()` from `src/lib/normative/ratings.ts` | Already gender/age aware; versioned via `normativeVersionId`. Bypassing this re-introduces the bugs Phase 1 + 3 already fixed. |
| Auth + role check | Custom session middleware for new admin routes | `requireAdmin()` from `src/lib/auth-helpers.ts` | Verified shape; tested in `tests/security/`. |
| Audit logging | A new audit pattern for pillar writes | `logAuditEvent()` from `src/lib/audit.ts` (extend the `AuditAction` union with the four new actions) | Fire-and-forget contract is already documented; failures don't break the main op. |
| Toast notifications | A toast library | `src/components/ui/Toast.tsx` | Already shipped (Phase 7); 3-second auto-dismiss + a11y roles. |
| Dual-DB schema | Hand-written CREATE TABLE only | Drizzle `sqliteTable` / `pgTable` + the `runMigrations()` IF NOT EXISTS pattern | `npm run db:generate` produces migrations; `runMigrations()` is the production path. |
| Markdown / rich text in admin authoring | A markdown editor | Plain `<textarea>` with newline handling for bullets ("one per line") | UI-SPEC explicitly says plain text inputs; no rich-text dependency. |
| Modal a11y | A dialog library (Radix, Headless UI) | Hand-rolled per UI-SPEC §Design System | UI-SPEC defaults to hand-rolled and explicitly says "Planner may swap in Radix only if a separate RESEARCH.md task surfaces that the hand-rolled approach blocks delivery". This research does NOT surface that need. |
| PDF text components | New react-pdf wrappers | Reuse `src/lib/pdf/styles.ts` heading/body styles; reuse `src/lib/pdf/colors.ts` token names | D-28 forbids new PDF tokens. |
| Hash for audit log payload | New crypto util | `crypto.subtle.digest` (Node) or `node:crypto.createHash('sha256')` for the short hashes in the prescription audit metadata | Native, zero deps. |

**Key insight:** Phase 8 introduces ZERO new npm packages. Every cross-cutting concern (auth, audit, toasts, dialogs, PDF, DB) has a verified pattern shipped in Phases 2/4/5/7. The novel work is the pillar mapping + scoring (pure functions) and the new tables. If a plan adds a new dependency, that's a smell — challenge it.

## Runtime State Inventory

> Phase 8 is a feature-add, not a rename/refactor. There are no string renames cascading through services, but DB tables are added and the PDF output shape changes. The minimal inventory:

| Category | Items Found | Action Required |
|---|---|---|
| Stored data | None — new tables are added; no existing data is renamed or migrated. Existing `assessment_sections.data` JSON blobs are unchanged. | None |
| Live service config | None — no external services use a "Section 11" identifier. The internal API path `/api/assessments/[id]/pdf` is unchanged. | None |
| OS-registered state | None — no scheduled tasks, no pm2/launchd/systemd entries reference Section 11 or the report shape. | None |
| Secrets / env vars | None — `BETTER_AUTH_SECRET`, `DATABASE_URL`, `OPENAI_API_KEY` are unchanged. No new env vars introduced. | None |
| Build artifacts | The first deploy after Phase 8 must run `scripts/db-push.sh` (production) before the new app version goes live, or `runMigrations()` covers it on first request. The PDF output for existing assessments will gain the new pillars page automatically — clients re-downloading old reports will see the new shape, which is the intended UX. | Run `scripts/db-push.sh` against production Postgres before promoting the deploy. Verified in MEMORY.md `[reference_deployment.md]`. |

**The canonical question:** *After every file in the repo is updated, what runtime systems still have the old string cached, stored, or registered?* — Answer: nothing. This is a pure additive change.

## Common Pitfalls

### Pitfall 1 — D-05 Balance pillar mapping is broken in the current codebase

**What goes wrong:** CONTEXT D-05 states Balance = "balance-subset of `Mobility & Flexibility` (any marker whose `testKey`, `label`, or comment contains 'balance' / 'sway' / 'stability')". A grep of `src/lib/report-markers.ts` shows ZERO markers under `category: 'Mobility & Flexibility'` whose testKey/label contains those substrings. The only "balance"-named markers are `single_leg_balance_left` / `single_leg_balance_right`, both under `category: 'Strength Testing'` (Section 8). Section 10 (Balance & Power, per ROADMAP) has zero markers in `REPORT_MARKERS`.

If implemented literally, the Balance pillar will have zero rated markers and ALWAYS render "Data pending" — defeating the whole point.

**Why it happens:** D-05 was written from intent (the conceptual mapping the user wants) without grounding in the actual `REPORT_MARKERS` shape. The data layer didn't keep pace with the conceptual category.

**How to avoid:** During PLAN, surface this back to the user with three options. The planner should NOT silently re-interpret D-05 — it's a locked decision.
- **Option A (recommended):** Pull the two `single_leg_balance_*` markers OUT of the Strength pillar and INTO the Balance pillar. Mapping becomes "any testKey containing 'balance' / 'sway' / 'stability', regardless of category". This costs Strength two markers but gives Balance non-zero data.
- **Option B:** Leave Balance with zero rated markers in v1; it always renders "Data pending"; document as a known gap to be filled when Section 10 normative ranges land.
- **Option C:** Defer Balance from v1 — ship the four other pillars; add Balance in a follow-up phase. Conflicts with D-04 ("five pillars verbatim") so this is the weakest option.

**Warning signs:** Reviewer sees a "0 rated markers" empty state on Balance during local testing.

`[VERIFIED: src/lib/report-markers.ts grep — only 2 single_leg_balance markers, both under category='Strength Testing']`

### Pitfall 2 — D-15 audit-log session-invalidation race

**What goes wrong:** The Phase 7 admin-route pattern is "transaction → setRole → audit". `auth.api.setRole` is specific to user role changes. Phase 8 admin writes don't need the `setRole` call (no session invalidation needed for prescription writes). Forgetting this and copy-pasting the full Phase 7 pattern adds an unnecessary call that errors silently.

**Why it happens:** The Phase 7 pattern in `src/app/api/admin/users/[userId]/role/route.ts` is the "canonical" reference, but it's solving a session-invalidation problem that doesn't exist in Phase 8.

**How to avoid:** Use only the parts of the Phase 7 pattern that apply: (1) `requireAdmin`, (2) `db.transaction`, (3) `logAuditEvent`. Skip `auth.api.setRole` entirely.

**Warning signs:** Pillar prescription save errors in console with `auth.api.setRole is not a function` or "user not found".

### Pitfall 3 — Drizzle composite-primary-key syntax differs between dialects

**What goes wrong:** In `drizzle-orm/sqlite-core` and `drizzle-orm/pg-core`, the composite PK is declared with the second-argument table-config callback `(t) => ({ pk: primaryKey({ columns: [...] }) })`. Drizzle's docs show several syntactic variants depending on version. Get this wrong and `drizzle-kit generate` produces a malformed migration.

**Why it happens:** Composite PKs are uncommon in this codebase — every existing table uses a serial/text single-column PK. Phase 8's `pillar_prescriptions` is the FIRST composite PK.

**How to avoid:** Match the exact Drizzle 0.45.1 syntax for composite PKs. Verify the generated SQL with `drizzle-kit generate` BEFORE pushing. Test on local sqlite first (`npm run db:push`), then production pg.

**Warning signs:** `drizzle-kit generate` output omits the PK or generates two single-column PKs.

`[CITED: https://orm.drizzle.team/docs/indexes-constraints#primary-key — composite PK pattern]`

### Pitfall 4 — `runMigrations()` in `src/lib/db/index.ts` doesn't auto-run on every startup

**What goes wrong:** The runtime migration is invoked lazily; new tables may not exist on the first request after deploy. Phase 5 used a hot-path workaround. The seed inserts depend on the table existing.

**Why it happens:** `runMigrations()` is gated by the `globalForDb.migrated` flag and called on demand. Reading the literal code, it's only triggered explicitly by callers — not automatically on `getDb()`.

**How to avoid:** Confirm the trigger path. Verified pattern in this codebase: production uses `scripts/db-push.sh` (drizzle-kit push) at deploy time; the runtime `runMigrations()` is a belt-and-braces helper. The Phase 8 seed (5 pillar_definitions rows + 1 page_copy row) MUST be in `runMigrations()` AND idempotent so re-runs are safe.

**Warning signs:** Production app boots, gets a request, and 500s on `pillar_definitions does not exist`.

`[VERIFIED: src/lib/db/index.ts — runtime migration is opt-in; production uses scripts/db-push.sh]`

### Pitfall 5 — PDF colour drift between portal CSS and PDF constants

**What goes wrong:** D-28 mandates a single source of truth for traffic-light hex values, mirrored between portal CSS-in-JS / Tailwind arbitrary values and `src/lib/pdf/colors.ts`. If a developer hardcodes `'#10b981'` in `PillarsPage.tsx` instead of importing from `src/lib/pillars/colors.ts`, future changes drift between the two surfaces.

**Why it happens:** react-pdf doesn't use Tailwind. The path of least resistance is to copy hex values inline. Both sides currently encode hex values inline (`src/lib/pdf/colors.ts:TIER_COLORS_PDF` is a duplicate of the 5-tier palette in CSS).

**How to avoid:** Create `src/lib/pillars/colors.ts` first. Both portal components AND `src/lib/pdf/colors.ts` import from it. Add a sanity test that asserts `pdf colors.greenStatus === pillars colors.green`. This is exactly D-28's intent.

**Warning signs:** A pillar shows green in the portal but amber in the PDF for the same assessment.

### Pitfall 6 — Forgetting to update BOTH dialect schema files

**What goes wrong:** New table added to `schema.ts` (pg) but not `schema-sqlite.ts` (or vice versa). Local dev (sqlite) works; production (pg) breaks, or vice versa.

**Why it happens:** The dual-schema pattern is unusual. Drizzle's docs show one schema file. The Peak360 codebase splits by dialect.

**How to avoid:** Every schema change is a paired diff. PR/plan checklist explicitly lists both files. The planner should make "update both schema files" a single task action so they cannot diverge.

**Warning signs:** `npm run dev` works (sqlite reads from schema-sqlite.ts) but `DATABASE_URL=...; npm run build` errors on missing column / table.

`[VERIFIED: src/lib/db/index.ts:9-30 — dialect chosen at runtime by DATABASE_URL]`

### Pitfall 7 — Modal focus trap regressing keyboard a11y

**What goes wrong:** Hand-rolled focus traps frequently get `Shift+Tab` wrong (don't cycle backward at the first element) or fail to restore focus to the originating card on close. UI-SPEC §Focus & keyboard contract is explicit; missing this is a P0 a11y bug.

**Why it happens:** Focus management is fiddly. The seed `ConfirmDeleteModal.tsx` only handles ESC and click-outside, not bidirectional Tab.

**How to avoid:** Implement focus trap per UI-SPEC's exact contract. Verify with manual keyboard-only testing on at least one pillar card → modal → close cycle. Save the originating element ref before opening; restore on close.

**Warning signs:** Pressing Shift+Tab inside the modal escapes to the page; closing the modal lands focus on `<body>` instead of the card.

`[CITED: WAI-ARIA Authoring Practices, Modal Dialog pattern]`

### Pitfall 8 — Section 11 disclosure breaks existing PDF generation

**What goes wrong:** The PDF data loader in `/api/assessments/[id]/pdf/route.ts` builds `markers` from `REPORT_MARKERS`. If the planner moves Section 11's marker grid into a wrapper component but ALSO refactors how markers are computed, the PDF can desync. The portal report and PDF must compute markers + ratings from the SAME path.

**Why it happens:** The portal currently uses `Section11.tsx` to compute markers client-side; the PDF route computes them server-side. Both paths should converge.

**How to avoid:** Lift the `markers` computation server-side in `report/page.tsx` (it's already a server component) so the portal renders pre-computed markers. Don't recompute in `Section11.tsx`. The `<DetailedMarkerResultsDisclosure>` receives the same `markers` array as the new `<PillarsGrid>`.

**Warning signs:** Pillar score in portal differs from pillar score in PDF for the same assessment.

`[VERIFIED: src/components/sections/Section11.tsx imports getPeak360Rating + generatePeak360Insights — currently runs client-side]`

## Code Examples

### Computing per-pillar score (pure function)

```typescript
// Source: pattern derived from src/lib/normative/ratings.ts contract + CONTEXT D-08
import type { ReportMarker } from '@/lib/pdf/types';
import type { PillarKey, PillarStatus } from '@/lib/pillars/types';

const TIER_VALUE: Record<NonNullable<ReportMarker['tier']>, number> = {
  elite: 100, great: 80, normal: 60, cautious: 40, poor: 20,
};

export function computePillarScore(markers: ReportMarker[]): {
  score: number | null;
  status: PillarStatus;
  contributingCount: number;
} {
  const rated = markers.filter((m) => m.tier !== null);
  if (rated.length === 0) return { score: null, status: 'pending', contributingCount: 0 };
  const sum = rated.reduce((a, m) => a + TIER_VALUE[m.tier as keyof typeof TIER_VALUE], 0);
  const score = Math.round(sum / rated.length);
  const status: PillarStatus =
    score >= 70 ? 'green' :
    score >= 40 ? 'amber' :
    'red';
  return { score, status, contributingCount: rated.length };
}
```

### Marker → pillar classifier

```typescript
// Source: pattern derived from src/lib/report-markers.ts shape + CONTEXT D-05
import type { MarkerDef } from '@/lib/report-markers';
import type { PillarKey } from '@/lib/pillars/types';

const PRIMARY_CARDIO_SUBCATS = new Set(['Lipid Panel', 'Glucose & Metabolic', 'Inflammation']);
const BP_KEYS = new Set(['blood_pressure_systolic', 'bp_diastolic']);
const SUPPORTING_SUBCATS = new Set([
  'Hormones', 'Thyroid', 'Vitamins & Minerals', 'Iron Studies',
  'Liver Function', 'Kidney & Electrolytes', 'Heavy Metals', 'Full Blood Count',
]);

export function markerToPillar(m: MarkerDef): { pillar: PillarKey | null; supporting: boolean } {
  if (m.category === 'Body Composition') return { pillar: 'bodyComposition', supporting: false };
  if (m.category === 'Cardiovascular Fitness') {
    if (BP_KEYS.has(m.testKey)) return { pillar: 'cardiometabolic', supporting: false };
    return { pillar: 'vo2', supporting: false };
  }
  if (m.category === 'Strength Testing') {
    // PITFALL #1 — Balance markers live under Strength Testing in the current data
    if (/balance|sway|stability/i.test(m.testKey + ' ' + m.label)) {
      return { pillar: 'balance', supporting: false };
    }
    return { pillar: 'strength', supporting: false };
  }
  if (m.category === 'Mobility & Flexibility') {
    // CONTEXT D-05 says Balance comes from here, but no markers match — see Pitfall #1
    if (/balance|sway|stability/i.test(m.testKey + ' ' + m.label)) {
      return { pillar: 'balance', supporting: false };
    }
    return { pillar: null, supporting: false };  // Mobility itself is not a pillar
  }
  if (m.category === 'Blood Tests & Biomarkers') {
    if (PRIMARY_CARDIO_SUBCATS.has(m.subcategory ?? '')) {
      return { pillar: 'cardiometabolic', supporting: false };
    }
    if (SUPPORTING_SUBCATS.has(m.subcategory ?? '')) {
      return { pillar: 'cardiometabolic', supporting: true };  // D-06: surfaces in modal, not in score
    }
  }
  return { pillar: null, supporting: false };
}
```

### Admin route shape (upsert + audit)

```typescript
// Source: pattern from src/app/api/admin/users/[userId]/role/route.ts + Phase 8 data
import { requireAdmin } from '@/lib/auth-helpers';
import { logAuditEvent, getRequestContext } from '@/lib/audit';
import { db } from '@/lib/db';
import { pillarPrescriptions } from '@/lib/db/schema';
import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [session, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;

  const { id: assessmentId } = await params;
  const body = await request.json().catch(() => null);
  if (!body?.pillarKey || !body?.summary) {
    return NextResponse.json({ error: 'Missing pillarKey or summary' }, { status: 400 });
  }

  // Read previous summary for audit hash
  const [prev] = await db.select().from(pillarPrescriptions)
    .where(and(eq(pillarPrescriptions.assessmentId, assessmentId), eq(pillarPrescriptions.pillarKey, body.pillarKey)));
  const beforeHash = prev?.summary ? createHash('sha256').update(prev.summary).digest('hex').slice(0, 12) : null;
  const afterHash = createHash('sha256').update(body.summary).digest('hex').slice(0, 12);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.transaction(async (tx: any) => {
    await tx.insert(pillarPrescriptions).values({
      assessmentId, pillarKey: body.pillarKey,
      summary: body.summary,
      bullets: body.bullets ?? null,
      fullPlanHref: body.fullPlanHref ?? null,
      updatedBy: session.user.id,
      updatedAt: Date.now(),
    }).onConflictDoUpdate({
      target: [pillarPrescriptions.assessmentId, pillarPrescriptions.pillarKey],
      set: {
        summary: body.summary,
        bullets: body.bullets ?? null,
        fullPlanHref: body.fullPlanHref ?? null,
        updatedBy: session.user.id,
        updatedAt: Date.now(),
      },
    });
  });

  const ctx = await getRequestContext();
  await logAuditEvent({
    userId: session.user.id,
    action: 'pillar_prescription.upsert',
    resourceType: 'pillar_prescription',
    resourceId: `${assessmentId}:${body.pillarKey}`,
    metadata: { before_summary_hash: beforeHash, after_summary_hash: afterHash },
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });

  return NextResponse.json({ success: true });
}
```

### PDF pillar page (react-pdf View composition)

```tsx
// Source: pattern derived from src/lib/pdf/Peak360Report.tsx + D-26 spec
import { Page, View, Text } from '@react-pdf/renderer';
import { COLORS } from '@/lib/pdf/colors';
import { TRAFFIC_LIGHT_HEX } from '@/lib/pillars/colors';
import { styles } from '@/lib/pdf/styles';
import type { PillarDefinition, PillarPrescription } from '@/lib/pillars/types';

export function PillarsPage({ definitions, prescriptions, scoresByPillar }: {
  definitions: PillarDefinition[];
  prescriptions: PillarPrescription[];
  scoresByPillar: Record<string, { score: number | null; status: 'red' | 'amber' | 'green' | 'pending' }>;
}) {
  return (
    <Page size="A4" style={styles.page}>
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: COLORS.navy }}>
          The Peak Living Pillars
        </Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {definitions.map((d) => {
          const s = scoresByPillar[d.pillarKey];
          const px = prescriptions.find((p) => p.pillarKey === d.pillarKey);
          return (
            <View key={d.pillarKey} style={{
              width: '32%', borderWidth: 0.5, borderColor: COLORS.border,
              borderRadius: 6, padding: 10,
            }}>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: COLORS.navy }}>
                {d.label}
              </Text>
              <Text style={{ fontSize: 24, fontFamily: 'Helvetica-Bold', marginTop: 4 }}>
                {s.score ?? '—'}<Text style={{ fontSize: 10 }}>/100</Text>
              </Text>
              <View style={{
                marginTop: 4, paddingHorizontal: 6, paddingVertical: 2,
                backgroundColor: TRAFFIC_LIGHT_HEX[s.status], alignSelf: 'flex-start', borderRadius: 8,
              }}>
                <Text style={{ fontSize: 8, color: '#fff' }}>
                  {s.status === 'green' ? 'Strong' : s.status === 'amber' ? 'Needs improvement' : s.status === 'red' ? 'Priority' : 'Data pending'}
                </Text>
              </View>
              <Text style={{ fontSize: 8, color: COLORS.textSecondary, marginTop: 6 }}>
                {d.shortSummary}
              </Text>
              {px?.summary && (
                <View style={{ marginTop: 6, paddingTop: 4, borderTopWidth: 0.5, borderTopColor: COLORS.borderLight }}>
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLORS.navy }}>Recommended next steps</Text>
                  <Text style={{ fontSize: 8, marginTop: 2 }}>{px.summary}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
      <Text style={{ fontSize: 7, color: COLORS.textSecondary, marginTop: 14, fontStyle: 'italic' }}>
        Open this report in your portal to drill into each pillar and see your coach's recommendations.
      </Text>
    </Page>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Section 11 dense category-grouped marker grid | Five-pillar Peak Living module + collapsed disclosure under | This phase | Replaces the top-of-page client-facing surface; legacy grid preserved for coaches |
| Single-source PDF identical to portal | PDF mirror + portal interactive (modal drill-down) | This phase | PDF gains a dedicated "executive summary" first page; modal content is portal-only |
| Hardcoded clinical copy in TS files | Admin-authored definitions + per-assessment prescriptions | This phase | Coaches/admins can update copy without a deploy; per-client recommendations become first-class data |
| Tier-based scoring only at marker level | Pillar-level rollup score (0–100) + traffic-light status | This phase | Composite score at pillar level; marker-level 5-tier preserved inside modal |
| Single-dialect Drizzle schema | Dual-dialect (pg + sqlite) with parallel files | Pre-existing (verified in repo) | New tables MUST be added in both files; Phase 8 follows established pattern |
| Custom fetch in client components for everything | SSR-resolved props for page-level data | Phase 7 BL-05 + locked here in D-21 | Phase 8 extends server-side load; no new `fetch()` calls in `Section11.tsx` for definitions/prescriptions |

**Deprecated/outdated:**
- Adding any new client-side data fetch from the report page — D-21 forbids; SSR is the contract.
- Reaching for Radix UI / Headless UI for the modal — UI-SPEC's hand-rolled default supersedes Claude's training-era reflex.
- Adding a CSS framework or component library (DaisyUI, shadcn) — UI-SPEC §Registry Safety explicitly says shadcn is not initialised; Tailwind v4 with `@theme inline` is the contract.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | `runMigrations()` in `src/lib/db/index.ts` is the right place to add the seed inserts (and is invoked at app boot in production). I verified the function exists and has the IF-NOT-EXISTS pattern, but did not trace exactly when/how it's called in production deploys. | Pitfall #4, Pattern 1 | If `runMigrations()` is dead code in production, the seed never runs. Mitigation: planner should add a one-time `npm run db:seed-pillars` script as belt-and-braces, mirroring `db:seed-admin`. |
| A2 | `drizzle-orm@0.45.1` accepts the `(t) => ({ pk: primaryKey({ columns: [...] }) })` composite-PK syntax in both `sqlite-core` and `pg-core`. The codebase has no existing composite PK to verify against. | Pitfall #3, Pattern 1 | If the syntax differs at this exact version, `drizzle-kit generate` produces broken SQL. Mitigation: verify syntax with a 1-line `drizzle-kit generate` smoke test before writing real migrations. |
| A3 | The `single_leg_balance_*` markers (currently under category 'Strength Testing') are the user's intent for the Balance pillar. CONTEXT D-05 says "Mobility & Flexibility" but the data layer doesn't match. The user may genuinely want Balance to be empty in v1. | Pitfall #1 | Wrong assumption = either Balance is always "Data pending" OR Strength loses two markers it expects. Resolution: surface explicitly to user during plan-check. |
| A4 | Better Auth's `setRole` is NOT needed for Phase 8 admin routes. I verified the Phase 7 reference but did not test the Phase 8 routes against it. | Pitfall #2 | Adding the call wastes a session round-trip but is safe (failures swallowed). Removing it (recommended) keeps routes simpler. |
| A5 | The `PillarsPage.tsx` PDF component fits in a single A4 page with the prescription summaries. UI-SPEC says "single page" but I did not measure the actual height. With long admin-authored summaries, the page may overflow. | Pitfall — under-specified | If overflow happens, react-pdf will spill onto another page silently. Planner should test with a long prescription (~3 lines per pillar) to verify single-page constraint holds. If not, the layout needs to truncate summaries or the PDF needs a `wrap` rule. |
| A6 | Reusing the existing `Toast` component (`src/components/ui/Toast.tsx`) covers the admin authoring success/error UX without modification. I read its source and it accepts `{ variant, message, onDismiss }` — sufficient. | Don't Hand-Roll table | Low risk — if Toast needs extension (e.g., action buttons), planner adds props without breaking existing callers. |

**If this table has entries:** Each `[ASSUMED]` claim above warrants a quick confirmation during /gsd-plan-phase before locking the plan. A1, A2, and A3 are the highest-risk; A3 in particular requires user input (it's a data-vs-intent mismatch in a locked decision).

## Open Questions

1. **D-05 Balance pillar mapping ambiguity (HIGHEST PRIORITY)**
   - What we know: D-05 says Balance comes from "balance-subset of Mobility & Flexibility". Verified: zero such markers exist in `REPORT_MARKERS`.
   - What's unclear: Did the user intend the existing `single_leg_balance_*` markers (currently under Strength Testing) to power Balance? Or is Balance v1 intentionally always "Data pending" until Section 10 normative data lands?
   - Recommendation: Plan-check phase or discuss-phase loop should resolve this with the user before Wave 1 of execution. Default fallback: implement Option A (re-classify the two `single_leg_balance_*` markers into Balance) as it produces a usable pillar score in v1; add a code comment marking it as a temporary classification rule until Section 10 data lands.

2. **`pillar_page_copy` storage shape**
   - What we know: D-19 explicitly delegates to the planner. Two options: separate one-row table OR sentinel row in `pillar_definitions`.
   - What's unclear: User preference. The two are functionally equivalent.
   - Recommendation: Use a separate one-row `pillar_page_copy` table — cleaner read paths, three columns, no special-case in queries. CONTEXT §Code Insights Integration Points already lists it as a separate table.

3. **Admin form save granularity (per-pillar vs save-all)**
   - What we know: D-15 + UI-SPEC say both are acceptable.
   - What's unclear: User preference; UX nuance.
   - Recommendation: Per-pillar save buttons with optimistic update + Toast — produces granular audit log entries, lighter cognitive load (admin sees one Save button per pillar form), matches "Save plan" copy in UI-SPEC.

4. **`bullets` JSON encoding in admin form**
   - What we know: `bullets` is JSON-encoded `string[]`. UI-SPEC says input is "one per line".
   - What's unclear: What about embedded newlines? Empty strings? Trim behaviour?
   - Recommendation: Frontend splits on `\n`, trims each, drops empties. Backend stores as JSON array. Handle edge case: if all bullets blank after trim, store `null` not `[]`.

5. **`audit_logs.action` union literal extension**
   - What we know: `src/lib/audit.ts` exports `AuditAction` union. Phase 8 needs `pillar_definition.update`, `pillar_page_copy.update`, `pillar_prescription.upsert`, `pillar_prescription.delete`.
   - What's unclear: Nothing — this is a one-line edit. Listed for completeness so the planner doesn't miss it.

6. **Mobile testing surface**
   - What we know: UI-SPEC says "mobile is first-class".
   - What's unclear: Is there a regression test or Playwright project that covers the bottom-sheet modal? `package.json` shows `test:e2e:mobile` exists.
   - Recommendation: Planner should add a Playwright test for: open pillar card → modal renders as bottom-sheet at viewport < 768px → swipe/click close → focus returns to card.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| Node.js | Build + runtime | ✓ (assumed; project ships) | 20+ inferred from `@types/node: ^20` | — |
| npm | Dependency mgmt | ✓ | n/a | — |
| SQLite (better-sqlite3) | Local dev | ✓ | 12.6.2 | — |
| PostgreSQL (pg driver) | Production | ✓ in package; Postgres instance assumed available via DATABASE_URL | 8.18.0 | — |
| `@react-pdf/renderer` | PDF mirror | ✓ | 4.4.0 | — |
| Better Auth | Session/role | ✓ | 1.6.2 | — |
| Drizzle ORM + drizzle-kit | Schema + migrations | ✓ | 0.45.1 / 0.31.9 | — |
| Vitest + jsdom | Unit tests | ✓ | 4.0.18 / 28.1.0 | — |
| @playwright/test | E2E tests | ✓ | 1.58.2 | Skip mobile-bottom-sheet E2E if Playwright config doesn't include mobile project — verify `test:e2e:mobile` script targets a real config |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None — Phase 8 needs zero new dependencies.

**Production deploy verification:** Per `MEMORY.md` (`reference_deployment.md`), DO App Platform auto-deploys from `main`. The pre-deploy step is `scripts/db-push.sh` against production Postgres for schema changes. No new SECRETs introduced (per `MEMORY.md` `feedback_doctl_spec_secrets.md`), so no `doctl apps update --spec` flow needed for this phase.

## Security Domain

`security_enforcement` is not explicitly false in `.planning/config.json`, so this section is included.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---|---|---|
| V2 Authentication | yes | Better Auth `auth.api.getSession` (already shipped); `requireAdmin()` from `src/lib/auth-helpers.ts` for write paths |
| V3 Session Management | yes (inherited) | Better Auth handles sessions; no Phase 8 changes |
| V4 Access Control | yes | Two layers: (1) SSR ownership gate in `report/page.tsx` (Phase 7 BL-05) for read; (2) `requireAdmin()` + 403 on every Phase 8 admin write route |
| V5 Input Validation | yes | API routes manually validate `pillarKey` against the literal-union allow-list, `summary` non-empty, `fullPlanHref` is a valid URL or null. No zod/joi in this codebase yet — manual validation matches existing patterns (see `src/app/api/admin/users/[userId]/role/route.ts` which validates `role` as `'admin'|'coach'|'client'`) |
| V6 Cryptography | yes | SHA-256 short hashes for audit log payload via `node:crypto.createHash` (zero deps); never hand-rolled |
| V7 Error Handling | yes | All write routes return generic error messages on failure (no stack traces); audit logging is fire-and-forget so it cannot leak |
| V8 Data Protection | yes (inherited) | Sensitive data continues to use Phase 4 AES-256-GCM at rest; pillar_definitions / pillar_prescriptions copy is admin-authored content (not encrypted, low sensitivity) |
| V13 API & Web Service | yes | New `/api/admin/...` routes: JSON body validation, no SSRF surface (no outbound calls based on user input), rate limiting via Better Auth's session model (no per-route limits in this codebase yet) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---|---|---|
| Cross-client IDOR on prescriptions read | Information Disclosure | The report page's existing SSR ownership gate (`hasAccess(role, userId, row)`) gates ALL read paths. Pillar prescriptions are loaded INSIDE the gated branch (D-21). Static-source IDOR test in `tests/security/` should be extended for this phase. |
| Non-admin elevation to write prescriptions | Elevation of Privilege | `requireAdmin()` returns 403 on every write route. Mirrors Phase 7 BL-02 pattern. Add regression test: client/coach session → PATCH /api/admin/pillars → expect 403. |
| Audit log tampering / dropped writes | Repudiation | `logAuditEvent` is fire-and-forget — audit failures don't break the main op (existing contract). Audit completeness verified by manual review of `audit_logs` table after Phase 8 ships. |
| XSS via admin-authored prescription summary | Tampering / Information Disclosure | React's default JSX escaping handles this; admin-authored prose is rendered as React text children only — no raw-HTML injection prop is used in any new component. Bullets are arrays of strings, rendered with `{bullet}` interpolation. URL fields (`fullPlanHref`) validated for `http://` or `https://` prefix to prevent `javascript:` schemes. |
| SQL injection via dynamic pillarKey | Tampering | Drizzle's parameterised queries prevent injection by construction. The pillarKey is also validated against the literal union before any query runs. |
| Last-admin-style guards | Availability | Not applicable to pillar resources — there's no "last X" invariant to protect. All Phase 8 mutations are idempotent upserts. |
| Server-side request forgery via `fullPlanHref` | Information Disclosure | The link is rendered as a plain `<a href=...>` in the modal; the server never fetches it. No SSRF surface. Validate scheme to prevent `javascript:` URLs. |

### Phase 8 security regression tests (recommended)

Add to `tests/security/`:
- `pillar-prescriptions-rbac.test.ts` — coach/client PATCH/DELETE → 403; admin → 200.
- `pillar-definitions-rbac.test.ts` — coach/client PATCH `/api/admin/pillars` → 403; admin → 200.
- `pillar-page-idor.test.ts` — extend existing static-source IDOR test to cover pillar-related reads inside the report page.
- `pillar-prescription-xss.test.tsx` — render `<PillarModal>` with `<script>`-laden summary; verify React-escaped output.

## Sources

### Primary (HIGH confidence)

- `[VERIFIED: src/lib/db/schema.ts]` — pg dialect schema; existing tables and patterns
- `[VERIFIED: src/lib/db/schema-sqlite.ts]` — sqlite dialect schema (parallel structure)
- `[VERIFIED: src/lib/db/index.ts]` — `runMigrations()` runtime migration + dual-dialect Proxy db pattern
- `[VERIFIED: src/lib/audit.ts]` — `logAuditEvent` and `AuditAction` union to extend
- `[VERIFIED: src/lib/auth-helpers.ts]` — `requireAdmin`, `getValidSession`, `AuthSession` shape
- `[VERIFIED: src/app/api/admin/users/[userId]/role/route.ts]` — Phase 7 BL-02 admin route reference (transactional + audit + last-admin guard)
- `[VERIFIED: src/app/portal/assessment/[id]/report/page.tsx]` — Phase 7 BL-05 SSR ownership gate
- `[VERIFIED: src/components/sections/Section11.tsx]` — current 618-line client-side report (replacement target)
- `[VERIFIED: src/lib/pdf/Peak360Report.tsx]` — single-Page orchestrator; insertion point
- `[VERIFIED: src/lib/pdf/colors.ts]` + `styles.ts` + `fonts.ts` — D-28 reuse-only design tokens
- `[VERIFIED: src/lib/report-markers.ts]` — REPORT_MARKERS array; basis for D-05 mapping (and the source of Pitfall #1)
- `[VERIFIED: src/components/ui/Toast.tsx]` — existing toast (reuse, not re-implement)
- `[VERIFIED: src/components/ui/ConfirmDeleteModal.tsx]` — focus trap seed
- `[VERIFIED: package.json]` — exact dependency versions
- `[VERIFIED: vitest.config.ts]` — `tests/**/*.test.{ts,tsx}` is in the test glob
- `[VERIFIED: drizzle.config.ts]` — dual-dialect drizzle config
- `[VERIFIED: .planning/phases/08-client-report-design-refresh/08-CONTEXT.md]` — locked decisions D-01..D-30
- `[VERIFIED: .planning/phases/08-client-report-design-refresh/08-UI-SPEC.md]` — visual contract; component inventory; copy
- `[VERIFIED: ~/.claude/projects/-Users-jace-Code-peak360/memory/MEMORY.md]` — deployment + secrets discipline

### Secondary (MEDIUM confidence)

- `[CITED: https://orm.drizzle.team/docs/indexes-constraints#primary-key]` — Drizzle composite PK syntax (verified for general 0.4x line; not version-pinned to 0.45.1)
- `[CITED: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/]` — WAI-ARIA Authoring Practices for modal dialogs (focus trap contract)
- `[CITED: https://react-pdf.org/components]` — react-pdf Page/View/Text composition

### Tertiary (LOW confidence)

- None — all critical claims grounded in repo inspection.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every package version verified against `package.json`; no new packages introduced.
- Architecture: HIGH — every pattern verified against an existing repo file (Phase 7 admin route, Phase 7 SSR gate, Phase 5 PDF orchestrator, dual-dialect Drizzle).
- Pitfalls: HIGH for #1, #2, #3, #6 (verified via grep + file inspection); MEDIUM for #4 (assumes current production deploy path matches MEMORY.md), #5 (cross-surface drift is theoretical until implementation), #7 (a11y bug class), #8 (verified only via Section11.tsx import inspection).
- D-05 mapping ambiguity: HIGH that the ambiguity exists; the user must resolve.

**Research date:** 2026-05-07
**Valid until:** 2026-06-06 (30 days — stable Next.js 16 / React 19 / Drizzle 0.45 stack; no fast-moving dependency)
