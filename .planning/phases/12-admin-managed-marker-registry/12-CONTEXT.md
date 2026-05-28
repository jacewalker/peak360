# Phase 12: Admin-managed marker registry - Context

**Gathered:** 2026-05-28
**Status:** Ready for planning
**Source:** Interactive scoping session (decisions captured via AskUserQuestion; equivalent to discuss-phase)

<domain>
## Phase Boundary

Today an administrator can author **content** (definition / impact / per-tier × per-gender coach insights — Phase 11) and **thresholds** (5-tier ranges, gender + age-bucketed — Phase 3) for any marker that is already declared in the hardcoded `REPORT_MARKERS` array (`src/lib/report-markers.ts`). To add a brand-new marker today, a developer must edit 4 source files (`REPORT_MARKERS`, `normative/data.ts`, `ai/field-mappings.ts`, `normative/insights.ts`) and redeploy.

Phase 12 introduces a **DB-backed marker registry** so admins can add a new marker (biomarker or fitness-test) end-to-end without a code change. The new marker must:

1. Be persisted in the database (not the hardcoded array).
2. Appear in the appropriate Section 11 pillar in the **interactive portal report** (`PillarsDisplay` → `PillarsDisplayModal`).
3. Appear in the **exported PDF report** (`src/lib/pdf/*` → `MarkerRow` / `MarkerTable`).
4. Ship with its own **coach insights** (per-tier × per-gender, authored via the existing Phase 11 editor).
5. Ship with its own **tier ranges** (5-tier poor/cautious/normal/great/elite), supporting **gender-specific** and **age-bucketed** ranges (matching the Phase 3 `normativeRanges` editor).
6. Be available for **AI extraction** when admins supply aliases (optional).
7. Be **enterable by coaches** in the section form alongside the hardcoded fields.

In scope:
- New `markers` DB table that becomes the source of truth for marker registry rows, alongside the existing seed in `REPORT_MARKERS`.
- A merge layer so `getReportMarkers()` returns `seed ⋃ DB rows` (de-duplicated by `testKey`).
- Admin "Add marker" UI under `/portal/admin/markers` (list + create form + edit/delete) and API at `/api/admin/markers[/[testKey]]`.
- A coach-facing **`CustomMarkersBlock`** component that each Section1–10 includes near the bottom; it auto-renders DB-driven markers assigned to its section and writes back to the same sectionData JSON blob.
- Wiring DB-driven markers through the existing pillar mapping (`src/lib/pillars/mapping.ts`), the Section 11 pillar modal, and the PDF marker pipeline so they render identically to seeded markers.
- Audit logging on every admin marker mutation.
- Optional AI extraction aliases stored on the marker row and merged into the AI extraction pipeline.

Out of scope (deferred):
- Editing the **definition / impact / coach insights** content lives in the existing Phase 11 editor (`/portal/admin/marker-content/[marker]`). The Add-marker flow redirects there after registry save.
- Editing the **tier ranges** lives in the existing Phase 3 editor (`/portal/admin/normative/[marker]`). The Add-marker form captures only the initial ranges (with sensible defaults); deeper edits happen in the normative editor.
- **Bulk import** of markers (CSV upload). One-at-a-time admin entry only.
- **Coach-authored** markers; only `role=admin` writes.
- Renaming or deleting **seeded** markers (DB rows are deletable; seeded markers in `REPORT_MARKERS` are immutable from the admin UI).
- New pillars; admin must pick from the 5 existing pillars (`cardiometabolic`, `bodyComposition`, `strength`, `balance`, `vo2`).
- Changes to the rating-engine algorithm, the AI extraction model, or the section-form scaffolding outside the new `CustomMarkersBlock`.

</domain>

<decisions>
## Implementation Decisions

