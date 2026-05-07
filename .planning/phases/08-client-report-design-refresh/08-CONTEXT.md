# Phase 8: Client report design refresh - Context

**Gathered:** 2026-05-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Transition the final-report Page 10 surface from the current dense, tier-coloured marker grid into a **five-pillar coloured traffic-light module** that doubles as:

1. A clear visual summary inside the **portal client report** (`/portal/assessment/[id]/report`, currently rendered by `Section11.tsx`).
2. A static visual mirror inside the **PDF export** (`src/lib/pdf/Peak360Report.tsx` via `@react-pdf/renderer`) that uses the same five-pillar cards but no modal interaction.

In scope:
- Replace / augment the current Section 11 hero + tier summary + detailed-results layout with a **Peak Living five-pillar** module.
- Build clickable pillar cards (portal) that open a drill-down **modal** with explanation, pillar score /100, traffic-light status, "doing well" / "needs attention" splits, score breakdown, and an admin-authored prescription block.
- Mirror the same five-pillar card grid into the PDF as a static page that visually indicates further drill-down is available in the portal.
- Build a defensible **tier-rollup pillar score** computed from the existing 5-tier marker ratings (no new clinical logic invented).
- **Admin authoring (new in scope, per user 2026-05-07):**
  - **Global pillar definitions** authored once at `/portal/admin/pillars` (admin-only edit; all roles read via the report). One canonical row per pillar (name, client-friendly meaning, optional intro override). Backed by a new `pillar_definitions` table.
  - **Per-assessment consultant recommendations / prescriptions** authored per assessment + per pillar at `/portal/admin/assessments/[id]/prescriptions` (or equivalent admin route). Admin-only write, coach + client read. Backed by a new `pillar_prescriptions` table keyed `(assessment_id, pillar_key)`.
  - RBAC: write paths reject non-admin sessions with 403 (mirroring the Phase 7 admin-route pattern).

Out of scope (deferred):
- Inventing new clinical scoring or weighting beyond rolling up existing tier ratings.
- Adding a sixth pillar for questionnaires / Daily Readiness — questionnaire data is woven into pillar-modal interpretations only, not surfaced as its own pillar.
- Mobile-only rebuild of unrelated portal surfaces (sidebar, dashboard, client list) — this phase is the report only.
- Per-assessment override of pillar **definitions** (only recommendations are per-assessment; definitions are global, see D-24).
- A library of recommendation templates / reusable text snippets (admin authors free-text per assessment for now; a template library can come later).

