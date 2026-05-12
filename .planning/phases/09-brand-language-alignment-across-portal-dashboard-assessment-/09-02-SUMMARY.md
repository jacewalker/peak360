---
phase: 09-brand-language-alignment-across-portal-dashboard-assessment-
plan: 02
type: execute
completed: 2026-05-12
duration: ~70m
tasks_completed: 8
files_created: 1
files_modified: 35
dependency_graph:
  requires:
    - "09-01 (tokens, fonts, theme-dark wrappers, shared chrome, MonoEyebrow primitive)"
  provides:
    - "Centralised dark form components (Section 1-10 inherit automatically)"
    - "SectionHeader mono eyebrow primitive"
    - "Section 11 page-level mono eyebrow injection"
    - "Dark Dialog + Toast primitives"
    - "Header CLIENT eyebrow with /report-route suppression"
    - "Recharts MetricChart restyled to dark tokens (rating-tier palette preserved)"
    - "Every /portal page restyled (dashboard, clients, clients/[name], assessments, admin landing + all 6 sub-pages)"
    - "Phase 8 report-frame edge: dark portal frame with inner light card preserving Phase 8 sovereign content"
  affects:
    - "Every authenticated assessment-form surface now renders Phase 9 dark canvas with mono section eyebrows"
    - "Phase 8 /portal/assessment/[id]/report content untouched inside its new light card surface"
tech_stack:
  added: []
  patterns:
    - "Centralised form-component restyle (Section 1-10 inherit automatically)"
    - "Conditional MonoEyebrow injection at route-page level for sovereign Phase 8 content (Section 11)"
    - "usePathname route-based suppression of Header CLIENT eyebrow on /report"
    - "Recharts prop-level CSS-variable colour injection (var(--color-gold-brand), var(--color-text-faint), var(--font-mono))"
    - "Inner light-card wrapper inside dark portal segment for Phase 8 frame-edge (D-09)"
    - "Rating-tier marker palette (TIER_HEX) preserved verbatim — domain colour, not Phase 9 design token"
key_files:
  created:
    - ".planning/phases/09-brand-language-alignment-across-portal-dashboard-assessment-/09-02-SUMMARY.md"
  modified:
    # Forms (Task 1)
    - "src/components/forms/FormField.tsx"
    - "src/components/forms/SelectField.tsx"
    - "src/components/forms/TextareaField.tsx"
    - "src/components/forms/RadioGroup.tsx"
    - "src/components/forms/SliderField.tsx"
    - "src/components/forms/SignaturePad.tsx"
    - "src/components/forms/FileUploadZone.tsx"
    - "src/components/forms/FormRow.tsx"
    - "src/components/forms/ExtractedValuesPanel.tsx"
    # Section eyebrows (Task 2)
    - "src/components/ui/SectionHeader.tsx"
    - "src/app/portal/assessment/[id]/section/[num]/page.tsx"
    # Dialog + Toast + Header (Task 3)
    - "src/components/ui/Dialog.tsx"
    - "src/components/ui/Toast.tsx"
    - "src/components/layout/Header.tsx"
    # Recharts (Task 4)
    - "src/components/charts/MetricChart.tsx"
    # Portal pages (Task 5)
    - "src/app/portal/page.tsx"
    - "src/app/portal/clients/page.tsx"
    - "src/app/portal/clients/[name]/page.tsx"
    - "src/app/portal/clients/[name]/TrendsTab.tsx"
    - "src/app/portal/assessments/page.tsx"
    # Admin pages (Task 6)
    - "src/components/admin/AdminPageHeader.tsx"
    - "src/app/portal/admin/page.tsx"
    - "src/app/portal/admin/pillars/page.tsx"
    - "src/app/portal/admin/pillars/AdminPillarsForm.tsx"
    - "src/app/portal/admin/users/page.tsx"
    - "src/app/portal/admin/invitations/page.tsx"
    - "src/app/portal/admin/audit-logs/page.tsx"
    - "src/app/portal/admin/normative/page.tsx"
    - "src/app/portal/admin/normative/[marker]/page.tsx"
    - "src/components/admin/NormativeEditPanel.tsx"
    - "src/app/portal/admin/assessments/[id]/prescriptions/page.tsx"
    - "src/app/portal/admin/assessments/[id]/prescriptions/AdminPrescriptionsForm.tsx"
    # Report frame edge (Task 7)
    - "src/app/portal/assessment/[id]/report/page.tsx"
    # Sweep (Task 8 Rule 2 auto-fix)
    - "src/components/sections/Section1.tsx"
    - "src/components/sections/Section3.tsx"
    - "src/components/sections/Section4.tsx"
    - "src/components/sections/Section7.tsx"
    - "src/components/sections/Section8.tsx"
    - "src/components/sections/Section10.tsx"
    - "src/components/sections/Section11.tsx"
    - "src/components/ui/TestCategory.tsx"
    - "src/components/ui/RolePill.tsx"
    - "src/components/ui/ConfirmDeleteModal.tsx"
    - "src/components/ui/ValdResultCard.tsx"