### Registry Source of Truth
- **D-01:** New table **`markers`** in `src/lib/db/schema.ts` (Drizzle `pgTable`) keyed by `testKey`. **Hardcoded `REPORT_MARKERS` stays as the canonical seed baseline** (zero-touch backwards compatibility). At read time, a new helper `getReportMarkers()` returns the **union** of seeded markers + DB rows, de-duplicated by `testKey` with DB rows winning on conflict (allows future override of seeded metadata without code change). Existing call sites that import `REPORT_MARKERS` directly migrate to `getReportMarkers()` over the course of this phase.
- **D-02:** Table shape:
  ```
  markers (
    test_key       TEXT PRIMARY KEY,        -- camel_snake; admin-entered or derived from label
    label          TEXT NOT NULL,           -- human-readable
    section        INTEGER NOT NULL,        -- 1..10 (Section 11 is report-only, not an input)
    data_key       TEXT NOT NULL,           -- camelCase, written to sectionData JSON blob
    pillar         TEXT NOT NULL,           -- one of PILLAR_KEYS
    category       TEXT NOT NULL,           -- matches REPORT_MARKERS.category convention
    subcategory    TEXT,                    -- nullable
    fallback_unit  TEXT,                    -- nullable; matches MarkerDef.fallbackUnit
    has_norms      BOOLEAN NOT NULL,        -- if false, marker shows value but no tier/rangebar
    ai_aliases     JSONB,                   -- string[] of alias terms for field-mappings.ts (nullable)
    severity_weight INTEGER,                -- mirrors normativeRanges.severityWeight (optional)
    created_by     TEXT NOT NULL,
    created_at     INTEGER NOT NULL,        -- epoch ms
    updated_by     TEXT NOT NULL,
    updated_at     INTEGER NOT NULL
  )
  ```
  Constraints: `test_key` matches `^[a-z][a-z0-9_]*$` (server-validated, reserved against any existing seeded `testKey`); `data_key` matches `^[a-z][a-zA-Z0-9]*$`; `section` in `1..10`; `pillar` in `PILLAR_KEYS`. Schema change requires `npm run db:generate` + `npm run db:push` (**BLOCKING push task** — Drizzle).
- **D-03:** **No data migration of existing markers into the table.** REPORT_MARKERS in code stays the source for the ~98 seeded markers (preserves Phase 11 seed coupling and the `markerContent` `test_key` foreign relation). DB rows only contain admin-added markers in this phase. (A future phase may migrate seeded rows into DB if a strong reason emerges; not required by this phase.)

### AI Extraction Aliases
- **D-04:** When the admin adds a marker they may enter **optional alias terms** (comma-separated) stored as `ai_aliases JSONB`. A new helper `getFieldMappings()` returns the union of the hardcoded `fieldMappings` record + a flattened map of `{alias.toLowerCase() → marker.dataKey}` from the DB. The AI extraction route (`/api/ai/extract` / verify) imports from `getFieldMappings()` instead of the static `fieldMappings`. If aliases are blank, the marker is manual-entry only (no AI participation).

### Initial Ranges at Marker Creation
- **D-05:** The Add-marker form captures **inline initial tier ranges** (poor/cautious/normal/great/elite, unisex only at create time) when `has_norms = true`. On submit, these are written to the existing `normativeRanges` table as the marker's initial unisex range. To add gender-specific or age-bucketed variants, admin uses the existing `/portal/admin/normative/[marker]` editor (linked from the post-create redirect). When `has_norms = false`, the inline ranges block is hidden and the marker shows value-only in reports.

### Coach Insights at Marker Creation
- **D-06:** Two-step authoring. The Add-marker form creates the registry row + initial ranges only. On successful save, redirect to `/portal/admin/marker-content/[marker]` (the existing Phase 11 editor) for the admin to author the definition / impact / 10-cell coach insight matrix. Until those are authored, the report uses the same **`generatePeak360Insights` fallback** behavior Phase 11 ships (the report stays usable but shows "Auto-generated · no coach insight authored yet" badge — see Phase 11 D-06).

### Pillar Assignment
- **D-07:** Add-marker form has **two dropdowns**: `section` (1–10) and `pillar` (5 options). They are independent — a Section-5 (blood) marker can be assigned to any pillar including `cardiometabolic` or `strength`. The `markerToPillar()` resolver (`src/lib/pillars/mapping.ts`) is extended so DB-driven markers short-circuit the existing heuristic regex and return their stored `pillar` directly; seeded markers continue through the existing regex/category logic.

