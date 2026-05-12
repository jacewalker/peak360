---
phase: 09-brand-language-alignment-across-portal-dashboard-assessment-
fixed_at: 2026-05-12T08:30:00Z
review_path: .planning/phases/09-brand-language-alignment-across-portal-dashboard-assessment-/09-REVIEW.md
iteration: 1
findings_in_scope: 23
fixed: 20
skipped: 3
status: partial
---

# Phase 9: Code Review Fix Report

**Fixed at:** 2026-05-12
**Source review:** `.planning/phases/09-brand-language-alignment-across-portal-dashboard-assessment-/09-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 23 (4 critical, 11 warning, 8 info — `--all` scope)
- Fixed: 20
- Skipped: 3 (all info, two marked optional by reviewer + one cross-reference-only)

## Fixed Issues

### CR-01: NormativeEditPanel is still on the legacy light/navy palette

**Files modified:** `src/components/admin/NormativeEditPanel.tsx`
**Commit:** fd36c83
**Applied fix:** Removed inline `style={{ backgroundColor: '#0f2440' }}`, replaced
with `bg-bg-2 border-b border-line`. Token-swapped: `bg-gold-brand/20 text-gold-brand border border-gold/30`
→ `border-gold-brand/30`; `text-white/X` → `text-text-faint`/`text-text-dim`;
`text-emerald-400` → `text-status-good`; `bg-bg-3/10 text-white/40 border border-white/10`
→ `bg-bg-3 text-text-faint border border-line`; `border-red-400 ring-red-200` →
`border-danger/40 ring-danger/20`; `bg-red-50 text-red-600 border-red-200` →
`bg-danger/10 text-danger border-danger/30`; the destructive Reset button → `text-danger
border-danger/40 hover:bg-danger/10`; the Save button → `bg-gold-brand text-bg
hover:bg-champagne` (replaces the undefined `bg-gold-brand-dark`); the active-tab
underline → `border-gold-brand`. Input focus rings → `focus:border-gold-brand
focus:ring-gold-brand/20`.

### CR-02: /portal/admin/normative/[marker]/page.tsx not converted to Phase 9 tokens

**Files modified:** `src/app/portal/admin/normative/[marker]/page.tsx`
**Commit:** ae95e91
**Applied fix:** Display H1 `font-bold` → `font-medium` and the unit pill
`font-bold` → `font-medium` (UI-SPEC Display-40). Tabs: `border-gold` →
`border-gold-brand`. Input error/focus: `border-red-500 / focus:border-gold
focus:ring-gold/25` → `border-danger / focus:border-gold-brand
focus:ring-gold-brand/25`. Validation error text `text-red-500` → `text-danger`.
Range slider `accent-gold` → `accent-gold-brand`. Destructive Reset button
red-XXX → danger tokens. Primary Save button `bg-gold-brand text-white
hover:bg-gold-brand/90` → `bg-gold-brand text-bg hover:bg-champagne`. Error
banner `bg-red-50 text-red-600` → `bg-danger/10 text-danger border-danger/30`.
(File left in place rather than deleted — reviewer noted the parallel-editor
question as a follow-up, not a required fix.)

### CR-03: TrendsTab calls setState during render — invalid React pattern

**Files modified:** `src/app/portal/clients/[name]/TrendsTab.tsx`
**Commit:** 16c625a
**Applied fix:** Removed the ad-hoc `useState(false)` + render-time
`hasTriggered[1](true); generate();` pair. Replaced with a single
`useEffect(() => { if (!assessment && !loading && !error) generate(); }, [])`
mount effect with the standard `react-hooks/exhaustive-deps` eslint-disable.
Added `useEffect` to the react import line. (Same commit also addresses WR-05
TIER_PILL in this file — both touched the same component so they ship together.)

### CR-04: ProgressBar divide-by-zero / overflow on edge cases

**Files modified:** `src/components/layout/ProgressBar.tsx`
**Commit:** 79a318e
**Applied fix:** Inserted `const denom = Math.max(1, VISIBLE_SECTIONS.length - 1);`
and clamped `progress = Math.min(100, (completedCount / denom) * 100)` so a
mis-configured `HIDDEN_SECTIONS` (denominator 0) cannot produce `NaN` width and
a completed Section 11 cannot overflow the bar past 100 %.

### WR-01: SignaturePad strokes are now cream on transparent — invisible on light backgrounds

**Files modified:** `src/components/forms/SignaturePad.tsx`
**Commit:** 5021c27
**Applied fix:** Adopted option (b) from the review — embed an opaque dark
background. `startDraw` now paints `ctx.fillRect(0, 0, width, height)` with
`#131316` (--color-bg-3) on the **first** stroke before drawing, and `autoSign`
paints the same dark fill before stamping the cream text. Exported PNG
dataURLs now carry their own contrast layer, so any consumer rendering them
on a light surface (PDF, print, screenshot embed) sees a dark card with cream
strokes rather than nothing. Legacy navy strokes from pre-Phase-9
assessments are not retroactively re-stroked — left as a Phase 10 follow-up
todo per the reviewer's suggestion.

