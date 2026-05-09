---
phase: 08-client-report-design-refresh
verified: 2026-05-09T03:37:12Z
status: human_needed
score: 14/14 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Load /portal/assessment/{id}/report in a browser as a coach/client and confirm: (a) heading + intro render from pillar_page_copy DB row ('The Peak Living Pillars'); (b) five pillar cards appear in sort_order; (c) each card's status pill colour matches the computed traffic-light status; (d) clicking a card opens the PillarModal; (e) Escape closes the modal and returns focus to the originating card; (f) bottom-sheet layout below 768px viewport width and centred dialog at md and above; (g) DetailedMarkerResultsDisclosure is collapsed by default and expands inline"
    expected: "All seven sub-checks pass with no layout overflow, no console errors, and modal focus-trap cycling through interactive elements without escaping"
    why_human: "Focus-trap correctness, breakpoint-driven layout switch, and modal accessibility require a real browser session — Vitest/jsdom cannot render Tailwind responsive classes or test actual keyboard event propagation in a real DOM with a real viewport"
  - test: "Visit /portal/admin/pillars as an admin user, edit one pillar definition label and click Save, then reload the portal report page for any assessment and confirm the updated label appears"
    expected: "PATCH to /api/admin/pillars succeeds (200), audit_logs table gains a pillar_definition.update row, the report page shows the updated label"
    why_human: "End-to-end admin authoring flow (form → API → DB → report render) cannot be verified by static source analysis alone; wiring includes Toast feedback, optimistic UI, and the re-read on the report page"
  - test: "Visit /api/assessments/{id}/pdf for a real assessment ID and open the downloaded PDF. Confirm: (a) first page is 'The Peak Living Pillars' with five cards in a 3+2 grid layout; (b) each card shows the pillar label, score or em dash, traffic-light status badge, and shortSummary; (c) subsequent pages contain TierSummary, MarkerTable, InsightsSection in original order; (d) PDF file size is under 500KB"
    expected: "PDF opens correctly with the pillars page first, followed by the existing blocks; no react-pdf render errors; file under 500KB"
    why_human: "react-pdf rendering to a PDF buffer requires a running Next.js server; Vitest cannot exercise the /api/assessments/[id]/pdf route handler end-to-end"
---

# Phase 8: Client Report Design Refresh — Verification Report

