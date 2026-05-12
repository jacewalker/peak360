---
phase: 09-brand-language-alignment-across-portal-dashboard-assessment-
reviewed: 2026-05-12T00:00:00Z
depth: standard
files_reviewed: 54
files_reviewed_list:
  - src/app/globals.css
  - src/app/layout.tsx
  - src/app/login/layout.tsx
  - src/app/login/page.tsx
  - src/app/portal/admin/assessments/[id]/prescriptions/AdminPrescriptionsForm.tsx
  - src/app/portal/admin/assessments/[id]/prescriptions/page.tsx
  - src/app/portal/admin/audit-logs/page.tsx
  - src/app/portal/admin/invitations/page.tsx
  - src/app/portal/admin/normative/[marker]/page.tsx
  - src/app/portal/admin/normative/page.tsx
  - src/app/portal/admin/page.tsx
  - src/app/portal/admin/pillars/AdminPillarsForm.tsx
  - src/app/portal/admin/pillars/page.tsx
  - src/app/portal/admin/users/page.tsx
  - src/app/portal/assessment/[id]/report/page.tsx
  - src/app/portal/assessment/[id]/section/[num]/page.tsx
  - src/app/portal/assessments/page.tsx
  - src/app/portal/clients/[name]/page.tsx
  - src/app/portal/clients/[name]/TrendsTab.tsx
  - src/app/portal/clients/page.tsx
  - src/app/portal/layout.tsx
  - src/app/portal/page.tsx
  - src/app/reset-password/layout.tsx
  - src/app/reset-password/page.tsx
  - src/components/admin/AdminPageHeader.tsx
  - src/components/admin/NormativeEditPanel.tsx
  - src/components/charts/MetricChart.tsx
  - src/components/forms/ExtractedValuesPanel.tsx
  - src/components/forms/FileUploadZone.tsx
  - src/components/forms/FormField.tsx
  - src/components/forms/FormRow.tsx
  - src/components/forms/RadioGroup.tsx
  - src/components/forms/SelectField.tsx
  - src/components/forms/SignaturePad.tsx
  - src/components/forms/SliderField.tsx
  - src/components/forms/TextareaField.tsx
  - src/components/layout/Header.tsx
  - src/components/layout/NavigationButtons.tsx
  - src/components/layout/ProgressBar.tsx
  - src/components/layout/Sidebar.tsx
  - src/components/sections/Section1.tsx
  - src/components/sections/Section10.tsx
  - src/components/sections/Section11.tsx
  - src/components/sections/Section3.tsx
  - src/components/sections/Section4.tsx
  - src/components/sections/Section7.tsx
  - src/components/sections/Section8.tsx
  - src/components/ui/ConfirmDeleteModal.tsx
  - src/components/ui/Dialog.tsx
  - src/components/ui/MonoEyebrow.tsx
  - src/components/ui/RolePill.tsx
  - src/components/ui/SectionHeader.tsx
  - src/components/ui/TestCategory.tsx
  - src/components/ui/Toast.tsx
  - src/components/ui/ValdResultCard.tsx
  - src/lib/fonts.ts
findings:
  critical: 4
  warning: 11
  info: 8
  total: 23
status: issues_found
---

# Phase 9: Code Review Report

**Reviewed:** 2026-05-12
**Depth:** standard
**Files Reviewed:** 54
**Status:** issues_found

## Summary

Phase 9 was an in-place restyle promoting the landing-page dark/cream/gold-brand
token palette into every authenticated surface. The shared chrome (`Sidebar`,
`Header`, `ProgressBar`, `NavigationButtons`), form primitives, auth surfaces
(`/login`, `/reset-password`), dashboard, clients pages, assessments page, and
most admin pages were converted cleanly to the new token model. The
`MonoEyebrow` primitive, `theme-dark` segment gating, font wiring, and globals
were landed per spec.