Brand framing (from Kevin's meeting transcript):
The work must reinforce the **Peak Living** product positioning — Long Living → Healthy Living → Peak Living, target market 40+ business owners, goal of moving toward the top 10% for age. The page heading "The Peak Living Pillars" and intro copy must land that frame.

</domain>

<decisions>
## Implementation Decisions

### Surface & Parity
- **D-01:** Phase 8 ships **portal + PDF mirrored**. The portal version is interactive (clickable cards, modal drill-down). The PDF version is static — same five cards, same colours, same scores, with a footnote indicating drill-down lives in the portal.
- **D-02:** The portal report page (`src/app/portal/assessment/[id]/report/page.tsx`) keeps its SSR ownership gate (`auth.api.getSession + hasAccess + redirect/notFound`, locked in Phase 7 BL-05). The five-pillar module renders inside the gated branch.
- **D-03:** `Section11.tsx` is replaced — not augmented — so the Peak Living module is what the client sees first when they open `/portal/assessment/[id]/report`. The current dense category-grouped marker grid is preserved underneath as a **collapsed "Detailed marker results" disclosure** so coaches still have access to raw data without forcing it on the client.

### Five-Pillar Model
- **D-04:** Use the transcript-aligned five pillars verbatim:
  1. **Cardiometabolic Health**
  2. **Body Composition**
  3. **Strength**
  4. **Balance**
  5. **VO2 / Fitness Capacity**
- **D-05:** **Pillar → existing-category mapping (locked):**

  | Pillar | Sources |
  |---|---|
  | Cardiometabolic Health | `Lipid Panel` + `Glucose & Metabolic` + `Inflammation` + Blood Pressure (Systolic + Diastolic) markers from `Cardiovascular Fitness` |
  | Body Composition | `Body Composition` (clean) |
  | Strength | `Strength Testing` (clean) |
  | Balance | balance-subset of `Mobility & Flexibility` (any marker whose `testKey`, `label`, or comment contains "balance" / "sway" / "stability") |
  | VO2 / Fitness Capacity | `Cardiovascular Fitness` (excluding the BP markers, which moved to Cardiometabolic) |

- **D-06:** Categories that don't map cleanly to a Peak Living pillar — **Hormones, Thyroid, Vitamins & Minerals, Iron Studies, Liver Function, Kidney & Electrolytes, Heavy Metals, Full Blood Count** — are surfaced inside the **Cardiometabolic modal** under a "Supporting markers" subsection. They contribute to the "doing well" / "needs attention" split but do **not** influence the pillar score (see D-09 for rationale).
- **D-07:** Questionnaire / Daily Readiness / Medical Screening data is **not** a sixth pillar. It is surfaced inside the relevant pillar modals as plain-English context inside the "What this pillar means" / interpretation block where relevant (e.g., consent status near top, medication notes near Cardiometabolic, mobility limitations near Balance / Strength).

### Pillar Score (0–99) and Traffic Light
- **D-08:** **Tier-rollup placeholder formula** (locked, defensible, no invented clinical logic):

  Map each existing marker tier to a 0–100 contribution:
  ```
  elite    → 100
  great    →  80
  normal   →  60
  cautious →  40
  poor     →  20
  null     → excluded from average (marker has no value or no norms)
  ```
  Pillar score = round(unweighted mean of contributing markers' tier values within the pillar's mapped categories). If a pillar has zero rated markers the score is `null` and the card displays "—" with a "Data pending" status pill (NOT a traffic light) instead of red/amber/green.

- **D-09:** Score sources for D-06 "supporting markers" are **excluded** from the Cardiometabolic pillar score calculation. They appear in the modal for transparency but the score itself only reflects the four primary subcategories. Reason: the supporting markers (heavy metals, hormones, etc.) are screening rather than performance, and folding them into a single 0–99 distorts the cardiometabolic signal Kevin cares about.

- **D-10:** **Traffic-light thresholds** (locked):
  ```
  red    →  0–39   (priority concern)
  amber  → 40–69   (needs improvement)
  green  → 70–100  (performing well)
  ```
  Hardcoded for v1 of this phase. Threshold values live in a single named-export constant so a future phase can lift them into config without changing the UI.

- **D-11:** The 5-tier marker palette stays in the per-marker rows inside the modal (poor/cautious/normal/great/elite — emerald/blue/gray/amber/red). The 3-state pillar traffic light is a **separate visual layer** at the pillar card level. Don't try to reuse the 5 colours for the pillar status — the message is different (composite vs marker).

### Prescription / Consultant Recommendation (admin-authored, per-assessment)
- **D-12:** **Per-assessment consultant recommendations are real admin-authored content in this phase** (revised 2026-05-07 from the original placeholder-only scope). Each pillar inside each assessment has an admin-editable prescription. Coach + client both READ inside the report. Only role=admin can WRITE (POST/PATCH/DELETE).
- **D-13:** Data model:
  ```sql
  CREATE TABLE pillar_prescriptions (
    assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    pillar_key TEXT NOT NULL,                  -- 'cardiometabolic' | 'bodycomp' | 'strength' | 'balance' | 'vo2'
    summary TEXT NOT NULL,                     -- short 1–2 sentence headline (required)
    bullets TEXT,                              -- JSON-encoded string[] (optional action items)
    full_plan_href TEXT,                       -- optional CTA URL (e.g., link to a longer document)
    updated_by TEXT NOT NULL,                  -- user.id of the admin who last wrote
    updated_at INTEGER NOT NULL,               -- epoch ms
    PRIMARY KEY (assessment_id, pillar_key)
  );
  ```
  Composite primary key — exactly one row per (assessment, pillar). Schema lives in `src/lib/db/schema.ts`.
- **D-14:** Component interface (locked):
  ```ts
  type PillarPrescription = {
    pillarKey: 'cardiometabolic' | 'bodyComposition' | 'strength' | 'balance' | 'vo2';
    summary: string;                  // required, short 1–2 sentence headline
    bullets?: string[];               // optional action items
    fullPlanHref?: string;            // optional CTA link to full plan
    updatedBy?: { id: string; name?: string };  // displayed as "Updated by [Name]" inside the modal for transparency
    updatedAt?: number;               // epoch ms — formatted as relative time in the modal footer
  };
  ```
  Modal accepts `PillarPrescription | null`. When `null` (admin hasn't written one yet), render an empty-state block: "Your coach hasn't written a recommendation for this pillar yet. Check back soon." — NOT lorem-style placeholder. Real empty-state copy.
- **D-15:** Admin authoring UI lives at a new route. Recommended naming: `/portal/admin/assessments/[id]/prescriptions` (per-assessment edit page accessible via the existing admin assessments table). Inline edit per pillar (5 forms on one page; save-each or save-all both acceptable — planner decides). RBAC: middleware/server-side check rejects non-admin with 403, mirroring the pattern from `src/app/api/admin/users/[userId]/role/route.ts` (Phase 7 BL-02).
- **D-16:** Audit log: every prescription write emits an `audit_logs` entry (existing infra) with action `pillar_prescription.upsert` / `pillar_prescription.delete` and a small payload `{ assessment_id, pillar_key, before_summary_hash, after_summary_hash }`. Reuse `logAuditEvent` from `src/lib/audit.ts` (Phase 7).

### Pillar Definitions (admin-authored, global)
- **D-17:** **Pillar definitions are global**, admin-authored once, surfaced to every client identically. Stored in a new `pillar_definitions` table:
  ```sql
  CREATE TABLE pillar_definitions (
    pillar_key TEXT PRIMARY KEY,         -- 'cardiometabolic' | 'bodyComposition' | 'strength' | 'balance' | 'vo2'
    label TEXT NOT NULL,                 -- e.g., "Cardiometabolic Health"
    short_summary TEXT NOT NULL,         -- 1-line summary shown on the card under the score
    plain_meaning TEXT NOT NULL,         -- the "What this pillar means" client-friendly paragraph in the modal
    sort_order INTEGER NOT NULL,         -- controls grid ordering (D-22)
    updated_by TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  ```
- **D-18:** Seed migration ships the five pillars with the wording from the user's prompt as the initial values (Cardiometabolic, Body Composition, Strength, Balance, VO2 / Fitness Capacity, with the meanings given in the prompt). Migration is idempotent — re-running it does not overwrite admin edits.
- **D-19:** Page heading **"The Peak Living Pillars"** and the page intro paragraph are also stored as admin-editable fields, in a `pillar_page_copy` single-row table (or as a special `pillar_definitions` row with `pillar_key='__page__'` — planner decides). Initial seed = the prompt's verbatim copy. Admin authoring UI sits at `/portal/admin/pillars`.
- **D-20:** RBAC: write paths reject non-admin sessions with 403. Mirrors Phase 7 BL-02 admin-route pattern. All writes audit-logged via `logAuditEvent` (action `pillar_definition.update` / `pillar_page_copy.update`).
- **D-21:** Read paths: SSR. The report page resolves `pillar_definitions` and the `pillar_prescriptions` for the assessment server-side and passes them as props into the (client) `PillarsGrid` and modal components. No client-side fetch.

### Portal UX
- **D-22:** Pillar cards form a single grid above the fold. Initial sort order (admin-editable via `pillar_definitions.sort_order`): Cardiometabolic, VO2 / Fitness Capacity, Body Composition, Strength, Balance. Reason: matches the Kevin-meeting framing of internal health → fitness capacity → physical capacity, which is how coaches typically narrate the result. Mobile = top-to-bottom; desktop = left-to-right (3 + 2 layout).
- **D-23:** Modal is a centred dialog on desktop and a **bottom-sheet** on mobile (swipe-down dismiss + overlay). Reason: the prompt explicitly calls out "most users will likely view this on mobile" and the report is a non-trivial drill — full-screen modal on a small device is the only readable form.
- **D-24:** Modal close: backdrop tap, ESC key, dedicated close button. Lock body scroll while open. Trap focus. Standard a11y modal contract.
- **D-25:** Page heading and intro copy come from the `pillar_page_copy` admin-editable record (D-19). Initial seed values: heading = "The Peak Living Pillars"; intro = "Peak360 translates your results into five core pillars to show where you are performing strongly, where you may be exposed, and where focused intervention can help move you toward peak living."

### PDF Mirror
- **D-26:** PDF Page 10 = a single A4 page containing the same five-pillar grid (3-2 layout), each card showing pillar name + score /100 + traffic-light badge + 1-line summary. Below the grid: a small footnote "Open this report in your portal to drill into each pillar and see your coach's recommendations." Modal content is NOT replicated in the PDF, but **per-pillar prescription summaries** (the `summary` field from `pillar_prescriptions`) ARE rendered on the PDF as a small "Recommended next steps" block under each card, when set. Empty pillars omit the block.
- **D-27:** The current dense `MarkerTable` + `InsightsSection` PDF blocks remain on subsequent pages — the five-pillar page is **inserted ahead** of them, not replacing them. PDF readers still get all data; clients get the executive summary first.
- **D-28:** Use the existing PDF design system (`src/lib/pdf/colors.ts`, `styles.ts`, `fonts.ts`) — do not introduce new fonts or colour tokens for the PDF mirror. The traffic-light hex values must be mirrored between portal CSS and PDF colour constants — both phases use a single source-of-truth constants module to avoid drift.

### Visual / Brand
- **D-29:** Premium, modern, clean. Reuse existing `--color-navy: #1a365d` and `--color-gold: #F5A623` tokens. Pillar cards use a glass-card style: subtle elevation, generous padding, large bold score, traffic-light dot + label. Avoid emoji, gimmicky icons, or overly clinical typography.
- **D-30:** No medical claims, no disease-prevention claims, no longevity guarantees. Copy stays consumer-friendly and outcome-framed ("how well your X supports Y") — admin-authored definitions inherit this tone constraint as guidance text in the admin UI.

### Claude's Discretion
- Specific visual treatment of the pillar card (exact shadow, border-radius, score typography size). Researcher / planner can propose; UI-spec phase can refine if needed.
- Animation / micro-interactions on card open (within reason — keep it premium, not gimmicky).
- Exact placement of the "Detailed marker results" disclosure underneath the pillar grid (collapsed by default, but exact accordion / reveal pattern is up to the planner).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Locked from Phase 7 (carry-forward)
- `.planning/phases/07-multi-tenant-auth-ux/07-CONTEXT.md` — Phase 7 locked decisions D-17..D-20: client read-only Section 11 + PDF; SSR ownership gate via `auth.api.getSession + hasAccess + redirect/notFound`. Phase 8 must not regress this.
- `.planning/phases/07-multi-tenant-auth-ux/07-VERIFICATION.md` §BL-05 — the SSR shape that protects the report from cross-client IDOR; the new five-pillar module must render INSIDE the SSR-gated branch.
- `src/app/api/admin/users/[userId]/role/route.ts` — Phase 7 BL-02 admin-route pattern (transactional + role-check + audit log). Phase 8's admin authoring routes (`/api/admin/pillars`, `/api/admin/assessments/[id]/prescriptions`) must mirror this RBAC + audit pattern.
- `src/lib/audit.ts` — `logAuditEvent` helper. Phase 8 reuses for `pillar_definition.update`, `pillar_page_copy.update`, `pillar_prescription.upsert`, `pillar_prescription.delete` actions.
- `src/app/portal/admin/users/page.tsx`, `src/app/portal/admin/invitations/page.tsx` — existing admin UI shape; Phase 8's `/portal/admin/pillars` page should follow the same layout / shell.

### Existing report surfaces (must read)
- `src/components/sections/Section11.tsx` — current 618-line on-screen report. Source of the current category-grouped marker grid, tier summary, insights playbook. The five-pillar module replaces its top-of-page content; the marker grid moves into a collapsed disclosure.
- `src/app/portal/assessment/[id]/report/page.tsx` — SSR-gated wrapper around `<Section11>`. The page chrome (header + Download PDF button) and the gate stay; only the body changes.
- `src/lib/pdf/Peak360Report.tsx` — single-`<Page>` orchestrator; the five-pillar mirror is a new component inserted before `<MarkerTable>`.
- `src/lib/pdf/components/TierSummary.tsx`, `MarkerTable.tsx`, `InsightsSection.tsx` — keep as-is, these stay on subsequent PDF pages.
- `src/lib/pdf/colors.ts`, `src/lib/pdf/styles.ts`, `src/lib/pdf/fonts.ts` — design tokens for the PDF mirror; D-21 requires reuse, no new tokens.

### Data sources that feed pillar score & rollup
- `src/lib/normative/ratings.ts` — `getPeak360Rating()` returns the per-marker tier. Pillar score (D-08) consumes this.
- `src/lib/normative/data.ts` — normative thresholds; not modified, just consumed.
- `src/lib/report-markers.ts` — `REPORT_MARKERS` array with `category`/`subcategory` fields. Pillar mapping (D-05) is a transformation over this array.
- `src/types/normative.ts` — `RatingTier`, `TIER_LABELS`, `TIER_COLORS` constants. The pillar component reuses `RatingTier` typings; introduces a new `PillarStatus = 'red' | 'amber' | 'green' | 'pending'` enum next to it.

### Brand & UI tokens
- `src/app/globals.css` — `--color-navy`, `--color-gold` Tailwind tokens (D-22).
- `CLAUDE.md` §Architecture / §Key Patterns — confirms Section component contract `{ data, onChange, assessmentId }` and section-page layout pattern (Phase 8 keeps this contract; the on-screen view doesn't take `onChange` because Section 11 / report is read-only).

### Phase 5 PDF migration (carry-forward, do not regress)
- `.planning/phases/05-pdf-migration` — PDF is locked to `@react-pdf/renderer`. The new five-pillar PDF page must be a `<View>`/`<Page>` block, not a Playwright/HTML render.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`getPeak360Rating()` and the 5-tier system** — feeds D-08 directly; rollup is just a per-pillar mean over its mapped subset.
- **`REPORT_MARKERS` (`src/lib/report-markers.ts`)** — already keyed on `category` / `subcategory`. The pillar mapping in D-05 is a pure-function transformation — no schema changes needed. A new `pillarKey` derivation utility (e.g., `src/lib/pillars/mapping.ts`) is the natural extraction point.
- **`TIER_DOT` / `TIER_ROW_BG` / `TIER_TEXT` / `TIER_ROW_BORDER` colour maps in Section11.tsx** — already encode per-tier colours. The new traffic-light palette (D-10/D-11) is parallel but distinct — keep them in the same colours module so the relationship is obvious.
- **PDF design tokens (`colors.ts`, `styles.ts`, `fonts.ts`)** — D-21 reuses these for the PDF mirror; no new fonts to register.
- **Modal infrastructure** — there is no existing modal/dialog component in the codebase (grep of `src/components/` shows none). The planner will need to either (a) add a thin headless dialog primitive (Radix UI dialog or hand-rolled with focus-trap) or (b) build a single-purpose `PillarModal` and accept some duplication for now. Option (a) is the architectural-correctness choice but introduces a new dependency; the planner should weigh.

### Established Patterns
- **Server component → client component island** — the report page is already SSR-gated and renders a `'use client'` Section11 child. The new five-pillar module follows the same shape: server component for ownership gate + data load, client component for interactivity (modal, click-throughs).
- **camelCase field IDs** (CLAUDE.md §Key Patterns) — pillar keys must follow this convention: `cardiometabolic`, `bodyComposition`, `strength`, `balance`, `vo2`.
- **camelCase function names**, `useX` hooks, `handleX` handlers — observed throughout `src/components/`. New code follows.
- **Tailwind v4 with `@theme inline` tokens** — pillar component CSS goes through globals.css tokens (`text-navy`, `bg-gold`) where possible; ad-hoc hex codes only inside the colours module.

### Integration Points
- **Pillar mapping module** (new): `src/lib/pillars/mapping.ts` — exports `PILLAR_KEYS`, `markerToPillar(marker: MarkerDef): PillarKey | null`, `computePillarScore(markers: ReportMarker[]): { score: number | null, status: PillarStatus, breakdown: ... }`. Pure functions, no I/O. (Pillar **labels** and copy come from the DB, not from this module.)
- **Pillar UI components** (new): `src/components/report/PillarCard.tsx`, `src/components/report/PillarModal.tsx`, `src/components/report/PillarsGrid.tsx`. All client components; `PillarsGrid` is the only one Section 11 imports. Receive `definitions: PillarDefinition[]` and `prescriptions: PillarPrescription[]` as props (resolved server-side by the report page).
- **PDF pillar page** (new): `src/lib/pdf/components/PillarsPage.tsx` — exports a `<View>` block consumed by `Peak360Report.tsx` immediately before `<MarkerTable>`. Receives the same definitions + prescriptions props from the PDF route.
- **Shared traffic-light constants** (new): `src/lib/pillars/colors.ts` — exports `TRAFFIC_LIGHT_HEX` keyed `'red' | 'amber' | 'green' | 'pending'`. Imported by both portal CSS-in-JS and PDF colour constants module to satisfy D-28 single-source-of-truth.
- **Section 11 collapsed disclosure** — the current marker grid moves into a `<details>` (or accessible disclosure component) labelled "Detailed marker results — for coaches and curious clients". Keep its current internals untouched; just wrap.

### New Database Tables (Phase 8)
- **`pillar_definitions`** (5 rows seeded; admin-edit only): `pillar_key PK`, `label`, `short_summary`, `plain_meaning`, `sort_order`, `updated_by`, `updated_at`. SQLite + Postgres compatible.
- **`pillar_page_copy`** (single row, `pillar_key='__page__'` sentinel OR a separate one-row table): `heading`, `intro`, `updated_by`, `updated_at`. Planner picks the storage shape.
- **`pillar_prescriptions`** (per-assessment per-pillar; admin-edit only): composite PK `(assessment_id, pillar_key)`, `summary`, `bullets` (JSON), `full_plan_href`, `updated_by`, `updated_at`. FK `assessment_id → assessments(id) ON DELETE CASCADE`.
- All schema changes go in `src/lib/db/schema.ts` (Drizzle). Migration: `npm run db:generate` then `npm run db:push`. The migration must be idempotent (re-runnable) and include the seed for `pillar_definitions` + `pillar_page_copy` initial values.

### New Admin Routes (Phase 8)
- **`/portal/admin/pillars`** (page) + **`/api/admin/pillars`** (API): list/edit pillar definitions and page copy. Admin-only RBAC.
- **`/portal/admin/assessments/[id]/prescriptions`** (page) + **`/api/admin/assessments/[id]/prescriptions`** (API, possibly nested per-pillar route): list/edit per-assessment per-pillar prescriptions. Admin-only RBAC.
- Both surfaces follow the Phase 7 admin-route pattern (`auth.api.getSession` → role check → 403 for non-admin → audit log).

### Read Wiring
- `src/app/portal/assessment/[id]/report/page.tsx` extends its existing SSR data load to also fetch `pillar_definitions` (all 5 rows) + `pillar_page_copy` + `pillar_prescriptions WHERE assessment_id = id`. Pass them as props into `<Section11>` (or a new `<ReportShell>` if Section 11 is replaced wholesale).
- `src/app/api/assessments/[id]/pdf/route.ts` does the same fetch and passes into `<Peak360Report data={...}>`. The `ReportData` type in `src/lib/pdf/types.ts` gains `definitions`, `pageCopy`, `prescriptions` fields.

</code_context>

<specifics>
## Specific Ideas (locked from user prompt)

- **Hero copy (verbatim):** "The Peak Living Pillars" + "Peak360 translates your results into five core pillars to show where you are performing strongly, where you may be exposed, and where focused intervention can help move you toward peak living."
- **Brand frame:** Long Living → Healthy Living → Peak Living. The pillar UI must visually reinforce that the goal is **top 10% for age**, not just longevity.
- **Modal sections (in order):** (1) Pillar header (name + score + status + 1-sentence description), (2) What this pillar means, (3) Your results in this pillar, (4) What you are doing well, (5) What needs attention, (6) Score breakdown, (7) Prescription / Recommended Plan.
- **Modal copy must be plain-English, consumer-friendly, not medical jargon.** Coach-grade detail (raw values, units, ranges) is allowed inside the "Score breakdown" section but must not lead the modal.
- **Mobile is first-class.** Bottom-sheet modal on mobile, centred dialog on desktop. The test for "is this readable on mobile" applies to every text block in the modal.
- **Anti-claims (locked from prompt):** No disease-prevention claims, no longevity guarantees, no fake calculations, no extra pillars beyond the five.

## User-supplied prompt (verbatim, preserved as the source of truth)

> Use the meeting transcript direction as the product positioning foundation, and use the additional instructions in this prompt as the explicit design requirement for this phase.
>
> Core product direction from the meeting:
> Peak360 should be framed around "Peak Living". Three types of living: Long Living, Healthy Living, Peak Living. The goal is not simply to live longer, but to remain highly functional and capable as you age. Target the top 10% for age. Primarily 40+ business owners / successful people. Presentation more consumer-friendly. Dashboard/reporting must present numbers clearly. Most users will view on mobile. Data areas mentioned: Strength, Balance, Body composition, Blood markers, VO2, Questionnaires, Cardiometabolic.
>
> New design requirement: Page 10 of the final report must be transitioned into a five-pillar coloured traffic-light module. Each pillar has: name, score /100, traffic-light status/colour, short explanation. Each pillar is a clickable module/card → opens a modal showing what the pillar means, score, results, doing-well, needs-attention, sub-scores, plain-English interpretation, prescription/recommendation.
>
> Five pillars: Cardiometabolic Health, Body Composition, Strength, Balance, VO2 / Fitness Capacity. Questionnaires fold into interpretation, not a 6th pillar.
>
> Traffic light: red = poor, amber = moderate, green = strong. Score /100 prominent on card and in modal. Reuse existing scoring if it exists; don't invent clinical logic if not.
>
> Prescription linkage: link or embed prescription assigned by sports scientist / consultant. Build placeholder if no data source exists yet.
>
> Premium, modern, clean, consumer-friendly, not clinical. Mobile responsive. PDF version mirrors the cards (no modal), with note that drill-down is in the portal.

</specifics>

<deferred>
## Deferred Ideas

- **Coach (non-admin) authoring of per-pillar recommendations** — current scope locks edit to `role=admin` only. A future phase could relax to coach-of-record if Kevin's sports scientists work under a coach role rather than admin role.
- **Recommendation template library** — admins write free-text per assessment in v1. A future phase could add a `pillar_recommendation_templates` table so admins can pick from reusable named templates with optional inline edits.
- **Configurable / per-coach traffic-light thresholds** — D-10 hardcodes 0–39 / 40–69 / 70–100. A future phase can lift the constants into config or per-coach overrides if Kevin / sports scientists want bespoke rubrics.
- **Pillar-score weighting based on clinical significance** — D-08 uses an unweighted mean. A future phase with sports-science input can introduce per-marker weights inside a pillar (e.g., HbA1c weighted higher than total cholesterol within Cardiometabolic).
- **Trend overlay on pillar cards** (sparkline of last 3 assessments) — would require multi-assessment fetch and additional DB queries; out of scope for v1, but `PillarsGrid` should accept an optional `trend` prop hint so a future phase can opt in without restructuring.
- **Sixth pillar for questionnaires / lifestyle** — explicitly ruled out by the user's prompt for this phase. Capture as deferred only — do not surface a hidden sixth-pillar UI shell.
- **Per-assessment override of pillar definitions** — D-24 keeps definitions global. A future phase could allow per-assessment overrides if a particular client needs different framing, but no demand established yet.
- **Per-pillar reordering by client preference** — sort order is admin-controlled globally (D-22). Personalisation per client is deferred.
- **Versioning of pillar definitions** — current model just stamps `updated_by`/`updated_at`. A future phase could add a definitions history table similar to the normative-data versioning pattern from Phase 3, so an old assessment renders with the definitions that were live at the time it was completed.

</deferred>

---

*Phase: 8-client-report-design-refresh*
*Context gathered: 2026-05-07*
