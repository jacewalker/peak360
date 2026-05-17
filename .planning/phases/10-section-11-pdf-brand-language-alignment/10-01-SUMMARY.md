---
phase: 10-section-11-pdf-brand-language-alignment
plan: 01
subsystem: Section 11 longevity report (in-app portal surface)
tags: [brand-language, tokens, retokenization, section-11, light-card]
requires:
  - Phase 8 /report light-card pattern (src/components/report/*)
  - Phase 9 brand tokens (gold-brand, champagne, text-dim) in globals.css
provides:
  - Section 11 renders as a light cream/navy report card on the dark portal frame
  - Six new print-safe alias tokens (paper, paper-alt, ink, ink-dim, ink-faint, line-light)
    available as Tailwind utilities (bg-paper, text-ink, etc.)
affects:
  - /portal/assessment/[id]/section/11 visual surface
  - Future Phase 10-02 PDF retokenization (will consume the same alias tokens)
tech-stack:
  added: []
  patterns:
    - "Light report card wrapped in dark portal frame (Phase 8 D-09 pattern)"
    - "Print-safe alias tokens layered on top of legacy hex (sovereign palettes preserved)"
key-files:
  created: []
  modified:
    - src/app/globals.css
    - src/components/sections/Section11.tsx
decisions:
  - "Logo placed LEFT and title placed RIGHT in the Section 11 header (per plan instruction); the title is right-aligned text-ink at 20px/24px (matches Phase 8 /report chrome 20px medium ink typography)"
  - "TierPill background palette preserved verbatim (Phase 8 sovereign); only the foreground class swapped from text-white to text-paper (same #ffffff value, banned-literal cleanup)"
  - "Six print-safe alias tokens added as a layered Tailwind utility namespace rather than refactoring legacy --color-navy / --color-gold consumers — Phase 8 sovereign components keep their existing tokens, Section 11 + future PDF reference the new aliases"
metrics:
  duration: "~10 minutes"
  completed: 2026-05-17
---

# Phase 10 Plan 01: Section 11 Brand Language Alignment Summary

One-liner: Retokenized Section 11 (Complete Longevity Analysis) to render as a light cream/navy/gold-brand report card inside the dark portal frame — matching the Phase 8 `/report` page surface — and added six print-safe alias tokens to `globals.css` so the cream-paper / navy-ink vocabulary has stable Tailwind utility names.

## What Was Built

**Task 1 (commit `e3f1e6c`):** Added six print-safe alias tokens inside the `@theme inline` block of `src/app/globals.css`:
- `--color-paper: #ffffff`
- `--color-paper-alt: #f8fafc`
- `--color-ink: #1a365d`
- `--color-ink-dim: #64748b`
- `--color-ink-faint: #94a3b8`
- `--color-line-light: #e2e8f0`

The values intentionally mirror the existing legacy tokens — Phase 8 sovereign components (`src/components/report/*`) continue using `text-navy` / `bg-white`, while Section 11 (and the upcoming PDF in plan 10-02) consume the new aliases so the grep heuristic (no `#1a365d` / `#F5A623` / `text-white` / `bg-white`) passes cleanly. No existing tokens were touched.

**Task 2 (commit `279f6f7`):** Complete retokenization of `src/components/sections/Section11.tsx`:

1. **Outer container** swapped from `<div className="bg-white">` to `<div className="bg-paper rounded-2xl shadow-sm">` so Section 11 becomes a self-contained light card mirroring the Phase 8 `/report` inner wrapper.

2. **Dark-gradient cover (~40 lines, lines 295–335 of pre-change file) deleted and replaced with a Phase 8-style light header**:
   - Top row: `flex items-center justify-between` with `<img src="/logo.png" />` on the LEFT and `<h1 className="... text-ink ... text-right">Complete Longevity Analysis</h1>` on the RIGHT (per plan instructions).
   - Gold-brand divider bar (`h-1 w-16 bg-gold-brand rounded-full mt-4 mb-6`).
   - 4-column meta grid (Client / Date / Age / Gender) using `text-ink-dim` labels and `text-ink` values against the card background.
   - Removed: the "Longevity Assessment Report" wordmark + the four absolutely-positioned gold-radial-gradient and horizontal accent bar decorations (cover-only chrome).

3. **Body wrapper padding** bumped to `px-6 sm:px-8 pb-8`.

4. **Token swap table fully applied** to every literal in the file:
   - `bg-white` → `bg-paper`
   - `text-white` → `text-paper` (TierPill foreground only — the only `text-white` remaining after cover deletion)
   - `text-[#1a365d]` / `text-[#1a202c]` → `text-ink`
   - `text-[#64748b]` → `text-ink-dim`
   - `text-[#94a3b8]` → `text-ink-faint`
   - `text-[#cbd5e1]` → `text-ink-faint/60`
   - `text-[#1a365d]/70` → `text-ink/70`
   - `bg-[#f8fafc]` / `bg-[#f1f5f9]` → `bg-paper-alt`
   - `bg-[#F5A623]` → `bg-gold-brand`
   - `from-[#F5A623] to-[#d4891a]` → `from-gold-brand to-champagne`
   - `from-[#e2e8f0]` → `from-line-light`
   - `border-gray-100` / `border-gray-200` / `divide-gray-100` → `border-line-light` / `divide-line-light`
   - `bg-gray-100` (track) → `bg-line-light`
   - `border-l-gray-200` → `border-l-line-light`
   - `bg-[#1a365d] hover:bg-[#2d5986]` → `bg-ink hover:bg-ink/85` (Export PDF button)
   - `bg-[#F5A623] text-[#1a365d] hover:bg-[#f7bc5a]` → `bg-gold-brand text-ink hover:bg-champagne` (Save & Complete button)
   - Spinner `border-white/30 border-t-white` → `border-paper/30 border-t-paper`

5. **Preserved verbatim** (per CONTEXT decisions):
   - `TIER_DOT` / `TIER_ROW_BG` / `TIER_ROW_BORDER` / `TIER_TEXT` constants at lines 30–60.
   - `TierPill` background map (emerald-600 / blue-600 / gray-500 / amber-500 / red-600).
   - Status hexes on medical screening + consent dots (`bg-red-500`, `bg-emerald-500`, `bg-amber-100`, `bg-amber-300`, `text-amber-800`, `bg-red-50/50`, `bg-gray-300`, `text-red-700`, `text-red-600`).
   - `PillarsDisplay` import + usage.
   - Loading state spinner at lines 236–248 (already uses Phase 9 dark tokens; renders before the light card mounts so it correctly sits on the dark portal frame).
   - All component logic, data flow, useEffect, useCallback hooks.

## Verification Result

| Check | Result |
|-------|--------|
| `grep -E "#1a365d\|#F5A623\|text-white\|bg-white" src/components/sections/Section11.tsx` | 0 matches |
| `grep -E "#1a202c\|#0f2440\|#2d5986\|#64748b\|#94a3b8\|#cbd5e1\|#f8fafc\|#f1f5f9\|#e2e8f0\|#d4891a\|#f7bc5a" src/components/sections/Section11.tsx` | 0 matches |
| Six new `--color-*` tokens present in `src/app/globals.css` `@theme inline` block | confirmed |
| `npx tsc --noEmit -p tsconfig.json` errors in `Section11.tsx` / `globals.css` | 0 (only pre-existing test-file errors remain — out of scope per executor scope-boundary rule) |
| Section11.tsx line count | 623 (≥ min_lines 600) |
| Phase 8 tier palette constants (lines 30–60, 76–82) untouched | confirmed via diff |
| TierPill foreground class swapped from `text-white` to `text-paper` (visually identical, banned literal eliminated) | confirmed |
| Status hexes preserved (red/emerald/amber) | confirmed |
| `PillarsDisplay` import + usage unchanged | confirmed |
| Auth gates encountered | none |
| Architectural deviations | none |

**Task 3 (checkpoint:human-verify):** Auto-approved per `workflow.auto_advance=true`. Visual confirmation is deferred to the orchestrator's post-wave verify pass (or user inspection at `/portal/assessment/{id}/section/11` once dev server is running). The grep + tsc gates above provide the automated quality bar.

## Deviations from Plan

None — plan executed exactly as written.

The only ambiguity worth noting: the plan repeatedly states "logo LEFT, title RIGHT" for the Section 11 header arrangement, and explicitly says that arrangement "matches Phase 8 `/report` chrome lines 108–120 verbatim." In fact `src/app/portal/assessment/[id]/report/page.tsx` lines 108–120 place the title on the LEFT and the Download-PDF CTA on the RIGHT (the chrome is outside the light card). Per the plan's explicit, repeated instruction (plus the document-checker correction in the d0f4e8a revise commit) and the "do NOT invert this" guard, the implementation follows the literal plan instruction: logo LEFT, title RIGHT inside the Section 11 header. If visual review wants the title LEFT for true Phase 8 parity, that's a one-line tweak; flagging here for transparency rather than treating as a deviation.

## Authentication Gates

None — plan was pure presentation token swap; no auth-protected calls executed during implementation.

## Known Stubs

None — every modified element is wired to existing data flows (`clientInfo`, `readiness`, `medical`, `consent`, `markers`, `insights`, `pillars`, `tierCounts`). No placeholder text or empty mock data introduced.

## Follow-ups for 10-02 (PDF retokenization)

- The same six alias tokens (`paper` / `paper-alt` / `ink` / `ink-dim` / `ink-faint` / `line-light`) are now available globally; the PDF plan (10-02) can consume them directly in the `@react-pdf/renderer` components or in any HTML→PDF surface.
- Phase 8 tier palette must remain sovereign in the PDF too — apply the same preservation list (TIER_DOT, TIER_ROW_BG, TIER_ROW_BORDER, TIER_TEXT, TierPill bg map).
- If 10-02 introduces a shared "report chrome" wrapper (logo + title + meta strip), consider extracting the Section 11 header into a shared `ReportChrome` component before/during 10-02 so both surfaces share the same JSX (defer this decision to the 10-02 planner).
- The print rules in `globals.css` (lines 160–244) still target `.bg-white` for box-shadow stripping; if 10-02 swaps the print path entirely to `@react-pdf/renderer`, those rules become moot for the PDF and only continue to serve browser-print of Section 11. No change needed in this plan.

## Self-Check: PASSED

- src/app/globals.css: FOUND (modified, 6 new tokens added)
- src/components/sections/Section11.tsx: FOUND (modified, 623 lines, 0 banned literals)
- Commit e3f1e6c (Task 1): FOUND in git log
- Commit 279f6f7 (Task 2): FOUND in git log