Adversarial review uncovered **four blocking defects** and a long tail of
quality / consistency issues. Two of the blockers are crash / state-update bugs
inherited or introduced during the restyle (one is a state-update-during-render
bug in the new TrendsTab AI panel — surfaced because the AI panel was added in
this phase, even though similar code may have existed before; the other is a
divide-by-zero / overflow in `ProgressBar`). The other two blockers are large
Phase-9 token regressions: an entire admin marker editor page
(`/portal/admin/normative/[marker]/page.tsx`) and the `NormativeEditPanel`
component were NOT re-tokenised — they remain on the legacy navy/white/red-50
light palette and will render badly inside the dark portal shell. The
verification document states "all surfaces passed" — that claim is
contradicted by these two files plus the `audit-logs` action-badge palette and
the `AdminPrescriptionsForm` destructive button. Phase 9 acceptance heuristics
1, 2, 5, and 14 (no legacy gold / no light surfaces) are violated on those
surfaces.

Smaller issues include a broken Tailwind class (`bg-bg-2-alt/50`), an invalid
gold-brand hover token (`bg-gold-brand-dark`), a SignaturePad correctness
regression (cream stroke on transparent canvas — invisible if signature dataURL
is ever rendered on a light background such as Phase 5 PDF or the Phase 8
report frame), and several `text-white` / hardcoded hex literals on dark
surfaces that contradict D-04 / D-14 in the context document.

## Critical Issues

### CR-01: NormativeEditPanel is still on the legacy light/navy palette

**File:** `src/components/admin/NormativeEditPanel.tsx:222`-`455` (multi-region)
**Issue:** The entire panel was missed by the Phase 9 token sweep despite being
listed in `09-PATTERNS.md` §6/§7 as in-scope. The header (line 222) uses
hard-coded inline `style={{ backgroundColor: '#0f2440' }}` (legacy navy). The
DB-override badge mixes new and legacy tokens: `bg-gold-brand/20 text-gold-brand
border border-gold/30` (line 227) — `gold/30` resolves to legacy
`--color-gold: #F5A623`, which D-14 explicitly forbids on dark canvas. Multiple
other anti-patterns: `text-white/30`, `text-white/40`, `bg-bg-3/10`,
`border-white/10` (legacy alpha tokens), `text-emerald-400`, `border-gold`,
`focus:border-gold`, `focus:ring-gold/20`, `border-red-400 ring-red-200`,
`bg-red-50 text-red-600 border-red-200`, `text-red-500 hover:text-red-700
hover:bg-red-50` (lines 236, 244-247, 260-263, 275, 291, 360-374, 395, 430,
443). The "Save Changes" button at line 454 references the **undefined**
Tailwind class `bg-gold-brand-dark` for its hover state — there is no such
token in `globals.css`, so the hover does nothing. The button label `text-white`
(line 454-455) is wrong on a dark canvas where button fills should use
`text-bg`. This is the **primary normative editor** rendered as a slide-out
panel from the marker browser — it will look broken on the dark portal shell.
**Fix:**
```tsx
// 1. Remove inline style and use bg-bg-2 + border-line:
<div className="flex-shrink-0 px-5 py-4 border-b border-line bg-bg-2">

// 2. Replace mixed gold/gold-brand badges:
<span className="font-mono text-[11px] uppercase tracking-[0.16em] px-2 py-0.5 rounded-full bg-gold-brand/20 text-gold-brand border border-gold-brand/30">

// 3. Replace text-white/X with text-text-dim / text-text-faint:
className="... text-text-dim hover:text-text hover:bg-line ..."

// 4. Replace red-XXX with danger tokens:
className="... border-danger/40 ring-danger/20 ..."  // input error
className="... bg-danger/10 text-danger border border-danger/30 ..."  // error banner
className="... text-danger hover:text-danger border border-danger/40 hover:bg-danger/10 ..."  // reset button

// 5. Define a real hover token or use champagne:
className="... bg-gold-brand text-bg hover:bg-champagne ..."

// 6. Replace text-emerald-400 with text-status-good:
<span className="... text-status-good">
```

