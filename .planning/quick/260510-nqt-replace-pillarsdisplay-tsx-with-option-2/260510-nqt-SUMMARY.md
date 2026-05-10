---
task: 260510-nqt
title: Replace pillar visuals with Option 2 across portal report and PDF export
tags: [report, pillars, pdf, portal, ui, drawer]
status: complete
completed: 2026-05-10
---

# Quick Task 260510-nqt — Pillar Redesign (Option 2) Summary

**One-liner:** Replaced the pillar visual on every surface with the Option 2 (Whoop/Oura) ring-gauge + worst-tier-first contributor chips design from `mockups/pillar-options.html`, and converted the in-app pillar drill-downs from centered dialogs to right-slide side drawers.

## Surfaces touched

| Surface | File | Change |
|---|---|---|
| Section 11 form preview | `src/components/report/PillarsDisplay.tsx` | Rewritten as Option 2 (commit `2077fd4`) — pre-existing |
| Section 11 form preview drawer | `src/components/report/PillarsDisplayModal.tsx` | Right-slide drawer (commit `b856f13`) — pre-existing |
| Portal report grid | `src/components/report/PillarsGrid.tsx` | Threads `markers` prop into each card |
| Portal report card | `src/components/report/PillarCard.tsx` | Option 2 visual rewrite |
| Portal report drawer | `src/components/report/PillarModal.tsx` | Side-drawer chrome with all 7 sections preserved |
| PDF export | `src/lib/pdf/components/PillarsPage.tsx` | Option 2 visual rewrite using @react-pdf/renderer Svg |

## Sequence

The original execution covered only the Section 11 form preview surfaces (`PillarsDisplay` + `PillarsDisplayModal`). The user clarified afterwards that the portal report (`/portal/assessment/[id]/report`) and the PDF export must also match Option 2. This corrective pass propagated the same visual + behaviour to the remaining three surfaces.

## Commits

### Original work (Section 11 form preview)

| Commit | Description |
|---|---|
| `0d7f50d` | docs: pre-dispatch plan for pillar redesign Option 2 + side drawer |
| `2077fd4` | feat: rewrite PillarsDisplay as Option 2 ring-gauge cards |
| `b856f13` | feat: convert PillarsDisplayModal to right-slide side drawer |

### Corrective work (portal report + PDF export)

| Commit | Description |
|---|---|
| `4b798c6` | feat: pass pillar markers into PillarCard for Option 2 chips |
| `701e678` | feat: rewrite PillarCard as Option 2 ring + chips visual |
| `61eb6be` | feat: convert PillarModal to right-slide side drawer |
| `eb469be` | feat: rewrite PDF PillarsPage as Option 2 ring + chips visual |

## Design alignment with `mockups/pillar-options.html` Option 2

Each pillar card across all three surfaces (Section 11 form preview, portal report, PDF) now renders the same composition:

1. **Mono eyebrow** — `P · NN` keyed to `pillar.sortOrder`, mono font, uppercase, slate-500
2. **Ring gauge** — score-driven arc using the traffic-light palette (`TRAFFIC_LIGHT_HEX`)
   - Web: CSS `conic-gradient(${accent} ${pct}%, #e2e8f0 0)` on a `size-28` outer disc with a `size-[88px]` white inner disc
   - PDF: `<Svg><Circle/></Svg>` with `strokeDasharray=${arcLen} ${circumference}` rotated -90° so the arc starts at 12-o'clock; centre numeric drawn as a positioned `<Text>` overlay because SVG `<Text>` is unreliable in `@react-pdf/renderer`
3. **Pillar name** — small bold navy
4. **Status label** — `STRONG` / `NEEDS FOCUS` / `PRIORITY` / `AWAITING DATA`, coloured by traffic-light state (emerald-700 / amber-700 / red-700 / slate-500)
5. **Worst-tier-first top-3 contributor list** — small tier-coloured dot + marker label + mono tier name; uses the 5-tier marker palette (`TIER_COLORS_PDF` in PDF, Tailwind tier colours in web). Pending pillars render a single "Awaiting data" row.

The removed elements vs the previous design: large `/100` numeral, status pill, short summary paragraph, chevron arrow on cards. The contributor chips replace those at-a-glance affordances.

## Drawer behaviour (PillarModal + PillarsDisplayModal)

Both portal-side drawers now share the same chrome:

- `createPortal(drawer, document.body)` with SSR guard
- `bg-black/40 backdrop-blur-sm` backdrop closes on click
- Right-anchored panel: `fixed top-0 right-0 h-full w-full md:w-[520px] bg-white shadow-2xl`
- Body scroll lock via `useEffect` saving the previous overflow value
- ESC closes; Tab + Shift+Tab focus trap cycling among visible tabbables
- Initial focus on the `[data-autofocus]` close button; focus restored on close
- `role="dialog"` + `aria-modal="true"` + `aria-labelledby` on the heading

`PillarModal` keeps all seven content sections (Header, What this pillar means, Your results, What you are doing well, What needs attention, Score breakdown including supporting markers, Recommended plan with prescription bullets and `relativeTime` footer) — only the wrapping chrome changed from `<Dialog>` to the side drawer.

`src/components/ui/Dialog.tsx` is intentionally untouched (still consumed by `ConfirmDeleteModal.tsx`).

## D-11 anti-pattern (palette discipline)

Maintained on every surface:

- Pillar layer (ring gauge, status pill, status label colour) — uses ONLY the traffic-light palette (`TRAFFIC_LIGHT_HEX`, `TRAFFIC_LIGHT_TEXT`)
- Marker layer (contributor chip dots, tier pills inside the drawer, tier rows) — uses ONLY the 5-tier marker palette (`TIER_COLORS_PDF` in PDF, Tailwind `bg-emerald-500` / `bg-blue-500` / `bg-slate-400` / `bg-amber-500` / `bg-red-500` in web)

## Edge cases / defensive behaviour

- **Pending pillars** (no rated markers): card border switches to `border-dashed`, ring stays slate, score shown as `—`, single contributor row shows "Awaiting data"
- **PDF generation never throws:** `computeAllPillarScores` is wrapped in `try/catch`; any exception synthesises an all-pending result so cards render `—` rather than crashing the PDF
- **Top-3 contributor selection:** primary markers only (supporting markers excluded), worst-tier-first ranking (`poor=0 → elite=4`, missing tier → `99`); same logic in the React component, the PDF, and the Section 11 form preview
- **Long pillar labels** truncate with `truncate` on the chip rows (web) and rely on font sizing in the PDF
- **`sortOrder` source:** `PillarsDisplay` numbers from the pillar's index (1..5) in `pillars` array; portal `PillarCard` and PDF use `pillar.sortOrder` from the DB. In current seed data both produce the same `P · 01..05` ordering.

## Deviations from Plan

- **[Rule 3 — blocking]** The worktree was branched at `be1ed48` before any of the original 260510-nqt commits landed on main. Files referenced in the plan (`PillarCard`, `PillarModal`, `PillarsGrid`, `PillarsDisplay`, `PillarsDisplayModal`) did not exist in the working tree. Fast-forward merged `main` (no conflicts; HEAD was strictly behind main) so the corrective work could proceed against the up-to-date sources. No protected ref was touched; HEAD remained on `worktree-agent-abda5ed0e4646a75c` throughout.
- **[Minor]** `PillarsGrid` responsive breakpoint widened from `md:grid-cols-3` only to `sm:grid-cols-2 md:grid-cols-3` so the new taller card composition stays readable on tablets. Plan did not specify but is consistent with the mockup using `md:grid-cols-5` (5-up).
- **[Minor]** PDF card removed the prescription "Recommended next steps" summary block per the plan's "exactly like Option 2" directive. The drawer Section 7 still surfaces the prescription in the portal. Peak360Report.tsx was not modified — the `prescriptions` prop remains in the page's props surface (marked unused with `_prescriptions` rename) so the call-site stays unchanged.

## Verification

- `npx tsc --noEmit` — no new type errors in any of the four touched files (pre-existing errors in `__tests__/*` are unrelated and out of scope per the plan's scope-boundary rule)
- `npx eslint --quiet` on the four touched files — clean
- `git diff main -- src/components/report/PillarsDisplay.tsx src/components/report/PillarsDisplayModal.tsx` — empty (Section 11 form preview files untouched, as required)
- `git status --short` — clean working tree before commit; only the 4 expected files modified

## Self-Check: PASSED

- Files modified (4): `src/components/report/PillarsGrid.tsx`, `src/components/report/PillarCard.tsx`, `src/components/report/PillarModal.tsx`, `src/lib/pdf/components/PillarsPage.tsx`
- Commits exist: `4b798c6`, `701e678`, `61eb6be`, `eb469be`
- Files NOT modified (per scope): `src/components/report/PillarsDisplay.tsx`, `src/components/report/PillarsDisplayModal.tsx`, `src/components/ui/Dialog.tsx`
- No new dependencies added; `createPortal` already in `react-dom`, SVG primitives bundled with `@react-pdf/renderer`