### Coach Input UX (Value Entry)
- **D-08:** New shared component **`<CustomMarkersBlock section={N} data={data} onChange={onChange} />`** rendered near the bottom of each `Section1.tsx`–`Section10.tsx` (above any "navigate" button). It:
  - Queries the markers list via a new client-readable `GET /api/markers` (returns all DB-driven markers; authenticated, any role).
  - Filters to rows where `marker.section === N`.
  - Renders one numeric input per marker (label, unit suffix, optional description tooltip) using the existing `<FormField>` primitive.
  - Writes back to `sectionData[N][marker.dataKey] = value` via the existing `onChange(fieldName, value)` callback (no new state plumbing).
  - When no DB-driven markers exist for the section, the block self-hides (no empty heading shown).
  - Sections 11 (report) is the only section excluded — markers there are display-only.
- **D-09:** Section forms are touched once per section to insert `<CustomMarkersBlock />`; thereafter zero per-marker code changes. Existing `<FormField>` patterns (camelCase ids, `(v) => onChange('field', v)`) are preserved.

### Report (Section 11) Integration
- **D-10:** `Section11` already loads `REPORT_MARKERS` to build the pillar groupings. Migrate that call site to `getReportMarkers()` so DB-driven markers flow through unchanged: `PillarsDisplay` → `PillarsDisplayModal` show them in the correct pillar with the same tier pill, range bar, and (when `markerContent` is authored) marker detail panel. No new UI in Section 11.

### PDF Integration
- **D-11:** The PDF data loader (`loadReportData` in `src/lib/pdf/`) migrates from `REPORT_MARKERS` to `getReportMarkers()`. `MarkerRow` and `MarkerTable` render DB-driven markers identically to seeded ones (same `name + value + unit + tier pill + range bar` layout). **No visual distinction** between seeded and DB-driven markers in the PDF (per locked decision: "same rendering, no custom badge"). No PDF component code change required.