### CR-02: /portal/admin/normative/[marker]/page.tsx not converted to Phase 9 tokens

**File:** `src/app/portal/admin/normative/[marker]/page.tsx:345-505`
**Issue:** This standalone marker editor page (the alternative route to the
split-panel editor) was completely missed by the Phase 9 sweep. Multiple
violations:
- Line 345: `text-[40px] font-bold` should be `font-medium` per UI-SPEC
  Display-40 (medium weight, not bold).
- Line 353: `bg-bg-3 text-text-dim` is OK, but `font-bold` is off-scale (UI-SPEC
  only allows 400/500 weights).
- Line 373: `border-gold text-text` — legacy `--color-gold`.
- Lines 424, 425, 436, 437: `border-red-500`, `focus:border-gold
  focus:ring-gold/25` — legacy red-500 and legacy gold ring.
- Line 447: `text-red-500` — should be `text-danger`.
- Line 469: `accent-gold` — legacy.
- Line 486: `text-red-500 hover:text-red-700 border-red-200 hover:bg-red-50` —
  a destructive button rendered in the light-mode red-50 palette on a dark
  page. Visually broken.
- Line 495: `bg-gold-brand text-white hover:bg-gold-brand/90` — `text-white`
  is wrong for fills on dark canvas (use `text-bg`); hover should be
  `bg-champagne`, not an alpha drop.
- Line 505: `bg-red-50 text-red-600` — error banner is pastel-pink on
  `#0a0a0b`; unreadable.
**Fix:** Apply the same token-swap table used for `NormativeEditPanel`:
`gold` → `gold-brand`, `red-XXX` → `danger`, `text-white` (on gold fill) →
`text-bg`, `bg-red-50` → `bg-danger/10`, `accent-gold` → `accent-gold-brand`.
Display titles use 500 weight, not bold. Consider deleting this file if it's
genuinely an alternative to the split-panel page in `normative/page.tsx`
(`NormativeBrowserPage`) — having two editors maintained in parallel is itself
a maintenance risk.

### CR-03: TrendsTab calls setState during render — invalid React pattern

**File:** `src/app/portal/clients/[name]/TrendsTab.tsx:124-128`
**Issue:**
```tsx
const hasTriggered = useState(false);
if (!hasTriggered[0] && !assessment && !loading && !error) {
  hasTriggered[1](true);
  generate();          // also async — kicks off fetch as a side effect of render
}
```
Setting state during render produces the React warning "Cannot update a
component while rendering a different component" and triggers an immediate
re-render. The `generate()` call also fires a fetch as a render side effect.
Under React 19 / Strict Mode this re-runs the render twice in development —
duplicating the AI generation request and double-billing OpenAI. In production
the call still races: the first render schedules a state update + fetch; the
second render (from the state update) checks `hasTriggered[0]` again before
React has flushed the prior update, so the gate fails inconsistently.
**Fix:**
```tsx
// Replace the ad-hoc hasTriggered state with a real effect:
useEffect(() => {
  if (!assessment && !loading && !error) {
    generate();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // run once on mount

// Remove lines 124-128 entirely.
```

### CR-04: ProgressBar divide-by-zero / overflow on edge cases

**File:** `src/components/layout/ProgressBar.tsx:14-16`
**Issue:**
```tsx
const visibleCompleted = completedSections.filter((s) => VISIBLE_SECTIONS.includes(s));
const completedCount = visibleCompleted.length;
const progress = (completedCount / (VISIBLE_SECTIONS.length - 1)) * 100; // Section 11 is a report
```
Two related defects:
1. If `VISIBLE_SECTIONS.length === 1` (mis-configured `HIDDEN_SECTIONS`),
   denominator is 0 → `progress` is `NaN`, which Tailwind `style={{ width:
   '${progress}%' }}` renders as `width: NaN%` — fill bar disappears.