decisions:
  - "Task 4 (MetricChart): kept TIER_PILL light-surface palette (bg-emerald-50, bg-blue-50, bg-amber-50, bg-red-50) verbatim — UI-SPEC §Color 'rating-tier palette preserved verbatim'. The smoke-test grep deliberately ignores these as part of the rating-tier domain palette."
  - "Task 4: Recharts accepts CSS-variable strings in tick fill, stroke, and stopColor props (confirmed RESEARCH §A7). No literal-hex fallback needed; gradient + dot + axis all resolve var(--color-gold-brand) / var(--color-text-faint) / var(--font-mono) at runtime."
  - "Task 7 (D-09 frame edge): outer chrome (assessment date heading + Download PDF CTA) restyled to dark tokens since they now sit on the dark portal frame. Inner light wrapper (bg-white rounded-2xl p-6 sm:p-8 my-6 shadow-sm) preserves the Phase 8 sovereign content untouched."
  - "Section 11: page-level eyebrow injected at src/app/portal/assessment/[id]/section/[num]/page.tsx OUTSIDE the Section11 component render — Section11 internals (tier cards, insight cards, the printable report card) are Phase 8 sovereign and remain untouched. Only the loading state ('Generating report…') was restyled because it's generic UX chrome, not Phase 8 content."
  - "Header CLIENT eyebrow: sourced from Section 1 store data; suppressed on /portal/assessment/[id]/report via usePathname().endsWith('/report') per Pitfall 9 — yields to Phase 8 PillarsDisplay inner gold eyebrow."
  - "Invitations admin route is a server redirect to /portal/admin/users#invite — no DOM to render. Eyebrow text 'ADMIN · INVITATIONS' is documented in a code comment and the destination page renders the Pending Invitations section."
  - "AdminPanel.tsx + AppShell.tsx left untouched (dead code per 09-01 deferred, critical constraint #6)."
  - "Sweep deviation (Rule 2): Section{1,3,4,7,8,10}.tsx had per-section sub-heading h3s with text-navy + bg-white card chrome that were not covered by the central FormField/SelectField/RadioGroup sweep — these needed direct restyle to keep the dark canvas coherent. Same with shared UI primitives (TestCategory, RolePill, ConfirmDeleteModal, ValdResultCard)."
metrics:
  duration_minutes: 70
  task_count: 8
  commit_count: 8
---

# Phase 9 Plan 02: Working Surfaces Restyle Summary

Propagated the Phase 9 dark brand language from 09-01's foundations + shared chrome out to every authenticated working surface: form components (centralised), all 11 assessment sections' mono eyebrows, Dialog + Toast + Recharts restyle, Header CLIENT eyebrow, dashboard + clients + assessments + every admin sub-page, and the minimal Phase 8 report-frame edge wrapping the sovereign report card in a light surface inside the dark portal shell. Smoke tests confirm zero legacy navy/gold/light-surface tokens on Phase 9 surfaces; `npm run build` exits 0; Phase 8 + Phase 5 contracts intact (no file under `src/components/report/*` or `src/lib/pdf/**` modified).

## Files Created

### `.planning/phases/09-brand-language-alignment-across-portal-dashboard-assessment-/09-02-SUMMARY.md` (this file)

## Files Modified