### WR-02: clients/page.tsx lastAssessment comparison mixes date-only and full-ISO strings

**Files modified:** `src/app/portal/clients/page.tsx`
**Commit:** 40393aa
**Applied fix:** Normalised both sides to YYYY-MM-DD before comparing — the
`candidate = a.assessmentDate || a.createdAt.split('T')[0]` value is now
computed first, then compared once against `existing.lastAssessment`, and only
assigned if strictly greater. (Same commit also picked up IN-08 for the
clients-list avatar initial.)

### WR-03: AuditLogs ACTION_BADGE_COLORS use light-theme palette on dark canvas

**Files modified:** `src/app/portal/admin/audit-logs/page.tsx`
**Commit:** adcbd7a
**Applied fix:** Replaced the six 50/700-tier badge colours with dark-alpha
equivalents: `bg-blue-500/10 text-blue-300 border-blue-500/20`,
`bg-gold-brand/10 text-gold-brand border-gold-brand/20`,
`bg-indigo-500/10 text-indigo-300 border-indigo-500/20`,
`bg-status-good/10 text-status-good border-status-good/20`,
`bg-purple-500/10 text-purple-300 border-purple-500/20`,
`bg-danger/10 text-danger border-danger/20`. (Same commit addresses WR-04
and removes duplicate `transition-colors` on pagination buttons.)

### WR-04: AuditLogs row hover uses undefined Tailwind class `bg-bg-2-alt`

**Files modified:** `src/app/portal/admin/audit-logs/page.tsx`
**Commit:** adcbd7a
**Applied fix:** Swapped the undefined `hover:bg-bg-2-alt/50` for the valid
`hover:bg-bg-2/50` (Tailwind v4 only generates utilities for tokens declared in
`@theme inline`, and the token never existed). Also removed the duplicated
`transition-colors` class on the two pagination buttons mentioned in the
cosmetic note.

### WR-05: TrendsTab + clients/[name] tier pills are 50-tier on dark canvas

**Files modified:** `src/app/portal/clients/[name]/TrendsTab.tsx`,
`src/app/portal/clients/[name]/page.tsx`
**Commits:** 16c625a (TrendsTab — shipped with CR-03), bcdc5b8 (page.tsx —
shipped with WR-09/IN-08)
**Applied fix:** Both `TIER_PILL` constants now use dark-alpha equivalents:
`bg-emerald-500/10 text-emerald-300`, `bg-blue-500/10 text-blue-300`,
`bg-gray-500/10 text-text-dim`, `bg-amber-500/10 text-amber-300`,
`bg-red-500/10 text-red-300`. The Phase 8 light variants in
`src/components/report/*` are left intact for the in-report card surface.

