---
slug: 260529-mwp-admin-markers-redesign-stats-modals
type: quick
autonomous: true
files_modified:
  - src/app/portal/admin/markers/page.tsx
  - src/app/portal/admin/markers/MarkersList.tsx
  - src/app/portal/admin/markers/MarkersStatsBar.tsx
  - src/lib/markers/stats.ts
  - src/lib/markers/stats.test.ts
  - src/components/admin/RangesEditModal.tsx
  - src/components/admin/ContentEditModal.tsx
  - src/app/api/markers/route.ts
---

<objective>
Redesign /portal/admin/markers so admins can: (a) see at-a-glance registry analytics, (b) browse sections via large collapsed-by-default accordions, and (c) edit ranges + content via inline centered modals without leaving the page.

Purpose: Cut the navigate-edit-back-navigate-edit-back loop that currently dominates marker admin work. The full registry (~98 seed + N DB markers) is too long to render flat, and the per-marker editors are full-page detours that lose scroll position and accordion state.

Output:
- Stats bar with chunky metric tiles (Total, Seeded vs DB, With Norms, With Content) plus a per-section breakdown row
- Section accordions collapsed by default, with large click-anywhere headers and a rotating chevron
- Two new modal components (RangesEditModal, ContentEditModal) reusing the existing PUT APIs and preserving 409 optimistic concurrency
- Existing /portal/admin/normative/[marker] + /portal/admin/marker-content/[marker] routes left alive (deep links + back-compat)
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@src/app/portal/admin/markers/page.tsx
@src/app/portal/admin/markers/MarkersList.tsx
@src/components/admin/NormativeEditPanel.tsx
@src/app/portal/admin/marker-content/[marker]/page.tsx
@src/components/ui/Dialog.tsx
@src/components/ui/Toast.tsx
@src/lib/markers/registry.ts
@src/lib/report-markers.ts
@src/app/api/markers/route.ts
@src/app/api/admin/marker-content/route.ts

<interfaces>
<!-- Key types and contracts the executor needs. Do NOT re-explore the codebase. -->

From src/lib/markers/registry.ts:
```ts
export type RegistryMarker = MarkerDef & {
  pillar?: PillarKey;          // present only on DB rows
  source: 'seed' | 'db';
  aiAliases?: string[] | null;
  severityWeight?: number | null;
  createdAt?: number;
  updatedAt?: number;
};
export async function getReportMarkers(): Promise<RegistryMarker[]>;
```

From src/lib/report-markers.ts (MarkerDef shape, abbreviated):
```ts
export interface MarkerDef {
  testKey: string;
  label: string;
  section: number;            // 1..10
  dataKey: string;
  category: string;
  subcategory?: string;
  fallbackUnit?: string;
  hasNorms: boolean;          // true iff a seed normative entry exists
}
```

GET /api/markers (existing, any authenticated role):
  Response: { success: true, data: { markers: RegistryMarker[] } }
  Note: hasNorms on seed rows = "has hardcoded standards"; for DB rows it
  reflects the markers.hasNorms column. For the "with norms" stat we want
  hasNorms OR a DB normative override exists, so we ALSO need:

GET /api/admin/normative (existing, admin only):
  Response: { success: true, data: { dbOverrides: NormativeRangeRow[], overrideKeys: string[] } }

GET /api/admin/marker-content (existing, admin only):
  Response: { success: true, data: { rows: MarkerContentRow[], authoredKeys: string[] } }
  authoredKeys is the trimmed-non-empty filter result -- USE THIS for the
  "with authored content" count, NOT rows.length.

PUT /api/admin/normative/[testKey] (existing) -- body:
  { variants: Array<{ gender, ageGroup, tiers, unit?, severityWeight }>,
    updatedAt: string | null }
  Returns 409 on optimistic-concurrency mismatch.

PUT /api/admin/marker-content/[testKey] (existing) -- body:
  { definition: string, impact: string,
    coachInsights: Record<RatingTier,{male,female}>,
    updatedAt: number | null }
  Returns 409 on optimistic-concurrency mismatch; on 200 returns
  { success: true, data: { updatedAt: number } } -- adopt server timestamp.