**Phase Goal:** Replace the dense Section 11 report hero with a five-pillar Peak Living module (portal interactive + PDF static mirror) backed by admin-authored definitions, page copy, and per-assessment per-pillar prescriptions, with composite-score traffic-light status derived from existing tier ratings.
**Verified:** 2026-05-09T03:37:12Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Three new tables exist in both Drizzle dialect schemas with composite PK on pillar_prescriptions | VERIFIED | `grep -c "export const pillarDefinitions\|pillarPageCopy\|pillarPrescriptions"` returns 3 in each of schema.ts and schema-sqlite.ts; composite PK confirmed in both files |
| 2  | runMigrations() creates the 3 tables idempotently in both dialects and seeds 5 pillar definitions + 1 page-copy row | VERIFIED | `grep -c "CREATE TABLE IF NOT EXISTS \"pillar_definitions\""` returns 2; `grep -c 'PRIMARY KEY ("assessment_id", "pillar_key")'` returns 2; ON CONFLICT + INSERT OR IGNORE both present |
| 3  | SQLite DB has seeded data: 5 rows in pillar_definitions, 1 row in pillar_page_copy | VERIFIED | `sqlite3 local.db` shows cardiometabolic|0, vo2|1, bodyComposition|2, strength|3, balance|4; pillar_page_copy has 1 row with heading "The Peak Living Pillars" |
| 4  | AuditAction union includes 4 new pillar literals | VERIFIED | All 4 literals confirmed in src/lib/audit.ts: 'pillar_definition.update', 'pillar_page_copy.update', 'pillar_prescription.upsert', 'pillar_prescription.delete'; all 8 pre-existing literals preserved |
| 5  | Pure pillar layer exists in src/lib/pillars/ with passing Vitest tests | VERIFIED | `npx vitest run src/lib/pillars/__tests__/` → 59 tests passed (49 mapping + 10 colors) |
| 6  | TRAFFIC_LIGHT_HEX declared exactly once (D-28 SSOT) and re-exported by src/lib/pdf/colors.ts | VERIFIED | `grep -rn "export const TRAFFIC_LIGHT_HEX" src/lib/` returns exactly one hit at pillars/colors.ts:15; pdf/colors.ts line 59 re-exports it via `export { TRAFFIC_LIGHT_HEX, ... } from '@/lib/pillars/colors'` |
| 7  | Marker-to-pillar mapping implements D-05 Option A (balance reclassification via BALANCE_REGEX) | VERIFIED | `grep -n "BALANCE_REGEX" src/lib/pillars/mapping.ts` shows `const BALANCE_REGEX = /balance|sway|stability/i` at line 57; single_leg_balance_left/right reclassified to balance regardless of category; inline JSDoc `// D-05 Option A` comment present |
| 8  | Portal report page renders ReportShell with PillarsGrid, modal (via PillarsGrid), and DetailedMarkerResultsDisclosure | VERIFIED | page.tsx imports ReportShell; ReportShell.tsx imports PillarsGrid and DetailedMarkerResultsDisclosure; PillarsGrid.tsx imports PillarModal; all wired with actual pillar data passed through |
| 9  | Hand-rolled Dialog primitive with focus trap, body-scroll lock, ESC, backdrop close, and mobile bottom-sheet variant | VERIFIED | Dialog.tsx (171 lines) has: body scroll lock at line 60, ESCAPE_KEY constant at line 29, shiftKey branch at line 106, backdrop onClick={onClose} at line 153, bottom-sheet mode class 'flex items-end' at line 133, auto mode responsive at line 134 |
| 10 | Phase 7 BL-05 SSR ownership gate preserved verbatim in the report page | VERIFIED | `grep -c "redirect('/login')\|notFound()\|redirect('/portal')"` returns 3 (one occurrence each); all gated before pillar data reads |
| 11 | Admin API routes at /api/admin/pillars and /api/admin/assessments/[id]/prescriptions with requireAdmin → transactional write → logAuditEvent pattern | VERIFIED | Both routes confirmed; pillars route has 4 requireAdmin occurrences (2 handlers) and 4 logAuditEvent calls; prescriptions route has 4 requireAdmin occurrences (3 handlers) and 3 logAuditEvent calls; onConflictDoUpdate present in both |
| 12 | Admin pages at /portal/admin/pillars and /portal/admin/assessments/[id]/prescriptions with form components | VERIFIED | Both page.tsx + AdminPillarsForm.tsx / AdminPrescriptionsForm.tsx confirmed on disk |
| 13 | RBAC regression tests for 403 paths exist and all 12 tests pass | VERIFIED | `npx vitest run tests/security/pillar-definitions-rbac.test.ts tests/security/pillar-prescriptions-rbac.test.ts` → 12/12 passed in 1ms each |
| 14 | PillarsPage react-pdf component exists as first page in Peak360Report; ReportData and loadReportData extended with pillar fields; no inline traffic-light hex (D-28) | VERIFIED | PillarsPage.tsx confirmed (206 lines); Peak360Report.tsx renders `<PillarsPage>` before `<TierSummary>` (line 25 vs 74); ReportData.ts has definitions/pageCopy/prescriptions fields; loadReportData runs Promise.all on the three pillar queries; `grep -c "'#10b981'\|'#f59e0b'\|'#ef4444'" PillarsPage.tsx` = 0 |