### WR-06: AdminPillarsForm imports TEXTAREA_CLASS but never uses it; textareas get input-height

**Files modified:** `src/app/portal/admin/pillars/AdminPillarsForm.tsx`
**Commit:** 09db856
**Applied fix:** Replaced `className={INPUT_CLASS}` with
`className={TEXTAREA_CLASS}` on all three `<textarea>` elements (page-intro,
short-summary, plain-meaning). Textareas now respect their `rows` attribute
and resize-vertical instead of being clamped to the 48px `h-12` input height.

### WR-07: AdminPrescriptionsForm primary CTA uses text-white on gold + light-red destructive button

**Files modified:** `src/app/portal/admin/assessments/[id]/prescriptions/AdminPrescriptionsForm.tsx`
**Commit:** 1ca5f4a
**Applied fix:** Clear-plan button `border-red-300 text-red-600 hover:bg-red-50`
→ `border-danger/40 text-danger hover:bg-danger/10`. Save-plan button
`bg-gold-brand text-white hover:bg-gold-brand/90` → `bg-gold-brand text-bg
hover:bg-champagne` (matches UI-SPEC §Copywriting CTAs). Dialog destructive
confirm `bg-red-600 text-white hover:bg-red-700` → `bg-danger text-bg
hover:opacity-90`.

### WR-08: Toast clearTimeout cleanup uses onDismiss in deps

**Files modified:** `src/components/ui/Toast.tsx`
**Commit:** efea8b1
**Applied fix:** Captured `onDismiss` in a `useRef` updated by a second
effect, and switched the timer effect to a mount-only `[]` deps array that
fires `onDismissRef.current()` on timeout. The 3-second auto-dismiss timer
now ignores parent re-renders that recreate the inline `() => setToast(null)`
callback.

### WR-09: clients/[name]/page.tsx blindly calls decodeURIComponent on params.name

**Files modified:** `src/app/portal/clients/[name]/page.tsx`
**Commit:** bcdc5b8
**Applied fix:** Wrapped `decodeURIComponent(rawName)` in `try/catch`; on
`URIError` the component falls back to the raw segment so the portal segment
no longer crashes on malformed `%`-sequences (e.g. `/portal/clients/foo%2`).

### WR-10: ValdResultCard uses bare `<img>` and four hardcoded hex colours

**Files modified:** `src/components/ui/ValdResultCard.tsx`
**Commit:** 6296200
**Applied fix:** SVG dashed strokes `#cbd5e1` → `var(--color-line-2)`; baseline
stroke `#94a3b8` → `var(--color-text-faint)`. The L/R indicator circles
(`#3b82f6` blue, `#f59e0b` orange) preserved as domain semantics per the
reviewer's note. Bare `<img>` for the ForceDecks badge swapped to
`next/image <Image>` with explicit `width=20 height=14`.

### WR-11: Section/[num] page does not validate `num`

**Files modified:** `src/app/portal/assessment/[id]/section/[num]/page.tsx`
**Commit:** d2195d5
**Applied fix:** `parseInt(..., 10)` result is now checked against
`Number.isFinite(parsedNum) && VISIBLE_SECTIONS.includes(parsedNum)`. When
invalid, an early `useEffect` calls `router.replace(...section/1)` and the
render returns the existing Loading state until the redirect lands. Prevents
`NaN` propagating into `setCurrentSection`, the Header's "Section NaN of 11"
display, and `sectionComponents[NaN]` lookup misses.

### IN-01: NavigationButtons "Back to section N" coincidentally correct

**Files modified:** `src/components/layout/NavigationButtons.tsx`
**Commit:** ab1556b
**Applied fix:** Replaced the fragile
`VISIBLE_SECTIONS.indexOf(currentSection)` (zero-based index used as a
section number, only coincidentally correct because Section 10 is the only
hidden section today) with an explicit `prevIdx = indexOf - 1` +
`VISIBLE_SECTIONS[prevIdx]` lookup, and fall back to "Back to dashboard" when
there is no previous visible section.