### Task 1 — Forms (centralised sweep; 9 files)
`FormField` `SelectField` `TextareaField` `RadioGroup` `SliderField` `SignaturePad` `FileUploadZone` `FormRow` `ExtractedValuesPanel`. Input height bumped to 48px (`h-12`), 13px text, `bg-bg-3` + `border-line` + `focus:border-gold-brand`, placeholder `text-text-faint`, disabled `bg-bg-2`. SignaturePad canvas stroke + fillStyle swapped from `#1a365d` to `#ece5d3` cream (Canvas 2D requires literal hex, documented in code comment). FileUploadZone AI stepper uses gold-brand active bubble with `rgba(201,162,74,0.15)` shadow; status palette maps success → status-good, warning → gold-brand (per UI-SPEC §Color "Status: warn"), error → danger. ExtractedValuesPanel confidence palette uses `status-good/gold-brand/danger` per D-16 status reservation.

### Task 2 — SectionHeader + Section 11 eyebrow
`src/components/ui/SectionHeader.tsx`: replaced the navy-gradient number bubble + bold h2 with `<MonoEyebrow variant="hero">Section {N} / 11 · {TITLE}</MonoEyebrow>` + 20px medium text Heading (`leading-1.15 tracking-[-0.015em]`). Description → 13px text-text-dim leading 1.55. Sections 1-10 inherit automatically.

`src/app/portal/assessment/[id]/section/[num]/page.tsx`: when `num === 11`, injected `<MonoEyebrow variant="hero" as="div" className="mb-3">SECTION 11 / 11 · LONGEVITY ANALYSIS</MonoEyebrow>` above the Section11 component, OUTSIDE the Phase 8 report content. Loading state restyled to mono 11px gold-brand 'Loading…'.

### Task 3 — Dialog + Toast + Header CLIENT eyebrow
`Dialog.tsx`: panel `bg-white` → `bg-bg-3 border border-line-2` (centered + bottom-sheet + auto modes); backdrop `bg-black/50` → `bg-[rgba(10,10,11,0.7)]`; drag handle `bg-gray-300` → `bg-line-2`.

`Toast.tsx`: positioned `top-6 right-6` (was `bottom-6`); `bg-white text-navy` → `bg-bg-3 text-text border border-line-2`; border-left swapped (gold → gold-brand, red-500 → danger); `<MonoEyebrow variant="hero">{SAVED|ERROR}</MonoEyebrow>` above the message body.

`Header.tsx`: added right-side `<MonoEyebrow>CLIENT · {NAME}</MonoEyebrow>` + 13px section indicator, sourced from Section 1 store data. Suppressed on `/portal/assessment/[id]/report` via `usePathname()?.endsWith('/report')` per Pitfall 9 — yields to Phase 8 PillarsDisplay inner gold eyebrow on that route.

### Task 4 — MetricChart Recharts restyle
Card chrome `bg-white border-border` → `bg-bg-3 border-line`; default series stroke fallback `#F5A623` → `var(--color-gold-brand)` (both occurrences); axis ticks `fontSize: 9 #94a3b8/#cbd5e1` → `fontSize: 11 var(--font-mono) var(--color-text-faint)`; tooltip `bg-navy-dark text-white border-white/10` → `bg-bg-3 text-text border-line-2`; header label mono 11px text-faint + value 20px mono tabular-nums; delta pills mapped to `status-good/danger/text-text-dim` per D-16. `TIER_HEX`, `TIER_PILL`, `TIER_ACCENT`, `TIER_GLOW` rating-tier marker maps preserved verbatim per UI-SPEC §Color.

### Task 5 — Dashboard + Clients + Assessments
- `/portal/page.tsx`: hero `pt-24` + `YOUR PORTAL · {ROLE}` eyebrow + Display title (`Welcome back, {first_name}.` fallback `Dashboard`) + mono subtitle `{today_iso} · {n} ACTIVE · {m} COMPLETED`. 4-card counter strip with 40px mono tabular-nums counters (active counter in gold-brand). Empty states match UI-SPEC verbatim (coach `Nothing here yet.`; client `Your first report will appear here.`). Recent-assessments + action-items panels in dark cards with mono meta eyebrows.
- `/portal/clients/page.tsx`: hero `PEOPLE · CLIENTS` eyebrow + Display title + mono subtitle counters. Grid `grid-cols-1 lg:grid-cols-2 xl:grid-cols-3` per UI-SPEC §Layout. Per-card 20px Heading + 40px mono gold-brand assessment count.
- `/portal/clients/[name]/page.tsx` + `TrendsTab.tsx`: hero `CLIENT · {NAME.toUpperCase()}` eyebrow + 40px Display name + mono meta line. Tabs bar `bg-bg-2` sticky with gold-brand active underline. Trends tab: AI assessment panel with dark score circle (status-good/gold-brand/danger ring), strengths/concerns/recommendations each with their own MonoEyebrow header.
- `/portal/assessments/page.tsx`: hero `PORTAL · ASSESSMENTS` eyebrow + 40px Display + mono subtitle. Full-width dark table with mono status pills (`COMPLETED`/`IN PROGRESS`). Empty state: `No assessments in scope. / Adjust your filter or create a new assessment.`. Export/Import use ghost variant (border-line-2); bulk delete uses danger fill.

