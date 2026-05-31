# Phase 11: Report marker-detail expansion + admin coach insights - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning
**Source:** Interactive scoping session (decisions captured via AskUserQuestion; equivalent to discuss-phase)

<domain>
## Phase Boundary

In the Longevity Analysis report (the final report page, shown to users as "Section 10 / 10"; rendered by `src/components/sections/Section11.tsx` → `PillarsDisplay` → `PillarsDisplayModal`), make each **marker row inside a pillar modal clickable** so it expands a **detail panel** revealing, for that marker:

1. **Definition** — "what it is" (gender-neutral).
2. **Impact** — "how it affects you" (gender-neutral).
3. **Coach Insight** — admin-authored, **per RatingTier** (all 5: poor/cautious/normal/great/elite) and **per gender** (separate male/female text), shown matched to the viewing client's tier + gender; **falls back** to the existing `generatePeak360Insights` output when no authored content exists.

Add a new **admin-only, global content store** and an **admin authoring UI** so an administrator can edit the definition, impact, and the full per-tier × per-gender coach-insight matrix for every marker. Pre-seed researched draft content for all ~98 `REPORT_MARKERS`.

In scope:
- Make markers inside `PillarsDisplayModal` interactive (click → detail panel). Two-pane master/detail layout on desktop (widen the modal); drill-in (list → detail with back affordance) on mobile.
- New `marker_content` DB table (admin-global content), seed migration, admin CRUD UI + API, and report-read wiring + fallback resolution.
- A design mockup already exists and serves as the visual contract: `mockups/marker-detail-modal.html` (live dark-portal tokens, Inter Tight + JetBrains Mono).

Out of scope (deferred):
- **No PDF / `@react-pdf` changes.** Web report only. `src/lib/pdf/*` and `Peak360Report.tsx` are untouched.
- Gender-specific Definition or Impact (both are gender-neutral this phase — see D-04).
- Coach (non-admin) authoring; per-coach content libraries; AI-assisted draft generation inside the admin UI.
- Trend/over-time comparisons, new pillars, or changes to pillar scoring/mapping.

</domain>

<decisions>
## Implementation Decisions

### Surface & Interaction
- **D-01:** The feature lives in the existing pillar modal **`src/components/report/PillarsDisplayModal.tsx`** (reached from `Section11.tsx` → `src/components/report/PillarsDisplay.tsx`). The current modal renders `pillarMarkers` grouped by tier as static `<li>` rows; those rows become interactive (button) and selecting one reveals the marker detail panel. The existing hero, score breakdown bar, tier grouping, and pillar-level "Insights & recommendations" block are preserved.
- **D-02:** **Layout = master/detail.** Desktop: widen the modal (from `max-w-[640px]` to roughly `max-w-[980px]`) into two panes — left = the existing tier-grouped marker list (selectable rows), right = the detail panel (slides/fades in). Mobile: single column **drill-in** — tapping a marker pushes the detail view with a back control returning to the list (no room to expand "right" on a phone). The visual contract is `mockups/marker-detail-modal.html`.
- **D-03:** **Detail panel content order:** (1) marker header (name + value + unit + tier pill), (2) "What it is" = Definition, (3) "How it affects you" = Impact, (4) "Coach insight" card (gold-railed) tagged with a "[Male|Female] · [Tier label]" badge, with optional bulleted action items.

### Content Model & Gender/Tier Matrix
- **D-04:** **Definition and Impact are gender-neutral** — one text each per marker. Both are **admin-editable**.
- **D-05:** **Coach Insight is gender-specific and tier-specific.** The admin authors **separate male and female** text for **all five tiers** (Attention/poor, Cautious, Normal, Optimal/great, Peak/elite). All 5 tiers are authored content (no tier is auto-praise). The client sees exactly the insight matching `(marker tier, client gender)`. Client gender comes from Section 1 (`clientGender`), already loaded in `Section11`.
- **D-06:** **Fallback chain for the Coach Insight block:** if an authored coach insight exists for `(testKey, tier, gender)`, render it; otherwise fall back to the existing `generatePeak360Insights` output routed to that marker (the same insight the modal already surfaces). The fallback state is visually labelled "Auto-generated · no coach insight authored yet" (see mockup, hs-CRP example). Definition/Impact have no auto fallback — if blank, their block is omitted.

### Data Model (admin-global)
- **D-07:** **Admin-only, global content.** Mirrors the `pillar_definitions` ownership model (one canonical store applied to every client of every coach). Coaches and clients READ; only `role=admin` WRITEs.
- **D-08:** New table **`marker_content`** in `src/lib/db/schema.ts` (Drizzle `pgTable`), keyed by `testKey`:
  ```
  marker_content (
    test_key       TEXT PRIMARY KEY,        -- matches REPORT_MARKERS[].testKey
    definition     TEXT,                    -- gender-neutral, nullable
    impact         TEXT,                    -- gender-neutral, nullable
    coach_insights JSONB,                   -- { [tier]: { male: string|null, female: string|null } }
    updated_by     TEXT NOT NULL,
    updated_at     INTEGER NOT NULL         -- epoch ms (matches pillar_definitions convention)
  )
  ```
  One row per marker keeps the admin form a single optimistic save. The `coach_insights` shape is `Record<RatingTier, { male: string | null; female: string | null }>`. Schema change requires `npm run db:generate` + `npm run db:push` (BLOCKING push task — Drizzle).