### Admin UI
- **D-12:** New admin surface **`/portal/admin/markers`**:
  - **List page** (`/portal/admin/markers/page.tsx`) — grouped by section, mirroring `/portal/admin/normative`'s list pattern. Shows seeded markers (badged "seeded", read-only) and DB-driven markers (editable rows with edit/delete actions). Top-right "Add marker" CTA.
  - **Create page** (`/portal/admin/markers/new/page.tsx`) — form with: label, auto-derived `test_key` + `data_key` (editable preview), section dropdown, pillar dropdown, category text, subcategory text (optional), unit (optional), has_norms toggle, inline ranges editor (5 tier min/max pairs, shown when has_norms = true), AI aliases textarea (optional, comma-separated), severity weight slider. Submit creates marker + initial range, redirects to `/portal/admin/marker-content/[test_key]` to author content.
  - **Edit page** (`/portal/admin/markers/[testKey]/page.tsx`) — same form, prefilled. Deleting a marker also clears its `markerContent` and `normativeRanges` rows (or admin is shown a confirm explaining cascade). Seeded markers are NOT editable here (admin is redirected to `/portal/admin/normative/[marker]` and `/portal/admin/marker-content/[marker]` for changes to seeded markers).
  - Add a new card to the `ADMIN_SECTIONS` array in `/portal/admin/page.tsx`: "Markers — Add or remove markers from any assessment section".
  - All admin pages gated server-side: non-admin sessions redirect/403 (mirror existing admin pages' `auth.api.getSession` → `session.user.role !== 'admin'` gate).

### Admin API
- **D-13:** New API routes mirroring `/api/admin/normative[/[marker]]`:
  - `GET /api/admin/markers` — list all DB-driven markers (admin-gated).
  - `POST /api/admin/markers` — create marker. Server validates test_key uniqueness (against DB **and** seeded REPORT_MARKERS), validates regex patterns, validates pillar/section enums, atomically writes marker row + initial `normativeRanges` row (when has_norms), emits audit.
  - `GET /api/admin/markers/[testKey]` — fetch single (admin-gated).
  - `PUT /api/admin/markers/[testKey]` — update. Optimistic-concurrency check on `updated_at`. Re-syncing `ai_aliases` is allowed; changing `data_key` is **blocked** post-create (would orphan existing assessment data) — add server-side guard.
  - `DELETE /api/admin/markers/[testKey]` — delete marker + cascade delete its `marker_content` and `normative_ranges` rows. Per-assessment `sectionData` blobs are left untouched (stale keys remain harmlessly in JSON).
  - Every write emits `logAuditEvent` with new `AuditAction` members: **`'marker.create'`**, **`'marker.update'`**, **`'marker.delete'`** (add to the union in `src/lib/audit.ts`).
- **D-14:** Client-readable **`GET /api/markers`** (any authenticated role) returns the merged registry (seed + DB). Used by `CustomMarkersBlock`, by `Section11` if it client-fetches (currently it imports REPORT_MARKERS directly — see D-10), and by the AI extraction route to build alias maps.

### Visual / Brand
- **D-15:** All new admin surfaces inherit the Phase 9 dark portal brand (`--color-bg`, `--color-text`, `--color-gold-brand`, Inter Tight + JetBrains Mono, mono eyebrows, gold rails). Form patterns clone `/portal/admin/normative/[marker]` and `/portal/admin/marker-content/[marker]` for visual consistency. `CustomMarkersBlock` inherits Section-form styling (Phase 9 light card surfaces in the section forms).
- **D-16:** **Tone / anti-claims:** consumer-friendly labels and descriptions; no disease-prevention language. Admin editor surfaces guidance text where relevant (mirrors Phase 8 D-30 / Phase 11 D-14).

### Claude's Discretion
- Exact layout of the "Add marker" form (single column vs grouped sections); inline vs modal range editor.
- Whether the marker list uses a single page with section accordions or section tabs.
- The text of derivation rules for auto-suggesting `test_key` and `data_key` from a `label`.
- Whether the delete-cascade confirm is a modal or an inline destructive-confirm.
- Whether the merge in `getReportMarkers()` is computed on every call or memoized.
- Whether `getFieldMappings()` is async (DB-driven) or server-cached.

</decisions>

<assumptions>
## Assumptions

1. **No assessment data migration needed** when a marker is added — existing assessments simply don't have a value for the new marker (`undefined` → shows as "Not recorded", matching existing behavior for unfilled fields).
2. **No retroactive AI re-extraction** — newly-added markers with aliases will only be picked up on **future** AI extractions; existing uploaded files are not re-processed.
3. **No marker reordering** — markers appear in a deterministic order: seeded markers first (in their existing order), then DB-driven markers (by `created_at` ascending). Drag-to-reorder is out of scope.
4. **Pillar count is fixed at 5** for this phase (the existing PILLAR_KEYS). Adding pillars is a separate concern.
5. **`hasNorms = false` markers** render value-only (no tier pill, no range bar, no coach insight slot). They still appear in the pillar's marker list in Section 11 and the PDF.
6. **Seeded markers stay editable in their existing places** (normative editor, marker-content editor) — Phase 12 does not break Phase 3 or Phase 11.
7. **Test coverage:** unit tests for `getReportMarkers()` merge logic, `getFieldMappings()` merge, and the markerToPillar DB-override path. Integration: a Vitest test creates a DB marker, fetches `GET /api/markers`, and confirms the merged list includes it. UI tests via Playwright are nice-to-have but not required (mirrors Phase 11 verification posture).

</assumptions>

<risks>
## Risks

1. **`test_key` collisions** — if an admin enters a test_key that overlaps a seeded marker, the merge would shadow the seed. Mitigation: server-side uniqueness check against both DB and the in-memory REPORT_MARKERS list on POST (return 409).
2. **Stale `sectionData` JSON keys** after a marker delete — assessment JSON blobs keep the deleted marker's `dataKey`. This is harmless (orphan field, unread) but is technical debt. Mitigation: documented, not cleaned up; acceptable for v1.
3. **`CustomMarkersBlock` requires editing all 10 section components** — boring but mechanical. Mitigation: one commit per section, identical insertion pattern, can be batch-applied. Tests confirm each section still renders.
4. **AI aliases broaden the extraction surface** — a poorly-chosen alias (e.g. a generic term like "iron") could mis-route values. Mitigation: admin editor surfaces guidance ("be specific, prefer multi-word terms"); no auto-extraction without explicit alias entry.
5. **Migration to `getReportMarkers()` is a wide change** — every call site that imports `REPORT_MARKERS` directly must be updated. Mitigation: grep-driven sweep, listed in the plan as an explicit task; old direct imports tolerated where seeded-only is required (e.g., seed migrations).

</risks>