**Score:** 14/14 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/db/schema.ts` | pg pillarDefinitions, pillarPageCopy, pillarPrescriptions | VERIFIED | 3 table exports present; composite PK on pillarPrescriptions |
| `src/lib/db/schema-sqlite.ts` | sqlite pillarDefinitions, pillarPageCopy, pillarPrescriptions | VERIFIED | 3 table exports present; composite PK on pillarPrescriptions |
| `src/lib/db/index.ts` | runMigrations CREATE TABLE IF NOT EXISTS + idempotent seed both dialects | VERIFIED | 2 occurrences each of CREATE TABLE IF NOT EXISTS for all 3 tables; ON CONFLICT and INSERT OR IGNORE both present |
| `src/lib/audit.ts` | AuditAction union with 4 new Phase 8 literals | VERIFIED | All 4 new literals confirmed |
| `src/lib/pillars/types.ts` | PillarKey, PillarStatus, PillarDefinition, PillarPageCopy, PillarPrescription, PillarScoreResult | VERIFIED | File exists and is imported by all pillar consumers |
| `src/lib/pillars/colors.ts` | TRAFFIC_LIGHT_HEX SSOT + TRAFFIC_LIGHT_TEXT + PILLAR_THRESHOLDS | VERIFIED | green=70, amber=40 thresholds confirmed; declared once |
| `src/lib/pillars/mapping.ts` | computePillarScore, computeAllPillarScores, markerToPillar, BALANCE_REGEX D-05 Option A | VERIFIED | BALANCE_REGEX at line 57; 49 tests pass |
| `src/lib/pillars/queries.ts` | getPillarDefinitions, getPillarPageCopy, getPillarPrescriptions with Drizzle db.select | VERIFIED | All 3 queries use db.select().from(pillarX) |
| `src/lib/pillars/__tests__/mapping.test.ts` | 49 Vitest tests | VERIFIED | 49/49 pass |
| `src/lib/pillars/__tests__/colors.test.ts` | 10 Vitest tests | VERIFIED | 10/10 pass |
| `src/lib/pdf/colors.ts` | Re-exports TRAFFIC_LIGHT_HEX from pillars/colors.ts | VERIFIED | Line 59 confirmed |
| `src/components/ui/Dialog.tsx` | Focus trap, body lock, ESC, backdrop close, bottom-sheet | VERIFIED | 171 lines; all features present |
| `src/components/report/PillarCard.tsx` | Per-pillar card UI | VERIFIED | File exists |
| `src/components/report/PillarModal.tsx` | Seven-section drill-down modal | VERIFIED | File exists |
| `src/components/report/PillarsGrid.tsx` | Orchestrator with computeAllPillarScores + modal state | VERIFIED | Imports and calls computeAllPillarScores at line 39 |
| `src/components/report/DetailedMarkerResultsDisclosure.tsx` | Collapsed details wrapping dense marker grid | VERIFIED | File exists; imported and rendered by ReportShell |
| `src/components/report/ReportShell.tsx` | Top-level client component for report body | VERIFIED | File exists; imports PillarsGrid + DetailedMarkerResultsDisclosure |
| `src/app/portal/assessment/[id]/report/page.tsx` | SSR page with BL-05 gate + Promise.all pillar loads + ReportShell | VERIFIED | All confirmed |
| `src/app/api/admin/pillars/route.ts` | requireAdmin + transactional write + logAuditEvent | VERIFIED | File exists; pattern confirmed |
| `src/app/api/admin/assessments/[id]/prescriptions/route.ts` | requireAdmin + composite-key CRUD + logAuditEvent | VERIFIED | File exists; pattern confirmed |
| `src/app/portal/admin/pillars/page.tsx` + AdminPillarsForm.tsx | Admin authoring shell + form | VERIFIED | Both files exist |
| `src/app/portal/admin/assessments/[id]/prescriptions/page.tsx` + AdminPrescriptionsForm.tsx | Admin prescriptions shell + form | VERIFIED | Both files exist |
| `tests/security/pillar-definitions-rbac.test.ts` | 6 RBAC regression tests | VERIFIED | 6/6 pass |
| `tests/security/pillar-prescriptions-rbac.test.ts` | 6 RBAC regression tests | VERIFIED | 6/6 pass |
| `src/lib/pdf/components/PillarsPage.tsx` | react-pdf Page with 5-pillar grid | VERIFIED | 206 lines; no inline traffic-light hex |
| `src/lib/pdf/types.ts` | ReportData extended with definitions, pageCopy, prescriptions | VERIFIED | 3 new fields at lines 38-40 |
| `src/lib/report/load-report-data.ts` | Fetches pillar data via Promise.all alongside markers | VERIFIED | getPillarDefinitions/getPillarPageCopy/getPillarPrescriptions all called |
| `src/lib/pdf/Peak360Report.tsx` | PillarsPage inserted as first Page before TierSummary | VERIFIED | PillarsPage at line 25, TierSummary at line 74 |
| `drizzle-sqlite/0000_whole_makkari.sql` | Migration with CREATE TABLE for all 3 pillar tables | VERIFIED | All 3 tables confirmed in file |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| schema-sqlite.ts pillarPrescriptions | assessments | FK assessment_id ON DELETE CASCADE | VERIFIED | Confirmed in sqlite3 `PRAGMA table_info` and CREATE TABLE SQL |
| schema.ts pillarPrescriptions | assessments | FK assessment_id ON DELETE CASCADE | VERIFIED | grep confirms `references(() => assessments.id, { onDelete: 'cascade' })` |
| src/lib/pdf/colors.ts | src/lib/pillars/colors.ts | re-export TRAFFIC_LIGHT_HEX | VERIFIED | Line 59 in pdf/colors.ts |
| PillarsPage.tsx | src/lib/pdf/colors.ts | TRAFFIC_LIGHT_HEX import | VERIFIED | Import at line 4-7 confirmed |
| loadReportData | pillar queries | Promise.all([getPillarDefinitions, getPillarPageCopy, getPillarPrescriptions]) | VERIFIED | Lines 113-116 in load-report-data.ts |
| portal report page.tsx | ReportShell | definitions/pageCopy/prescriptions/markers props | VERIFIED | Line 117-119 confirms prop pass-through |
| admin pillars route | logAuditEvent | pillar_definition.update + pillar_page_copy.update | VERIFIED | 4 logAuditEvent calls in route; literals pinned by RBAC tests |
| admin prescriptions route | logAuditEvent | pillar_prescription.upsert + pillar_prescription.delete | VERIFIED | 3 logAuditEvent calls in route; literals pinned by RBAC tests |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| PillarsGrid.tsx | scores (computeAllPillarScores) | markers prop from loadReportData | loadReportData queries DB via section data | FLOWING |
| PillarsGrid.tsx | definitions/pageCopy/prescriptions | Props from portal report page | getPillarDefinitions/getPillarPageCopy/getPillarPrescriptions query DB tables | FLOWING |
| PillarsPage.tsx | definitions/pageCopy/prescriptions/markers | ReportData from loadReportData | Same DB path as portal | FLOWING |
| AdminPillarsForm.tsx | definitions/pageCopy | Fetched via GET /api/admin/pillars | Route queries DB via Drizzle | FLOWING |
| AdminPrescriptionsForm.tsx | prescriptions | Fetched via GET /api/admin/assessments/[id]/prescriptions | Route queries DB via Drizzle | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| SQLite seeded correctly | `sqlite3 local.db "SELECT pillar_key, sort_order FROM pillar_definitions ORDER BY sort_order;"` | cardiometabolic|0 ... balance|4 (5 rows) | PASS |
| pillar_page_copy has 1 row with correct heading | `sqlite3 local.db "SELECT count(*), heading FROM pillar_page_copy;"` | 1 | The Peak Living Pillars | PASS |
| pillar_prescriptions composite PK in schema | `sqlite3 local.db "SELECT sql FROM sqlite_master WHERE name='pillar_prescriptions';"` | PRIMARY KEY ("assessment_id", "pillar_key") | PASS |
| Pillar Vitest tests pass | `npx vitest run src/lib/pillars/__tests__/` | 59/59 passed | PASS |
| RBAC tests pass | `npx vitest run tests/security/pillar-*-rbac.test.ts` | 12/12 passed | PASS |
| TRAFFIC_LIGHT_HEX declared exactly once | `grep -rn "export const TRAFFIC_LIGHT_HEX" src/lib/` | 1 occurrence (pillars/colors.ts:15) | PASS |
| No inline traffic-light hex in PillarsPage | `grep -c "'#10b981'\|'#f59e0b'\|'#ef4444'" PillarsPage.tsx` | 0 | PASS |
| TypeScript compiles (Phase 8 files) | `npx tsc --noEmit` (Phase 8 files) | 0 new errors in Phase 8 files | PASS |

### Requirements Coverage

The REQUIREMENTS.md document uses milestone-level requirement IDs (CLIN-xx, REPT-xx, AUTH-xx, etc.) and does not contain Phase 8-specific REQ-08-xx entries. The ROADMAP.md notes these as **"implicit, locked via decisions D-01..D-30 in 08-CONTEXT.md and the 08-UI-SPEC.md visual contract"**. Phase-specific requirements are carried by the plan frontmatter `requirements:` fields and traced to CONTEXT decisions (D-01..D-30). The milestone REQUIREMENTS.md carries no Phase 8 items — this is a tracked phase requirement convention, not a gap.

| Plan | Phase Requirements | Status |
|------|-------------------|--------|
| 08-01 | REQ-08-05 (3 new tables), REQ-08-08 (AuditAction), D-13, D-17, D-18, D-19, D-16, D-20 | VERIFIED |
| 08-02 | REQ-08-04 (pillar score), D-04, D-05, D-06, D-08, D-09, D-10, D-11, D-21, D-28 | VERIFIED |
| 08-03 | REQ-08-01, REQ-08-02, REQ-08-09, D-01..D-03, D-21..D-25, D-29 | VERIFIED (automated) / HUMAN NEEDED (visual/a11y) |
| 08-04 | REQ-08-06, REQ-08-07, REQ-08-08, D-12, D-15, D-16, D-19, D-20, D-30 | VERIFIED (automated) / HUMAN NEEDED (live authoring flow) |
| 08-05 | REQ-08-03, REQ-08-10, D-01, D-26..D-28 | VERIFIED (automated) / HUMAN NEEDED (PDF render) |

### Anti-Patterns Found

No blockers or warnings found in Phase 8 source files.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | — | — | — | — |

Scan summary: checked all 28 Phase 8 source files for TODO/FIXME/placeholder/not-implemented comments, return null patterns, and hardcoded empty data. Zero hits in production code. Pre-existing TypeScript test errors (19 total) are all confined to `src/__tests__/` and were pre-existing before Phase 8 began (documented in Plans 01–04 summaries as out-of-scope).

### Human Verification Required

#### 1. Portal report interactive UI (A11y + responsive layout)

**Test:** Boot `npm run dev`. Log in as a coach/client. Navigate to `/portal/assessment/{id}/report` for any assessment that has rated markers.
**Expected:**
- Page heading + intro from `pillar_page_copy` DB row appear (not hardcoded fallback)
- Five pillar cards render in sortOrder (cardiometabolic first, balance last)
- Each card's status pill colour matches traffic-light logic (green/amber/red)
- Clicking any card opens the PillarModal
- Pressing Escape closes the modal and returns keyboard focus to the originating card button
- Tab key cycles only within the open modal (no focus leaking to content behind)
- Viewport below 768px: modal appears as a bottom-sheet (anchored to bottom)
- Viewport 768px+: modal appears centred
- DetailedMarkerResultsDisclosure is collapsed by default; clicking the summary expands the marker grid inline
**Why human:** Focus-trap correctness, breakpoint-driven layout (CSS-only, requires live browser), and bottom-sheet vs centred dialog require a real viewport — jsdom cannot verify these.

#### 2. Admin authoring end-to-end round-trip

**Test:** Log in as admin. Navigate to `/portal/admin/pillars`. Edit the "Cardiometabolic Health" label to "Cardiometabolic Health (Test)". Click Save. Navigate to `/portal/assessment/{id}/report`. Revert the change.
**Expected:**
- PATCH succeeds (200 response, Toast shows success)
- Report page shows the updated label immediately on reload
- `audit_logs` table gains one `pillar_definition.update` row
**Why human:** Optimistic UI update, Toast component feedback, and audit log write require a live server with a real DB session — static source analysis confirms the wiring but cannot confirm the UI feedback renders without runtime errors.

#### 3. PDF first-page render

**Test:** With `npm run dev` running, `curl -o /tmp/report.pdf http://localhost:3000/api/assessments/{id}/pdf` for a real assessment id and open `/tmp/report.pdf` in a PDF viewer.
**Expected:**
- First page is "The Peak Living Pillars" with five cards in a 3+2 grid layout
- Each card shows: pillar label, score (or em dash for unrated), traffic-light badge, shortSummary
- Subsequent pages contain TierSummary, MarkerTable, InsightsSection in original order
- File size under 500KB
**Why human:** react-pdf rendering to a buffer requires a running Next.js server; Vitest cannot exercise the PDF route handler end-to-end without a full Next.js runtime.

### Gaps Summary

No automated gaps found. All 14 must-haves verified at all four levels (exists, substantive, wired, data-flowing). The `human_needed` status is driven exclusively by three UI/runtime behaviours that cannot be verified without a live browser session: (1) interactive modal a11y including focus trap and responsive layout, (2) admin authoring form live round-trip, (3) PDF file render. These are standard verifier deferrals for all React/PDF UI work — they indicate incomplete verification, not incomplete implementation.

---

_Verified: 2026-05-09T03:37:12Z_
_Verifier: Claude (gsd-verifier)_