- **D-09:** **Seed** researched draft content for all ~98 `REPORT_MARKERS` (definition, impact, and 5 tiers × 2 genders coach insights), shipped as an **idempotent** seed (re-running does not overwrite admin edits — insert-if-absent per `test_key`). Drafts are research-informed but clearly editable defaults; the admin refines. Seeding strategy (script vs migration) is the planner's call, mirroring the Phase 8 idempotent pillar seed.

### Admin Authoring UI + API
- **D-10:** New admin pages cloned from the **`/portal/admin/normative/[marker]`** pattern:
  - `/portal/admin/marker-content` — marker list (grouped by category, like the normative list), linking to per-marker editors.
  - `/portal/admin/marker-content/[marker]` — editor with: Definition + Impact textareas; a Coach Insight matrix (5 tiers × Male/Female tabs, reusing the existing gender-tab affordance); optimistic-concurrency PUT keyed on `updated_at`; `beforeunload` dirty guard; Save / success states.
  Both gated server-side: non-admin sessions redirect/403 (mirror the existing admin pages' `auth.api.getSession` → `session.user.role !== 'admin'` gate).
- **D-11:** New API routes mirroring `/api/admin/normative[/[marker]]`:
  - `GET/PUT /api/admin/marker-content/[marker]` (admin-gated; PUT does optimistic-concurrency check + audit).
  - Optionally `GET /api/admin/marker-content` (list) — planner decides if the list page reads `REPORT_MARKERS` statically + a bulk content fetch.
  - Every write emits `logAuditEvent` with a new `AuditAction` member **`'marker_content.update'`** (add to the union in `src/lib/audit.ts`).
- **D-12:** **Report read path:** `Section11` is a client component that already fetches section data via `fetch('/api/assessments/[id]/sections/[num]')`. Add a **client-readable** `GET /api/marker-content` (returns all `marker_content` rows; authenticated, any role) and fetch it inside the existing `loadReport()` effect, threading the content + a resolver down through `PillarsDisplay` → `PillarsDisplayModal`. (Planner may instead pre-resolve a `Map<testKey, MarkerContent>`.)

### Visual / Brand
- **D-13:** The dark-portal brand is the constraint, not a new aesthetic. Tokens: `--color-bg #0a0a0b`, `--color-bg-2 #0e0e10`, `--color-bg-3 #131316`, `--color-text #ece5d3`, `--color-gold-brand #c9a24a`, `--color-champagne #e8d6a8`, `--color-line`/`--color-line-2`; tier hues poor `#ef4444` / cautious `#f59e0b` / normal `#94a3b8` (slate) / great `#3b82f6` / elite `#10b981`. Fonts Inter Tight + JetBrains Mono. Reuse existing motifs (mono eyebrow, corner brackets, gold rail). The coach-insight card uses a gold→champagne left rail and a tier-dot "Male/Female · Tier" badge.
- **D-14:** **Tone / anti-claims:** consumer-friendly, no disease-prevention or longevity guarantees, no fabricated numbers. The admin editor surfaces this as guidance text (mirrors Phase 8 D-30).

### Claude's Discretion
- Exact modal width, pane ratio, scroll behavior, and the entrance animation (within the premium/restrained brand).
- Whether the read resolver is a flat fetch in `Section11` or pre-resolved into a `Map`; whether the admin list reads content in bulk or lazily.
- Seed delivery mechanism (standalone `scripts/` seed vs Drizzle migration), provided it is idempotent.
- The precise depth/word-count of seeded draft content per marker (research-informed; admin refines).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The surface being extended
- `src/components/sections/Section11.tsx` — report component; `loadReport()` effect (client-side section fetches), client gender/age derivation, passes `markers` + `insights` into `<PillarsDisplay>`. Add the marker-content fetch + thread-through here.
- `src/components/report/PillarsDisplay.tsx` — renders pillar cards; opens `<PillarsDisplayModal>` with `pillar`, `markers`, `insights`.
- `src/components/report/PillarsDisplayModal.tsx` — **primary file to modify.** Centred dialog (`max-w-[640px]`), markers grouped by tier as static `<li>` rows, focus trap, ESC/backdrop close, pillar-level insights block. This becomes the master/detail container.
- `mockups/marker-detail-modal.html` — **visual contract** for the expanded modal (desktop two-pane + mobile drill-in), using live tokens.

### Admin authoring pattern to clone
- `src/app/portal/admin/normative/[marker]/page.tsx` — editor pattern: per-marker load, gender tabs (`'all'|'male'|'female'`), optimistic-concurrency PUT (`updatedAt`), `beforeunload` guard, Save/Reset/success states, validation.
- `src/app/api/admin/normative/route.ts` + `src/app/api/admin/normative/[marker]/route.ts` — admin-gated GET/PUT + 409 conflict semantics.
- `src/app/portal/admin/pillars/page.tsx` + `src/app/portal/admin/pillars/AdminPillarsForm.tsx` — SSR admin gate (`auth.api.getSession` → `role !== 'admin'` redirect) and global-content authoring shell (closest analog to global `marker_content`).
- `src/lib/pillars/queries.ts` — `getPillarDefinitions()` global-content read pattern; the `marker_content` read query mirrors this.

### Data, ratings, fallback insights
- `src/lib/db/schema.ts` — add `marker_content` table; follow `pillar_definitions` column conventions (`updated_by` TEXT, `updated_at` INTEGER epoch ms, JSONB blobs like `normativeRanges.tiers`).
- `src/lib/report-markers.ts` — `REPORT_MARKERS` (~98 entries; `testKey`, `label`, `category`, `subcategory`). Source of truth for the seed set and the admin marker list.
- `src/types/normative.ts` — `RatingTier`, `TIER_LABELS` (Peak/Optimal/Normal/Cautious/Attention). The coach-insights JSON is keyed by `RatingTier`.
- `src/lib/normative/ratings.ts` — `getPeak360Rating()`; the tier a client's marker falls into selects the insight.
- `src/lib/normative/insights.ts` — `generatePeak360Insights()` (the D-06 fallback source; routed per marker into the modal today).
- `src/lib/audit.ts` — `logAuditEvent` + `AuditAction` union; add `'marker_content.update'`.

### Brand & gate patterns
- `src/app/globals.css` — dark-portal `@theme` tokens (D-13) and `--font-sans`/`--font-mono`.
- `.planning/phases/08-client-report-design-refresh/08-CONTEXT.md` — the directly-analogous prior phase (global admin content + report module + idempotent seed + RBAC + audit). Reuse its patterns; do not regress its SSR ownership gate on the report.

</canonical_refs>

<code_context>
## Existing Code Insights

- **Read path is client-side.** `Section11` fetches per-section data in a `useEffect`; there is no SSR data load for this report component (unlike the Phase 8 `/portal/assessment/[id]/report` SSR page). Therefore `marker_content` needs a **client-readable** authenticated GET endpoint (D-12), not an SSR prop thread.
- **Gender is already in hand.** `Section11` derives `gender = info.clientGender` and `age` for rating. The modal does not currently receive gender — it must be threaded `PillarsDisplay → PillarsDisplayModal`, or the resolved insight selection done in `Section11`/`PillarsDisplay` before the modal renders.
- **Modal markers carry tier + value already** (`ReportMarker.tier`, `.value`, `.unit`, `.key`, `.label`). The detail panel needs no new per-marker computation beyond joining on `testKey` to `marker_content` and selecting the `(tier, gender)` insight.
- **`testKey` is the universal join key** across `REPORT_MARKERS`, ratings, insights (`markerKey`), and the new table — no new identifier scheme needed.
- **Admin editor concurrency** — the normative editor already implements the 409-on-stale-`updatedAt` pattern; clone it verbatim for `marker_content` so concurrent admin edits are safe.

</code_context>

<specifics>
## Specific Ideas (locked from the scoping session)

- Worked example used throughout the mockup: **Cardiometabolic** pillar, male client — Total Testosterone (Attention) authored insight; hs-CRP (Attention) showing the auto-generated **fallback** state; LDL (Cautious), HbA1c (Normal), HDL (Peak).
- Coach-insight card shows a **"Male · Attention"**-style badge so it's explicit the content is tailored to the viewer.
- "All 5 tiers required" is a content-authoring expectation, made tractable by D-09 pre-seeding; the runtime fallback (D-06) guarantees no empty blocks during rollout.

</specifics>

<deferred>
## Deferred Ideas

- **Gender-specific Definition / Impact** — chosen gender-neutral for v1 (D-04). Could split later if biology framing demands it.
- **PDF inclusion** — web report only this phase; expanding marker detail into `@react-pdf` is a later phase.
- **Coach (non-admin) authoring** and **per-coach content libraries** — admin-global only (D-07), mirroring Phase 8's deferred coach-authoring.
- **AI-assisted draft generation / regeneration** inside the admin editor — seed is researched/static for now.
- **Versioning** of marker content (history table) — only `updated_by`/`updated_at` stamping this phase.

</deferred>

---

*Phase: 11-report-marker-detail-coach-insights*
*Context gathered: 2026-05-26 via interactive scoping session*