From src/components/ui/Dialog.tsx:
```ts
interface DialogProps {
  open: boolean;
  onClose: () => void;
  mode?: 'centered' | 'bottom-sheet' | 'auto';  // use 'centered' for these modals
  ariaLabel: string;
  children: React.ReactNode;
}
```
Dialog already implements: backdrop click + ESC close, body scroll lock,
focus trap, `[data-autofocus]` initial focus, focus restoration. Don't
hand-roll any of that.

From src/components/ui/Toast.tsx:
```ts
export default function Toast({ variant, message, onDismiss }: {
  variant: 'success' | 'error'; message: string; onDismiss: () => void;
});
```
Use for save confirmation pills instead of inline banners where it fits.

From src/components/admin/NormativeEditPanel.tsx -- this file contains the
full 5-tier editor logic (TIER_ORDER, TIER_CONFIG, emptyTiers, validateTiers,
getVariantKey, gender/age tab logic, handleTierChange, handleSave with
409 handling). Task 3 should CLONE this logic into a modal wrapper, not
import the panel as-is (the panel is sized for a side sheet, not a 640px
centered dialog, and the close button + header chrome must come from the
Dialog instead).

Brand tokens (Phase 9):
  bg-bg, bg-bg-2, bg-bg-3, border-line, border-line-2,
  text-text, text-text-dim, text-text-faint, text-gold-brand,
  bg-gold-brand/10, bg-danger/10, text-status-good.
  Mono numerics: `font-mono ... tabular-nums` (style={{ fontVariantNumeric: 'tabular-nums' }}).
  Existing stat-tile prior art: src/app/portal/page.tsx lines 247-275.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Stats engine + MarkersStatsBar</name>
  <files>
    - src/lib/markers/stats.ts (NEW)
    - src/lib/markers/stats.test.ts (NEW)
    - src/app/portal/admin/markers/MarkersStatsBar.tsx (NEW)
    - src/app/api/markers/route.ts (MODIFY - extend response with normsKeys + contentKeys; see action)
  </files>
  <behavior>
    - computeMarkerStats({markers, normsKeys, contentKeys}) returns:
        { total, seedCount, dbCount, withNormsCount, withContentCount,
          perSection: Array<{section: number, label: string, total, seed, db, withNorms, withContent}> }
    - Test 1: empty inputs -> all zeros, perSection length 10 (sections 1..10), each row zero
    - Test 2: a marker is "withNorms" if it appears in normsKeys OR (marker.source === 'seed' AND marker.hasNorms === true)
    - Test 3: a marker is "withContent" iff its testKey is in contentKeys
    - Test 4: perSection rows order 1..10 and seed+db === total for each row
    - Test 5: a DB marker with hasNorms=false but present in normsKeys still counts in withNorms (DB-override case)
  </behavior>
  <action>
    Create `src/lib/markers/stats.ts` exporting the pure function described in <behavior>. No fetches, no React. The `label` per section comes from the same SECTION_LABELS map currently inlined at the top of MarkersList.tsx -- lift that constant into stats.ts and re-import it from MarkersList in Task 2 (single source of truth).

    Create `src/lib/markers/stats.test.ts` using Vitest (project already uses Vitest 4 + jsdom; mirror the style of existing tests under src/). Cover the five cases above. Run via `npm test -- src/lib/markers/stats.test.ts`.

    Extend `GET /api/markers` in `src/app/api/markers/route.ts` so the admin page can compute "with norms" + "with content" without two extra round trips. Add an optional `?include=stats` query param:
      - When present AND the caller is admin, additionally return `normsKeys: string[]` (from getAllDbRanges -- already imported by /api/admin/normative) and `contentKeys: string[]` (the `authoredKeys` field from /api/admin/marker-content's existing logic; reuse the `hasAuthoredContent` helper -- export it from the existing file or duplicate the 12-line function locally with a comment).
      - When the caller is NOT admin and `?include=stats` is requested, silently omit those fields (do not 403; preserves the existing any-authenticated contract for the base call).
    Keep the default response shape unchanged so CustomMarkersBlock and Section11 continue to work.

    Create `src/app/portal/admin/markers/MarkersStatsBar.tsx` ('use client') that accepts `stats: MarkerStats` and renders:
      - Top row: 4 chunky tiles (Total / Seeded / DB / With norms / With content -- collapse to 4 by combining "Seeded N - DB M" into one tile titled "Sources") using the existing prior-art at `src/app/portal/page.tsx:247-275` (mono eyebrow label, 40px mono numeric value, gold accent for the DB count, status-good for With content, danger-zero state if total === 0).
      - Below tiles: a single-row per-section breakdown rendered as a horizontal grid of 10 mini-cells (Section 1..10), each showing the section number, total, and a small dot bar (4 dots: filled = seed, ringed = db, gold = withNorms, status-good = withContent) -- or, if 4-dot bar feels too dense, just two stacked mono lines "12" / "8N 6C" (norms / content counts). Match the dark-portal brand tokens.
      - Mobile: tiles stack 2-col on <sm, per-section breakdown becomes a horizontally scrollable strip.
    Do NOT wire it into the page yet -- Task 2 mounts it.
  </action>
  <verify>
    <automated>npm test -- src/lib/markers/stats.test.ts</automated>
    Also: `npm run build` succeeds (the modified /api/markers route must still type-check).
  </verify>
  <done>
    - stats.ts + 5 passing tests
    - /api/markers extended with ?include=stats (admin-gated for the stats payload, base response unchanged)
    - MarkersStatsBar.tsx renders standalone (not yet mounted)
    - Atomic commit: `feat(admin/markers): stats engine + StatsBar component`
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Section accordions (collapsed by default) + mount StatsBar</name>
  <files>
    - src/app/portal/admin/markers/MarkersList.tsx (MODIFY)
    - src/app/portal/admin/markers/page.tsx (MODIFY - mount StatsBar above the search bar)
  </files>
  <action>
    Refactor `MarkersList.tsx`:
      - Add `useState<Set<number>>(new Set())` for `expandedSections`. Default = empty set -> ALL sections collapsed (per user requirement #2).
      - Replace the current static `<section>` header (a thin row with a hairline and a count) with a button-styled accordion header that:
          * Is a single <button type="button"> spanning the full row width (large click target, >=56px tall on desktop, >=64px on mobile -- chunky touch target per requirement #3)
          * Contains: section title (left), a count chip "12 markers - 4 DB" (center-right), a 24px chevron SVG (far right) that rotates 180deg via Tailwind `transition-transform duration-200 motion-safe:` when expanded
          * `aria-expanded={isExpanded}`, `aria-controls={`section-${n}-panel`}`, keyboard-accessible by default (it IS a button -- Enter/Space toggle for free)
          * Hover state: border `gold-brand/40`, slight bg shift to `bg-bg-2`
      - The marker rows now live inside `<div id={`section-${n}-panel`} hidden={!isExpanded}>`. Use `hidden` (not conditional render) so a slow first render does not jank when a user opens a section -- markup is in the DOM, just `display: none`. (Skip if marker count for the section is zero AND there is no active query -- the existing `grouped` filter already drops empty sections.)
      - When the user types a search query (existing `query` state), auto-expand any section that has a match (still allow manual collapse). Implementation: in the existing `useMemo(...grouped...)`, also compute `autoExpand: Set<number>` of sections with `q && sectionMarkers.length > 0`, and merge with `expandedSections` for the render.
      - Replace the "Ranges" and "Content" `<Link>`s on seed rows with `<button>`s that set new state `rangesModalKey: string | null` / `contentModalKey: string | null`. (Wiring of the actual modals is in Tasks 3 + 4; for this task, stub the buttons to console.log + `alert('Modal coming in Task 3/4')` so the row still works.)
      - Lift `SECTION_LABELS` import from `src/lib/markers/stats.ts` (single source per Task 1).
      - Keep the existing DB-marker Edit/Delete affordances unchanged -- DB markers still navigate to the full editor at /portal/admin/markers/[testKey].

    Modify `src/app/portal/admin/markers/page.tsx`:
      - The page is currently a server component; switch the data flow to: server component still gates RBAC, but mounts `<MarkersList />` which now also owns the stats fetch. (Simpler than threading server-fetched stats through props for a client component that already fetches /api/markers.)
      - Inside MarkersList: change the existing `fetch('/api/markers')` call to `fetch('/api/markers?include=stats')`, store `normsKeys` + `contentKeys`, compute stats via `computeMarkerStats({ markers, normsKeys, contentKeys })`, and render `<MarkersStatsBar stats={stats} />` ABOVE the search input.
      - Loading state: skeleton already exists; extend it to include a placeholder stats bar (5 grey tiles) so the page does not jump on hydrate.

    Mobile: the accordion header must remain readable at 360px wide -- count chip wraps below title if needed; chevron stays right.
  </action>
  <verify>
    <automated>npm run build</automated>
    Manual smoke (record in commit body): load /portal/admin/markers as an admin user, confirm:
      (a) StatsBar renders with non-zero Total
      (b) All sections collapsed, large headers visible
      (c) Clicking Section 5 header expands the panel, chevron rotates 180deg
      (d) Typing "ldl" auto-expands the section containing LDL
  </verify>
  <done>
    - Sections collapsed by default, large chunky headers, rotating chevron
    - Search auto-expands matching sections
    - StatsBar mounted above search input
    - Ranges/Content buttons stubbed (alert) -- ready for Tasks 3 + 4
    - Atomic commit: `feat(admin/markers): collapsed-by-default section accordions + stats bar`
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Ranges modal (RangesEditModal)</name>
  <files>
    - src/components/admin/RangesEditModal.tsx (NEW)
    - src/app/portal/admin/markers/MarkersList.tsx (MODIFY - wire button -> modal)
  </files>
  <action>
    Create `src/components/admin/RangesEditModal.tsx` ('use client') with signature:
      ```ts
      export default function RangesEditModal({
        markerKey,
        markerLabel,
        onClose,
        onSaved,
      }: { markerKey: string; markerLabel: string; onClose: () => void; onSaved?: () => void });
      ```
    Implementation:
      - Wrap content in `<Dialog open={true} onClose={handleAttemptClose} mode="centered" ariaLabel={`Edit ranges for ${markerLabel}`}>`. The Dialog component already handles backdrop + ESC + focus trap + body scroll lock + focus restoration -- do not duplicate.
      - Clone the 5-tier editor logic from `src/components/admin/NormativeEditPanel.tsx`: imports (TIER_ORDER, TIER_CONFIG, emptyTiers, getVariantKey, validateTiers), state (markerDef, dbOverrides, hardcodedDefaults, editTiers, severityWeight, isDirty, isSaving, saveSuccess, error, validationErrors, activeGender, activeAgeGroup, serverUpdatedAt, loading, unit), the load `useEffect`, the gender/age tab UI, the per-tier min/max input rows, and the `handleSave` function (preserve the 409 path verbatim -- on 409 show "This marker was updated by another admin. Reload to see their changes before saving." with a "Reload" button that re-runs the load effect by bumping a tick counter).
      - Replace the side-sheet chrome (header bar with badge + close button) with a modal chrome:
          * Title: `markerLabel` (24px bold)
          * Sub-line: `category / subcategory / unit` (existing format)
          * Top-right close button (small X, calls `handleAttemptClose` which prompts on dirty)
          * Bottom action bar inside the dialog panel: Reset-to-defaults (left, ghost button, opens the existing confirm + DELETE flow), Cancel (text), Save Changes (gold-brand primary, disabled when !isDirty || isSaving)
      - Add `data-autofocus` to the first interactive control inside the dialog (the first gender tab if present, else the first min input) so the Dialog's initial focus lands somewhere sensible.
      - On 200 save: show inline "Saved" pill above the action bar for 1.5s, then call `onSaved?.()` and `onClose()`. (Caller decides whether to close on save -- pass `onSaved` to refresh the stats; do NOT auto-close to let the admin make multiple edits.) Decision: auto-close on first successful save (matches "save without leaving the markers page" intent -- user gets back to the list immediately). If multi-edit is desired later, swap the auto-close for a "Saved -- keep editing" toast.
      - `handleAttemptClose`: if `isDirty` show `window.confirm('Discard unsaved changes?')` -- if confirmed, call `onClose()`; otherwise no-op.

    Wire in `MarkersList.tsx`:
      - Add `const [rangesModalKey, setRangesModalKey] = useState<{key: string, label: string} | null>(null)`.
      - The seed-row "Ranges" `<button>` now calls `setRangesModalKey({key: m.testKey, label: m.label})`.
      - Render `{rangesModalKey && <RangesEditModal markerKey={rangesModalKey.key} markerLabel={rangesModalKey.label} onClose={() => setRangesModalKey(null)} onSaved={reload} />}` at the bottom of the component (reload() already exists and re-fetches /api/markers -- refreshes the stats too).
      - Keep the existing `/portal/admin/normative/[marker]` route mounted and reachable (deep links from elsewhere in the app stay alive).
  </action>
  <verify>
    <automated>npm run build</automated>
    Manual smoke (record in commit body): expand Section 5, click "Ranges" on LDL Cholesterol -> centered modal opens, edit a tier max, click Save -> modal closes, no navigation, list still scrolled to Section 5 expanded; re-open same marker -> new value persisted. Test ESC and backdrop click. Test the dirty-discard prompt.
  </verify>
  <done>
    - RangesEditModal renders 5-tier editor inside Dialog with full a11y (backdrop, ESC, focus trap)
    - 409 optimistic-concurrency path preserved (Reload affordance)
    - Reset-to-defaults flow preserved
    - Dirty-discard prompt on close
    - Auto-close on save + parent reload to refresh stats
    - Existing /portal/admin/normative/[marker] route untouched
    - Atomic commit: `feat(admin/markers): inline ranges-edit modal`
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: Content modal (ContentEditModal)</name>
  <files>
    - src/components/admin/ContentEditModal.tsx (NEW)
    - src/app/portal/admin/markers/MarkersList.tsx (MODIFY - wire button -> modal)
  </files>
  <action>
    Create `src/components/admin/ContentEditModal.tsx` ('use client') with signature:
      ```ts
      export default function ContentEditModal({
        markerKey,
        markerLabel,
        markerCategory,
        markerSubcategory,
        onClose,
        onSaved,
      }: { markerKey: string; markerLabel: string; markerCategory?: string;
           markerSubcategory?: string; onClose: () => void; onSaved?: () => void });
      ```
    Implementation:
      - Wrap in `<Dialog open={true} onClose={handleAttemptClose} mode="centered" ariaLabel={`Edit content for ${markerLabel}`}>` -- same chrome rationale as Task 3.
      - Clone the editor body from `src/app/portal/admin/marker-content/[marker]/page.tsx`: TIER_ORDER, TIER_HEX, emptyMatrix, normalizeMatrix, state (definition, impact, coachInsights, isDirty, isSaving, saveSuccess, error, serverUpdatedAt, loading, activeGender), the load `useEffect` (fetch /api/admin/marker-content/[marker]), the `handleSave` (preserve the 409 path verbatim -- 409 shows "This marker was updated by another admin. Reload to see their changes before saving." with a Reload button), the Definition textarea, the Impact textarea, the gender tabs + per-tier textareas.
      - Skip cloning the marker-resolution fetch (`fetch('/api/markers')` to find markerDef) -- the modal receives label/category/subcategory as props, so just render them directly.
      - Skip the "beforeunload dirty guard" -- ESC is handled by Dialog and we use a `handleAttemptClose` with `window.confirm` instead. (A modal that fights the browser unload event would be hostile when the parent page wants to navigate.)
      - Modal chrome:
          * Title: `markerLabel`
          * Sub-line: `category / subcategory` (only if provided)
          * Tone guidance paragraph (the existing "Write in consumer-friendly language..." copy) kept verbatim
          * Top-right close button
          * Bottom action bar: Cancel (text), Save Changes (gold-brand primary, disabled when !isDirty || isSaving). Show inline "Saved" check for 1.5s on 200, then auto-close + `onSaved?.()`.
      - Add `data-autofocus` to the Definition textarea so the dialog focuses the most-likely-edited field on open.
      - Modal body uses the Dialog's built-in `overflow-y-auto max-h-[90vh]` -- no extra scroll containers. The 10-cell matrix (5 tiers x 2 genders, surfaced one gender at a time via tabs) fits because only 5 textareas render at once.
      - `handleAttemptClose`: if `isDirty` show `window.confirm('Discard unsaved changes?')` -- if confirmed, `onClose()`; else no-op.

    Wire in `MarkersList.tsx`:
      - Add `const [contentModalKey, setContentModalKey] = useState<{key, label, category, subcategory} | null>(null)`.
      - The seed-row "Content" `<button>` now calls `setContentModalKey({key: m.testKey, label: m.label, category: m.category, subcategory: m.subcategory})`.
      - Render `{contentModalKey && <ContentEditModal markerKey={contentModalKey.key} markerLabel={contentModalKey.label} markerCategory={contentModalKey.category} markerSubcategory={contentModalKey.subcategory} onClose={() => setContentModalKey(null)} onSaved={reload} />}` alongside the ranges modal.
      - Keep the existing `/portal/admin/marker-content/[marker]` route mounted (deep links stay alive).
  </action>
  <verify>
    <automated>npm run build</automated>
    Manual smoke (record in commit body): expand Section 5, click "Content" on LDL Cholesterol -> centered modal opens, edit definition + one elite/male insight cell, Save -> modal closes, no navigation, stats bar's "With content" count increments by 1 if this was a fresh authoring (because reload re-fetches /api/markers?include=stats). Test gender tab switching keeps unsaved cells. Test ESC dirty-discard.
  </verify>
  <done>
    - ContentEditModal renders definition + impact + 10-cell matrix inside Dialog
    - 409 path preserved
    - Auto-close on save + parent reload
    - Existing /portal/admin/marker-content/[marker] route untouched
    - Atomic commit: `feat(admin/markers): inline content-edit modal`
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 5: Smoke pass, lint, build, final commit</name>
  <files>(no source edits expected unless a smoke issue surfaces)</files>
  <action>
    Run the full quality gate:
      1. `npm run build` -- must complete with zero TypeScript errors.
      2. `npm test -- src/lib/markers/stats.test.ts` -- must pass (Task 1 tests).
      3. `npm run lint` if defined in package.json scripts; otherwise skip.
    Manual smoke (Mac mini dev DB, dev server on :8080, admin@admin.com / password123):
      1. Visit /portal/admin/markers -- stats bar shows non-zero Total, all sections collapsed.
      2. Click Section 1 header -- expands smoothly, chevron rotates.
      3. Type "vo2" in search -- Section 7 auto-expands and shows VO2max.
      4. Clear search -- collapsed state of Section 7 restored to whatever the user toggled.
      5. On a seed marker, click "Ranges" -- modal opens centered, edit a tier max, Save -- modal closes, list scroll position preserved.
      6. On same marker, click "Content" -- modal opens, edit Definition, Save -- modal closes, stats "With content" count updates.
      7. Verify /portal/admin/normative/ldlCholesterol still renders (back-compat).
      8. Verify /portal/admin/marker-content/ldlCholesterol still renders (back-compat).
      9. Mobile viewport (DevTools 375px): stats tiles stack 2-col, accordion headers remain >=64px tall, modal becomes bottom-sheet-friendly (Dialog `mode="centered"` keeps it centered with horizontal padding -- if it feels cramped, ACCEPT it for v1 and note in SUMMARY).

    If any smoke step fails, fix in this task before committing.

    Final atomic commit: `chore(admin/markers): smoke pass + lint + build` (or skip this commit if no fixes were needed).
  </action>
  <verify>
    <automated>npm run build &amp;&amp; npm test -- src/lib/markers/stats.test.ts</automated>
  </verify>
  <done>
    - Build clean, tests green
    - All 9 manual smoke steps pass
    - SUMMARY auto-emitted by quick-mode harness records: any deviations, the modal-mobile-cramp decision, and a one-line link back to the existing /portal/admin/normative/* + /portal/admin/marker-content/* routes confirming back-compat.
  </done>
</task>

<task id="6" type="auto">
  <title>Hide redundant admin nav cards (Normative Ranges + Marker Content)</title>
  <files_to_modify>
    - `src/app/portal/admin/page.tsx` (ADMIN_SECTIONS array)
  </files_to_modify>
  <action>
    Comment out (do NOT delete) the two now-redundant cards in the `ADMIN_SECTIONS` array:
    - "Normative Ranges" -> /portal/admin/normative
    - "Marker Content"   -> /portal/admin/marker-content

    Wrap each entry in a clearly-labelled `/* HIDDEN 2026-05-29: consolidated into /portal/admin/markers - see commit ... */` comment block so the entries are easily restorable. Routes remain mounted; only the dashboard discovery surface is suppressed.

    Replace the two entries with a single explanatory comment block at the top of the array:
    ```ts
    // Markers consolidates Normative Ranges + Marker Content editing via in-page
    // modals. The two legacy cards are hidden but their routes remain live
    // (/portal/admin/normative, /portal/admin/marker-content) for deep links.
    ```

    Verify the Markers card still renders at the top with the updated description: e.g. "Add markers, author ranges, and write coach insights - all in one place." (1-line copy refresh aligning with the consolidated scope).
  </action>
  <verify>
    <automated>grep -c "HIDDEN 2026-05-29" src/app/portal/admin/page.tsx | awk '$1 &lt; 2 { exit 1 }' &amp;&amp; npm run build 2&gt;&amp;1 | tail -5</automated>
    <manual>
      1. Visit /portal/admin as admin -- "Normative Ranges" and "Marker Content" cards are NO LONGER visible
      2. Visit /portal/admin/normative directly -- page still renders (back-compat preserved)
      3. Visit /portal/admin/marker-content directly -- page still renders (back-compat preserved)
      4. The Markers card sits where Normative Ranges used to and reflects the consolidated copy
    </manual>
  </verify>
  <done>
    - 2 cards suppressed via comment blocks (not deleted)
    - Routes still reachable via direct URL
    - Markers card copy reflects consolidated scope
    - Atomic commit: `feat(admin): consolidate Normative + Marker Content under Markers nav card`
  </done>
</task>

</tasks>

<verification>
End-to-end: an admin can land on /portal/admin/markers, see registry analytics at a glance, expand one section, edit both ranges and content on a marker, and never leave the page. Deep links into the old per-marker routes still work.
</verification>

<success_criteria>
- Stats bar shows: Total markers (seed + DB), Sources (seed N / DB M), With norms, With content -- all live, all reflecting the merged registry
- Per-section breakdown row visible (sections 1..10)
- All sections collapsed on first paint; headers are large chunky tap targets with rotating chevrons
- "Ranges" button opens centered modal -> edit -> Save -> close, no navigation
- "Content" button opens centered modal -> edit -> Save -> close, no navigation
- 409 optimistic-concurrency handling intact in both modals (Reload affordance, no silent data loss)
- /portal/admin/normative/[marker] and /portal/admin/marker-content/[marker] routes still render (back-compat)
- npm run build clean; new stats.ts unit tests green
- 5 atomic commits (one per task), with manual smoke notes in commit bodies where called out
</success_criteria>

<output>
Create `.planning/quick/260529-mwp-admin-markers-redesign-stats-modals/SUMMARY.md` when done (handled automatically by quick-mode harness after final task completes).
</output>