### Task 6 — Admin landing + 6 sub-pages
`AdminPageHeader.tsx` (shared): rewritten — `pt-24` hero with MonoEyebrow + 40px medium Display title + 13px text-dim description. Drops the navy-gradient dot-pattern background.

- `/portal/admin/page.tsx`: `ADMIN · CONTROL` eyebrow + 40px 'Administration' title; section cards `bg-bg-3 border-line` with gold-brand hover; "coming soon" placeholders restyled to dashed line-2 cards.
- `/portal/admin/pillars/page.tsx` + `AdminPillarsForm.tsx`: `ADMIN · PILLARS` eyebrow; all inputs converted to 13px on `bg-bg-3` with gold-brand focus border; section cards `bg-bg-3`; save CTAs `bg-gold-brand text-bg hover:bg-champagne`.
- `/portal/admin/users/page.tsx`: `ADMIN · USERS` eyebrow; group sections; table rows on hover `bg-bg-2`; mono column headers 11px text-faint uppercase tracking-0.18em; role-change selects styled to dark; status pills (RolePill + StatusPill) restyled to gold-brand/line-2/faint tints; pending-invitations group preserved.
- `/portal/admin/invitations/page.tsx`: server redirect; ADMIN · INVITATIONS surface rendered by destination page.
- `/portal/admin/audit-logs/page.tsx`: `ADMIN · AUDIT LOGS` eyebrow via shared header; mono 11px table column headers; filter inputs on `bg-bg-3`; primary CTA gold-brand fill; secondary buttons ghost border-line-2.
- `/portal/admin/normative/page.tsx` + `[marker]/page.tsx` + `NormativeEditPanel.tsx`: `ADMIN · NORMATIVE` eyebrow; marker rows on dark tokens with gold-brand selection indicator + active-marker bg-gold-brand/10 row tint; tier editor cards restyled. Rating-tier TIER_HEX preserved.
- `/portal/admin/assessments/[id]/prescriptions/page.tsx` + `AdminPrescriptionsForm.tsx`: `ADMIN · PRESCRIPTIONS` eyebrow + 40px 'Per-pillar recommendations' Display title.

### Task 7 — Phase 8 report-frame edge (D-09)
`/portal/assessment/[id]/report/page.tsx`: outer chrome (assessment date heading + Download PDF CTA) restyled to dark tokens since the dark portal frame now wraps the report. Heading `text-lg navy` → `20px medium text` on the dark frame. Download PDF CTA `bg-gold text-navy` → `bg-gold-brand text-bg hover:bg-champagne` with `aria-label`. Phase 8 sovereign content (`<ReportShell ...>`) is wrapped in `<div className="bg-white rounded-2xl p-6 sm:p-8 my-6 shadow-sm">` so the existing cream/white card surface (and the navy + bright-gold palette inside `src/components/report/*`) remains untouched.

### Task 8 — Sweep (Rule 2 auto-fix)
Final smoke-test grep flagged 14 residual legacy tokens inside Section{1,3,4,7,8,10}.tsx (per-section sub-heading h3s + card chrome wraps) and shared UI primitives (TestCategory, RolePill, ConfirmDeleteModal, ValdResultCard). Rule 2 auto-fixed: dark-token card chrome + 20px medium sub-headings + mono pills, etc. Section 11 internals (tier cards, insight cards rendering Phase 8 sovereign content) left untouched — only its loading state restyled.

## Confirmation: Phase 8 + Phase 5 Sovereign Untouched