2. If every visible section (including 11) is in `completedSections`,
   `completedCount` is 10 and denominator is 9 → `progress` is 111%. The
   inline width style is unbounded and overflows the track; visually noisy
   on completion.
**Fix:**
```tsx
const denom = Math.max(1, VISIBLE_SECTIONS.length - 1);
const progress = Math.min(100, (completedCount / denom) * 100);
```

## Warnings

### WR-01: SignaturePad strokes are now cream on transparent — invisible on light backgrounds

**File:** `src/components/forms/SignaturePad.tsx:85,114`
**Issue:** `ctx.strokeStyle = '#ece5d3'` and `ctx.fillStyle = '#ece5d3'`. The
signature dataURL stored in the DB now contains cream strokes on a transparent
canvas. The Phase 9 dark canvas renders them correctly inside the portal form,
but **any consumer of the same dataURL on a light surface will see nothing**:
the Phase 8 report card is white/cream, and any future export that embeds the
signature image (e.g., HTML preview, print stylesheet at lines 234-236
`@media print { .bg-white { box-shadow: none } }`, screenshot embed, browser
print of the consent section) will display blank canvases. The current PDF
pipeline (`src/lib/pdf/components/ConsentStatus.tsx`) does not render the image
— only the typed name + "Signed" label — so the PDF is unaffected today, but
the data is now lossy for any future renderer. Also note that **existing
assessments signed before Phase 9 were captured with navy (`#1a365d`) strokes**
and will display nearly invisible on the new `bg-bg-3` (#131316) canvas; users
re-opening Section 4 will see what looks like a missing signature.
**Fix:** Either (a) keep the legacy navy stroke (`#1a365d`) and live with low
contrast on dark canvas, or (b) embed the cream colour with an opaque dark
background fill on the canvas so the exported PNG has its own contrast layer:
```tsx
// On startDraw before any moveTo, paint a dark background once:
const dpr = canvasRef.current.width / rect.width;
ctx.fillStyle = '#131316'; // --color-bg-3
ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
ctx.strokeStyle = '#ece5d3';
// ...then begin the path
```
Or (preferred) render the stored dataURL on a dark surface in any future
consumer rather than embedding a fixed bg. Add a Phase 10 follow-up todo to
re-stroke legacy navy signatures to cream on first re-open.

### WR-02: clients/page.tsx lastAssessment comparison mixes date-only and full-ISO strings

**File:** `src/app/portal/clients/page.tsx:38-39`
**Issue:**
```tsx
if (a.assessmentDate > existing.lastAssessment || a.createdAt > existing.lastAssessment) {
  existing.lastAssessment = a.assessmentDate || a.createdAt.split('T')[0];
}
```
Two issues:
1. `existing.lastAssessment` is stored as `YYYY-MM-DD` (line 39, 51), but
   `a.createdAt` is a full ISO timestamp (`YYYY-MM-DDTHH:MM:SSZ`). String
   comparison `"2026-05-10T10:30:00Z" > "2026-05-09"` is true lexicographically
   because `T` > anything after `YYYY-MM-DD`. The comparison succeeds for any
   `a.createdAt` on the same date OR LATER, but also for unrelated edge cases
   (e.g., `createdAt: "2026-05-09T10:30:00Z"` > `lastAssessment: "2026-05-09"`
   is **true**, so it overwrites with `"2026-05-09"` — same value, harmless
   here but the logic is unsound).
2. If `a.assessmentDate` is `null`/`undefined` the comparison is `null >
   string` which is `false` (good), but then `existing.lastAssessment` gets
   overwritten with `a.assessmentDate || a.createdAt.split('T')[0]` — possibly
   an OLDER date than what was stored. The assignment uses the same
   "current row" date regardless of comparison result; if multiple rows share
   the same client name but only the LATEST one wins, the loop order matters
   (and `data` is whatever order the API returns).
**Fix:** Normalise both sides to `YYYY-MM-DD` before comparison and pick
`Math.max`-equivalent (lexicographically max):
```tsx
const candidate = a.assessmentDate || a.createdAt.split('T')[0];
if (candidate > existing.lastAssessment) {
  existing.lastAssessment = candidate;
}
```

### WR-03: AuditLogs ACTION_BADGE_COLORS use light-theme palette on dark canvas

**File:** `src/app/portal/admin/audit-logs/page.tsx:42-49`
**Issue:** The badge map uses `bg-blue-50 text-blue-700 border-blue-200` (and
green-50, amber-50, indigo-50, purple-50, red-50) — Tailwind 50-tier
backgrounds are nearly white and the 700-tier text is dark. On the dark portal
surface (`#0a0a0b` page, `#131316` cards) these badges produce
high-contrast cream-coloured pills that fight the visual rhythm of the rest
of the Phase 9 surfaces. Phase 9 UI-SPEC §Color reserves the rating-tier
palette for marker rows only; non-marker badges should resolve to dark-canvas
alpha equivalents.
**Fix:**
```tsx
const ACTION_BADGE_COLORS: Record<string, string> = {
  'assessment.view':  'bg-blue-500/10 text-blue-300 border-blue-500/20',
  'section.edit':     'bg-gold-brand/10 text-gold-brand border-gold-brand/20',
  'report.export':    'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
  'file.upload':      'bg-status-good/10 text-status-good border-status-good/20',
  'normative.update': 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  'user.manage':      'bg-danger/10 text-danger border-danger/20',
};
```

### WR-04: AuditLogs row hover uses undefined Tailwind class `bg-bg-2-alt`

**File:** `src/app/portal/admin/audit-logs/page.tsx:219`
**Issue:** `<tr className="hover:bg-bg-2-alt/50 transition-colors">`. There is
no `--color-bg-2-alt` token in `globals.css`. Tailwind v4 with `@theme inline`
generates utilities only for the declared tokens (`bg`, `bg-2`, `bg-3`). This
class never resolves and the hover state silently does nothing. Note the
same `<tr>` repeats `transition-colors` twice on lines 247 and 257 — minor
cosmetic dup.
**Fix:** `hover:bg-bg-2/50` (or `hover:bg-bg-3`).

### WR-05: TrendsTab + clients/[name] tier pills are 50-tier on dark canvas

**File:** `src/app/portal/clients/[name]/TrendsTab.tsx:36-42`, `src/app/portal/clients/[name]/page.tsx:30-36`
**Issue:** `TIER_PILL` is defined as `bg-emerald-50 text-emerald-700` etc. The
PATTERNS document at §9 flagged this as "conservative path: leave as-is in
09-02 step 6 if visually acceptable; flag during review" — flagging now. On
`#131316` cards these pills render as nearly-white blocks with dark text, the
opposite contrast of the surrounding text. The 50-tier palette is a Phase 8
convention for the **light report card**; reusing it on dark portal client
detail / trends surfaces breaks the visual contract.
**Fix:** Lift `TIER_PILL` to alpha equivalents for the dark surfaces:
```ts
const TIER_PILL: Record<RatingTier, string> = {
  elite:    'bg-emerald-500/10 text-emerald-300',
  great:    'bg-blue-500/10 text-blue-300',
  normal:   'bg-gray-500/10 text-text-dim',
  cautious: 'bg-amber-500/10 text-amber-300',
  poor:     'bg-red-500/10 text-red-300',
};
```
Keep the in-report Phase 8 light variants in `src/components/report/*` only.

### WR-06: AdminPillarsForm imports TEXTAREA_CLASS but never uses it; textareas get input-height

**File:** `src/app/portal/admin/pillars/AdminPillarsForm.tsx:16-17, 163, 225, 244`
**Issue:** `TEXTAREA_CLASS` is declared with proper textarea sizing
(`px-4 py-3 ... resize-vertical`) but every `<textarea>` in the file is wired
to `INPUT_CLASS` instead (which contains `h-12` for 48px-fixed-height
inputs). The textareas render with `rows={3}` or `rows={4}` on the parent
attribute but the `h-12` class overrides the row count, forcing every textarea
to single-line height. Visual regression on the page-copy and pillar-definition
editors. Also `TEXTAREA_CLASS` is dead code (unused export-equivalent).
**Fix:** Replace `className={INPUT_CLASS}` with `className={TEXTAREA_CLASS}`
on lines 163, 225, 244 (and any other textarea in this file).

### WR-07: AdminPrescriptionsForm primary CTA uses text-white on gold + light-red destructive button

**File:** `src/app/portal/admin/assessments/[id]/prescriptions/AdminPrescriptionsForm.tsx:289, 300, 341`
**Issue:**
- Line 289 (clear-plan button): `border-red-300 text-red-600 hover:bg-red-50`
  — light-theme red on dark canvas; should use `border-danger/40 text-danger
  hover:bg-danger/10`.
- Line 300 (save-plan button): `bg-gold-brand text-white hover:bg-gold-brand/90`
  — `text-white` on a gold fill produces low-contrast white-on-yellow on dark;
  spec says the gold-brand fill takes `text-bg` (ink). Hover should be
  `bg-champagne` per UI-SPEC §Copywriting CTAs, not an alpha drop on the
  same colour.
- Line 341 (dialog confirm destructive): `bg-red-600 text-white
  hover:bg-red-700` — same anti-pattern; should be `bg-danger text-bg
  hover:opacity-90`.
**Fix:** Apply the standard CTA swap table consistently across all three
buttons.

### WR-08: Toast `clearTimeout` cleanup uses onDismiss in deps, making the 3s timer reset on every parent render

**File:** `src/components/ui/Toast.tsx:25-28`
**Issue:**
```tsx
useEffect(() => {
  const t = setTimeout(onDismiss, 3000);
  return () => clearTimeout(t);
}, [onDismiss]);
```
If the parent component re-creates `onDismiss` on every render (the
`onDismiss={() => setToast(null)}` pattern used everywhere in this codebase
does so), the effect tears down and re-creates the 3-second timer on **every**
parent render. Under normal use this is benign, but if the parent re-renders
multiple times per second (a typical case during typing in a form that's
auto-saving), the toast effectively never auto-dismisses, contradicting the
inline doc comment ("3-second auto-dismiss").
**Fix:** Capture the dismiss callback in a ref OR remove it from deps:
```tsx
const onDismissRef = useRef(onDismiss);
useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);
useEffect(() => {
  const t = setTimeout(() => onDismissRef.current(), 3000);
  return () => clearTimeout(t);
}, []);
```

### WR-09: clients/[name]/page.tsx blindly calls decodeURIComponent on params.name

**File:** `src/app/portal/clients/[name]/page.tsx:40`
**Issue:** `const clientName = decodeURIComponent(params.name as string);`
If the URL contains a malformed `%` sequence (`/portal/clients/foo%2`),
`decodeURIComponent` throws `URIError: URI malformed`. The component is a
client component with no error boundary near it, so the entire portal segment
crashes for that user. Same issue would exist on the dashboard "Clients" link
if a name with `%` chars was URL-encoded incorrectly anywhere upstream.
**Fix:** Wrap in try/catch and either redirect or render a not-found state:
```tsx
const raw = params.name as string;
let clientName: string;
try {
  clientName = decodeURIComponent(raw);
} catch {
  clientName = raw; // or trigger notFound()
}
```

### WR-10: ValdResultCard uses bare `<img>` and four hardcoded hex colours

**File:** `src/components/ui/ValdResultCard.tsx:39, 41, 43, 45, 47, 132`
**Issue:**
- Lines 39-47 contain four hex literals (`#cbd5e1`, `#94a3b8`, `#3b82f6`,
  `#f59e0b`) inside an SVG asymmetry graph. Per D-04 ("no hex in component
  files") these should be tokens (e.g., `var(--color-line)`,
  `var(--color-line-2)`). The blue/orange L/R indicator hexes are domain
  semantics that could be argued (L = blue, R = amber is a chart convention),
  but the line strokes should be tokenised.
- Line 132: `<img src="/images/forcedecks.png" alt="" .../>` — bare HTML img
  in a Next.js codebase will trigger `next/image` ESLint warning and forfeits
  the auto-optimisation pipeline used elsewhere (`<Image>` in Sidebar and
  Header).
**Fix:** Token-swap the lines, and switch to `next/image`:
```tsx
<line ... stroke="var(--color-line-2)" ... />
<line ... stroke="var(--color-text-faint)" ... />
import Image from 'next/image';
<Image src="/images/forcedecks.png" alt="" width={20} height={14} className="object-contain" />
```

### WR-11: Section/[num] page does not validate `num` — accepts NaN and hidden section 10

**File:** `src/app/portal/assessment/[id]/section/[num]/page.tsx:44, 184, 212`
**Issue:**
- Line 44: `const num = parseInt(params.num as string) as SectionNumber;`
  `parseInt("abc")` is `NaN`. `parseInt("10abc")` is `10`. The cast `as
  SectionNumber` lies to TypeScript; `NaN` propagates into all downstream
  checks (`num === 11`, `VISIBLE_SECTIONS.indexOf(num)`, `sectionComponents[num]`).
- Line 184: hard-codes `num === 11` for the report. If `num === 10`
  (legitimately in the route — Section 10 was moved to Section 8 per
  `Section10.tsx`'s note), `sectionComponents[10]` is `undefined`, the guard
  at line 219 renders nothing, and the user sees an empty page wrapped in
  `ProgressBar` + `NavigationButtons` with no section content. The
  `VISIBLE_SECTIONS` array excludes 10 by design, but the route segment is
  still reachable.
- Line 44 also passes invalid `num` to `store.setCurrentSection(num)` →
  `Header` reads `currentSection` and renders `Section ${currentSection}
  of 11` with `NaN`.
**Fix:** Validate and either redirect or notFound:
```tsx
const parsedNum = parseInt(params.num as string, 10);
if (!Number.isFinite(parsedNum) || !VISIBLE_SECTIONS.includes(parsedNum)) {
  // useEffect → router.replace(`/portal/assessment/${id}/section/1`);
  return notFound(); // or redirect
}
const num = parsedNum as SectionNumber;
```

## Info

### IN-01: NavigationButtons "Back to section N" coincidentally correct because section 10 is the only hidden section

**File:** `src/components/layout/NavigationButtons.tsx:71`
**Issue:** `Back to section ${VISIBLE_SECTIONS.indexOf(currentSection)}`. This
shows the **zero-based index** as a section number, not the previous visible
section's actual number. It happens to be correct today because
`VISIBLE_SECTIONS = [1..9, 11]` — `indexOf(11) = 9` and the previous visible
section is 9; `indexOf(5) = 4` and prev visible is 4. If `HIDDEN_SECTIONS`
ever changes to hide a section other than 10, the label will lie. Fragile.
**Fix:**
```tsx
const prevIdx = VISIBLE_SECTIONS.indexOf(currentSection) - 1;
const prevSection = prevIdx >= 0 ? VISIBLE_SECTIONS[prevIdx] : null;
const prevLabel = isFirstSection
  ? 'Back to dashboard'
  : `Back to section ${prevSection}`;
```

### IN-02: ExtractedValuesPanel commit() suppresses re-typing the same value

**File:** `src/components/forms/ExtractedValuesPanel.tsx:94`
**Issue:** `if (trimmed === '' || trimmed === String(value)) { setDraft(...); return; }` — if a user clears the input and presses Enter, the commit silently
reverts to the original value with no visual feedback. Acceptable UX choice
but worth noting. Pre-existing pattern, not a Phase 9 regression.
**Fix:** Optional — emit `''` as a sentinel "user cleared" if the upstream API
treats empty as different from "no override".

### IN-03: MetricChart crashes on empty data array

**File:** `src/components/charts/MetricChart.tsx:56-68`
**Issue:** `const latest = data[data.length - 1];` → undefined when data is
empty, then `latest.tier` throws. All current callers (`TrendsTab`,
`ClientTrendsSection`) gate on `points.length >= 2`, so the crash is
unreachable today. Defensive guard recommended for future callers.
**Fix:** Early-return guard:
```tsx
if (data.length === 0) return null;
const latest = data[data.length - 1];
```

### IN-04: portal/page.tsx ClientTrendsSection has the same setState-in-render anti-pattern? No — it uses useEffect. Confirmed clean.

**File:** `src/app/portal/page.tsx:535-635`
**Issue:** Informational only — the dashboard's ClientTrendsSection correctly
uses `useEffect` to trigger the trend fetch, demonstrating the correct
pattern that CR-03 violates in `TrendsTab`. No fix needed; cross-reference for
the fixer.

### IN-05: Section1.tsx age-calculation effect missing deps; potential stale closure

**File:** `src/components/sections/Section1.tsx:21-25`
**Issue:** `useEffect(() => { if (data.clientDOB && !data.clientAge)
calculateAge(...); }, [data.clientDOB])` — eslint-disable for the missing
`data.clientAge` and `calculateAge` deps is implicit. Pre-existing pattern,
not a Phase 9 regression, but worth flagging because the function captures
`onChange` from props which may be stale across renders.
**Fix:** Lift `calculateAge` outside the component or wrap in `useCallback`
with proper deps.

### IN-06: Sidebar duplicates `sidebarContent` in both desktop and mobile branches; identical IDs and aria-labels rendered twice

**File:** `src/components/layout/Sidebar.tsx:248-273`
**Issue:** When mobile drawer is open at lg+ breakpoint (impossible by viewport
class, but the desktop `<aside>` is also `lg:flex`, which means at <lg the
desktop branch is hidden — OK), the two `sidebarContent` instances would
render in DOM. Tailwind hides desktop on mobile via `hidden lg:flex` so only
one is visible at any breakpoint, but accessibility tools (screen readers
sometimes ignore CSS hidden) may see duplicated navigation. Low priority;
pre-existing pattern.
**Fix:** Optional — render only one navigation tree, gating visibility via
classes; or use a single `<aside>` with both mobile and desktop class
variants.

### IN-07: globals.css prefers-reduced-motion selector is fragile

**File:** `src/app/globals.css:84-88`
**Issue:**
```css
@media (prefers-reduced-motion: reduce) {
  [style*="pulse-gold"] {
    animation: none !important;
  }
}
```
The selector relies on the literal substring `"pulse-gold"` appearing in the
element's inline `style` attribute. It works today for `NavigationButtons`
(line 31: `style={{ animation: 'pulse-gold 2s ease-out infinite' }}`) but any
future migration to a CSS class (`className="animate-pulse-gold"`) or a
shorthand (`style={{ animationName: 'pulse-gold' }}`) silently breaks the
reduced-motion behaviour.
**Fix:** Hook the keyframes to a named class and gate that class:
```css
.animate-pulse-gold { animation: pulse-gold 2s ease-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .animate-pulse-gold { animation: none; }
}
```

### IN-08: clients/page.tsx + portal/page.tsx assume non-empty clientName for first-letter avatar

**File:** `src/app/portal/clients/page.tsx:237`, `src/app/portal/clients/[name]/page.tsx:143`
**Issue:** `c.name[0].toUpperCase()` — if `c.name` is somehow `''` (URL
decodes to empty, or DB returns blank), `''[0]` is `undefined` and
`.toUpperCase()` throws. The `portal/page.tsx` `AssessmentRow` at line 481
uses the safer `(a.clientName || 'U')[0]`. Two of the three callsites should
match the third.
**Fix:** `(c.name || 'U')[0].toUpperCase()` at both sites.

---

_Reviewed: 2026-05-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