### IN-03: MetricChart crashes on empty data array

**Files modified:** `src/components/charts/MetricChart.tsx`
**Commit:** a145892
**Applied fix:** Added `if (data.length === 0) return null;` immediately
after the prop destructure. All current callers gate on `points.length >= 2`,
so this is a defensive guard for future callers only — no behavioural change
on existing code paths.

### IN-05: Section1.tsx age-calculation effect missing deps

**Files modified:** `src/components/sections/Section1.tsx`
**Commit:** c75bacf
**Applied fix:** Wrapped `calculateAge` in `useCallback([onChange])` and
declared the previously implicit deps (`data.clientAge`, `calculateAge`) in
the effect array. Stale closures over the `onChange` prop can no longer fire
after the parent re-creates the handler.

### IN-07: globals.css prefers-reduced-motion selector is fragile

**Files modified:** `src/app/globals.css`
**Commit:** a019e1c
**Applied fix:** Added an `.animate-pulse-gold` utility class that runs the
keyframes, and extended the `prefers-reduced-motion` selector to cover both
the new class and the existing `[style*="pulse-gold"]` attribute selector. A
future migration from inline-style to `className` keeps respecting the
reduced-motion preference.

### IN-08: clients/page.tsx + clients/[name]/page.tsx assume non-empty clientName

**Files modified:** `src/app/portal/clients/page.tsx`,
`src/app/portal/clients/[name]/page.tsx`
**Commits:** 40393aa (clients/page.tsx — shipped with WR-02), bcdc5b8
(clients/[name]/page.tsx — shipped with WR-05/WR-09)
**Applied fix:** Replaced `c.name[0].toUpperCase()` /
`clientName[0].toUpperCase()` with `(c.name || 'U')[0].toUpperCase()` /
`(clientName || 'U')[0].toUpperCase()` to match the safer pattern already
used in `portal/page.tsx AssessmentRow`. Empty strings no longer throw on
`undefined.toUpperCase()`.

## Skipped Issues

### IN-02: ExtractedValuesPanel commit() suppresses re-typing the same value

**File:** `src/components/forms/ExtractedValuesPanel.tsx:94`
**Reason:** skipped: reviewer explicitly marked as "Optional — Acceptable UX
choice but worth noting. Pre-existing pattern, not a Phase 9 regression."
Changing the empty-string semantics could alter upstream API contract for
unrelated callers; out of scope for this review-fix pass.
**Original issue:** When a user clears the input and presses Enter, the commit
silently reverts to the original value with no visual feedback. Reviewer
flagged this for documentation only.

### IN-04: portal/page.tsx ClientTrendsSection has the same setState-in-render anti-pattern? No

**File:** `src/app/portal/page.tsx:535-635`
**Reason:** skipped: informational cross-reference only. The reviewer
explicitly noted "No fix needed; cross-reference for the fixer" — the dashboard
already uses the correct `useEffect` pattern. No code change is required.
**Original issue:** Confirms `ClientTrendsSection` is clean and demonstrates
the right pattern that CR-03 violated.

### IN-06: Sidebar duplicates sidebarContent in both desktop and mobile branches

**File:** `src/components/layout/Sidebar.tsx:248-273`
**Reason:** skipped: reviewer marked as "Low priority; pre-existing pattern"
and "Optional". Mobile/desktop branches are gated by `hidden lg:flex` so only
one tree is visible at a time; consolidating them is a larger refactor that
risks regressing the responsive break behaviour. Defer to a follow-up if the
duplicate-nav-tree concern is raised by an accessibility audit.
**Original issue:** Two `sidebarContent` instances exist in the DOM at <lg and
lg+ breakpoints respectively; screen readers that ignore CSS `hidden` may see
duplicated navigation IDs/labels.

---

_Fixed: 2026-05-12_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