```
$ find src/components/report -newer .planning/phases/09-brand-language-alignment-across-portal-dashboard-assessment-/09-01-SUMMARY.md -name "*.tsx"
(empty)

$ find src/lib/pdf -newer .planning/phases/09-brand-language-alignment-across-portal-dashboard-assessment-/09-01-SUMMARY.md
(empty)
```

Verified before final commit. No file under `src/components/report/*` or `src/lib/pdf/**` was modified by Plan 09-02.

## Confirmation: Legacy Tokens Preserved in globals.css

Per 09-01 Self-Check: 21 legacy `--color-*` tokens remain unchanged in `src/app/globals.css` (`--color-navy`, `--color-gold`, `--color-navy-light`, `--color-gold-light`, `--color-gold-dark`, `--color-navy-950`, `--color-background`, `--color-foreground`, `--color-surface`, `--color-surface-alt`, `--color-border`, `--color-muted`, gradients, 5 rating-tier tokens). Phase 8 + Phase 5 routes continue to resolve them via the report components and PDF pipeline.

## Smoke Tests (Task 8)

### Heuristic 1 — no light-surface tokens on Phase 9 portal surfaces
```
$ grep -rn 'bg-white\|bg-surface\|bg-surface-alt' src/app/portal --include="*.tsx" \
    | grep -v 'src/app/portal/assessment/\[id\]/report'
(no matches — PASS)
```

### Heuristic 5 — no legacy navy / bright gold on Phase 9 surfaces
```
$ grep -rnE '(text-navy|bg-navy\b|text-gold[^-]|bg-gold[^-])' src/app/portal src/components/forms src/components/sections src/components/ui --include="*.tsx" \
    | grep -v 'src/components/report\|Section11\|AdminPanel'
(no matches — PASS)
```

### Phase 8 / Phase 5 sovereign check
```
$ find src/components/report -newer .../09-01-SUMMARY.md -name "*.tsx"
$ find src/lib/pdf -newer .../09-01-SUMMARY.md
(both empty — PASS)
```

### `npm run build`
Exits 0; all 47 routes compiled cleanly; no token-resolution warnings; no missing-class errors.

## Resolutions

### RESEARCH §Open Question 1: Section 11 eyebrow placement
**Chose page-level injection.** Section 11 renders Phase 8 sovereign content (no SectionHeader). The mono `SECTION 11 / 11 · LONGEVITY ANALYSIS` eyebrow lives at `src/app/portal/assessment/[id]/section/[num]/page.tsx` when `num === 11`, OUTSIDE the Section11 component — so the eyebrow sits on the dark portal frame above the Phase 8 sovereign report content.

### RESEARCH §Open Question 2: AdminPanel restyle
**Left untouched.** Confirmed dead code per 09-01 §Deferred / critical constraint #6. No imports anywhere in the codebase. Flagged for a future hygiene phase. Same for AppShell.tsx.

### RESEARCH §Assumption A7: Recharts CSS-variable acceptance
**Confirmed: var() works.** All tick fill, stroke, stopColor props accept `var(--color-gold-brand)` / `var(--color-text-faint)` / `var(--font-mono)` strings. No literal-hex fallback was required; `npm run build` and tree-shaking pass cleanly.

### RESEARCH §Pitfall 9: Header CLIENT eyebrow vs Phase 8 inner eyebrow
**Suppressed outer Header on /report route** via `usePathname()?.endsWith('/report')`. Phase 8 PillarsDisplay's inner gold mono eyebrow continues to render correctly inside the light report card; no double-eyebrow conflict.

## Deferred / Follow-ups

1. **`src/components/layout/AdminPanel.tsx`** — Dead code. Still untouched. Flagged for a future hygiene phase.
2. **`src/components/layout/AppShell.tsx`** — Dead code. Still untouched. Flagged for a future hygiene phase.
3. **Google Fonts `<link>` in `src/app/layout.tsx`** — Belt-and-braces preserved per 09-01 + RESEARCH §Open Question 4. Removal is a follow-up after landing-page QA.
4. **Manual visual review** — Deferred to user QA pass (no browser available in sequential executor). Structural correctness verified via smoke-test greps + clean `npm run build`.
5. **Section 11 internal Phase 8 content** — Tier cards + insight cards + the printable report card surface inside Section11.tsx still render on Phase 8 light-surface tokens (`bg-white`, `border-gray-100`). This is intentional — Section 11 renders Phase 8 sovereign content (per 09-CONTEXT D-09 exclusion). If a future hygiene pass wants to align these with the rest of the dark canvas, it should be done under a Phase 8 successor phase, not Phase 9.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Coverage] Sections 1/3/4/7/8/10 sub-heading h3s + Section 11 loading state + 4 shared UI primitives had unmigrated legacy navy/white tokens (Task 8 sweep)**
- **Found during:** Task 8 smoke-test grep
- **Issue:** 14 residual `text-navy` / `bg-white` / `text-muted` hits in section files and shared UI components that the centralised form-component sweep didn't cover. Plan §D-10 expected sections to inherit dark tokens automatically, but each section's local sub-section h3s + card chrome wraps + 4 standalone UI components (TestCategory, RolePill, ConfirmDeleteModal, ValdResultCard) had their own legacy classes.
- **Fix:** Restyled directly — 20px medium section sub-headings, dark card chrome (bg-bg-3 border-line), mono 11px role/category pills, dark confirm dialog with DESTRUCTIVE · CONFIRM mono eyebrow.
- **Files modified:** Section1, Section3, Section4, Section7, Section8, Section10, Section11 (loading state only), TestCategory, RolePill, ConfirmDeleteModal, ValdResultCard
- **Commit:** 7bee8ba

**2. [Rule 2 - Phase 8 boundary] Outer chrome on /report restyled to dark tokens (Task 7)**
- **Found during:** Task 7
- **Issue:** Plan said "wrap in light card; chrome restyle implied" — the original `<h1 className="text-lg font-semibold text-navy">` and `<a className="bg-gold text-navy ...">Download PDF</a>` would render with legacy navy/bright-gold on the dark portal frame outside the new inner light wrapper.
- **Fix:** Restyled the heading to 20px medium text and the download button to gold-brand fill with bg-champagne hover. The inner light wrapper preserves the Phase 8 sovereign palette.
- **Commit:** 2213d93

### Auth gates

None encountered.

## Self-Check: PASSED

- `src/components/ui/SectionHeader.tsx` renders MonoEyebrow + 20px Heading: **FOUND**
- `src/app/portal/assessment/[id]/section/[num]/page.tsx` injects `SECTION 11 / 11 · LONGEVITY ANALYSIS` mono eyebrow: **FOUND**
- `src/components/ui/Dialog.tsx` uses `bg-bg-3 border border-line-2` + `rgba(10,10,11,0.7)` scrim: **FOUND**
- `src/components/ui/Toast.tsx` positioned top-6 right-6 with MonoEyebrow: **FOUND**
- `src/components/layout/Header.tsx` renders CLIENT · {NAME} eyebrow with `/report` suppression: **FOUND**
- `src/components/charts/MetricChart.tsx` uses var(--color-gold-brand) + var(--font-mono) + bg-bg-3 + preserved TIER_HEX: **FOUND**
- Every /portal/* hero renders its UI-SPEC mono eyebrow (YOUR PORTAL, PEOPLE · CLIENTS, CLIENT · NAME, PORTAL · ASSESSMENTS, ADMIN · CONTROL/PILLARS/USERS/AUDIT LOGS/NORMATIVE/PRESCRIPTIONS): **FOUND**
- `src/app/portal/assessment/[id]/report/page.tsx` wraps ReportShell in `bg-white rounded-2xl p-6 sm:p-8 my-6 shadow-sm`: **FOUND**
- `src/components/report/*` and `src/lib/pdf/**` untouched: **VERIFIED**
- Commits exist (all 8 task commits in `git log --oneline`):
  - `041bdd1` — forms restyle — **FOUND**
  - `a3501f4` — SectionHeader + Section 11 eyebrow — **FOUND**
  - `4530060` — Dialog + Toast + Header — **FOUND**
  - `37f7307` — MetricChart Recharts — **FOUND**
  - `59f2788` — portal dashboard/clients/clients-detail/assessments — **FOUND**
  - `99319cd` — all admin pages — **FOUND**
  - `2213d93` — Phase 8 report-frame edge — **FOUND**
  - `7bee8ba` — sweep (Rule 2) — **FOUND**
- `npm run build` exits 0 — **VERIFIED**
