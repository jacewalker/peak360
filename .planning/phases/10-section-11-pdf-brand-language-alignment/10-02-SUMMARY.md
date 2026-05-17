---
phase: 10-section-11-pdf-brand-language-alignment
plan: 02
subsystem: pdf-renderer
tags:
  - brand-alignment
  - pdf
  - tokens
  - phase-9
requirements:
  - REQ-9.1
dependency-graph:
  requires:
    - 10-01 (Section 11 in-app gold-brand palette shipped — PDF must match)
    - Phase 8 PDF token architecture (src/lib/pdf/colors.ts centralized exports)
  provides:
    - PDF accent palette aligned with Phase 9 brand language (gold-brand + champagne)
    - Zero stray non-status hex literals in src/lib/pdf/components/ for MarkerTable / MarkerRow / ConsentStatus
  affects:
    - src/lib/pdf/Peak360Report.tsx (downstream — consumes COLORS.gold via styles.ts)
    - ~83 token-consumer references across 14 PDF components (auto-aligned via centralized swap)
tech-stack:
  added: []
  patterns:
    - Centralized token swap — single-file source change propagates to ~83 downstream consumers
    - Sovereign-palette preservation — Phase 8 TIER_*_PDF maps + status hexes untouched
key-files:
  created: []
  modified:
    - src/lib/pdf/colors.ts
    - src/lib/pdf/components/MarkerTable.tsx
    - src/lib/pdf/components/MarkerRow.tsx
    - src/lib/pdf/components/ConsentStatus.tsx
decisions:
  - Eliminated bright-orange #F5A623 from PDF by swapping COLORS.gold value (not field name) → zero downstream edits required
  - Routed ConsentStatus unsigned-dot #9ca3af through COLORS.textMuted (#94a3b8 — visually equivalent neutral gray, per plan tolerance)
  - Routed MarkerRow no-tier border #e5e7eb through COLORS.border (#e2e8f0 — visually equivalent, slightly lighter, acceptable per plan §interfaces)
  - Preserved sovereign TIER_BORDER_PDF.normal = '#9ca3af' at colors.ts:39 (Phase 8 D-28 marker palette)
  - Preserved consent-signed #10b981 emerald in ConsentStatus (sovereign status color per Phase 9 D-16)
metrics:
  duration: "~2 min"
  completed: "2026-05-17"
  tasks: 3
  files_modified: 4
  commits: 2
---

# Phase 10 Plan 02: PDF Brand Language Alignment Summary

**One-liner:** Shifted exported PDF accent palette to Phase 9 gold-brand (`#c9a24a`) + champagne (`#e8d6a8`) via centralized `COLORS` token swap, plus four stray non-status hex literals routed through existing tokens — eliminating bright legacy gold while preserving sovereign Phase 8 marker tiers and status callouts.

## What Shipped

The exported PDF (rendered via `@react-pdf/renderer` from `src/lib/pdf/`) now reads as the same brand artefact as the in-app Section 11 light card from Plan 10-01. The PDF cover navy + paper-white surfaces are preserved (print medium — paper is light), but every gold accent — section heading bars, insight card left stripes, bullet dots, etc. — now uses the dull gold-brand instead of bright orange.

Concretely:

| Token | Before | After |
|-------|--------|-------|
| `COLORS.gold` | `#F5A623` (legacy bright gold) | `#c9a24a` (Phase 9 gold-brand) |
| `COLORS.goldDark` | `#d4891a` (bright gold dark) | `#e8d6a8` (Phase 9 champagne) |
| `MarkerTable` subcategory header bg | literal `'#f1f5f9'` | `COLORS.borderLight` |
| `MarkerRow` no-tier row bg | literal `'#f9fafb'` | `COLORS.bgLighter` |
| `MarkerRow` no-tier border | literal `'#e5e7eb'` | `COLORS.border` (#e2e8f0) |
| `ConsentStatus` unsigned dot | literal `'#9ca3af'` | `COLORS.textMuted` (#94a3b8) |

## Tasks Executed

### Task 1: Update colors.ts — shift gold + goldDark to Phase 9 brand values
- **Commit:** `8cff05d` feat(10-02): shift PDF gold tokens to Phase 9 brand palette
- **Files:** `src/lib/pdf/colors.ts`
- **Verification:** `grep -E "gold: '#c9a24a'" src/lib/pdf/colors.ts | wc -l` → `1`; `grep -E "goldDark: '#e8d6a8'" src/lib/pdf/colors.ts | wc -l` → `1`; `grep -E "#F5A623|#d4891a" src/lib/pdf/colors.ts | wc -l` → `0`. Field names unchanged so the ~83 downstream consumers (ReportHeader gold accent bar, styles.ts `sectionHeadingBar`, InsightsSection gold stripe + bullets, etc.) auto-align with zero per-component edits.

### Task 2: Route stray hex literals through COLORS tokens
- **Commit:** `604947e` refactor(10-02): route stray PDF hex literals through COLORS tokens
- **Files:** `src/lib/pdf/components/MarkerTable.tsx`, `src/lib/pdf/components/MarkerRow.tsx`, `src/lib/pdf/components/ConsentStatus.tsx`
- **Verification:** `grep -E "'#f1f5f9'|'#f9fafb'|'#e5e7eb'|'#9ca3af'"` over the three files → `0` matches. `grep -rE "'#1a365d'|'#F5A623'" src/lib/pdf/ | grep -v "src/lib/pdf/colors.ts:"` → `0` matches. Sovereign `TIER_BORDER_PDF.normal = '#9ca3af'` at `colors.ts:39` confirmed untouched (only legitimate `#9ca3af` occurrence remaining in `src/lib/pdf/`).
- **TypeScript:** `npx tsc --noEmit -p tsconfig.json` reports zero errors under `src/lib/pdf/`. Pre-existing test-file errors (`src/__tests__/setup.tsx`, `src/__tests__/store/assessment-store.test.ts`, etc.) are out of scope per the executor scope-boundary rule and have been logged here for traceability — they were already broken on the parent commit `5429d85` before this plan ran.
- **`COLORS` import:** All three target files already had `COLORS` imported (MarkerTable.tsx:3 already imported COLORS; MarkerRow.tsx:3 imported `COLORS, TIER_ROW_BG_PDF, TIER_BORDER_PDF`; ConsentStatus.tsx:2 imported COLORS). No import-extension edits were required.

### Task 3: Human verification checkpoint — auto-approved
- **Mode:** Worktree parallel executor with `workflow.auto_advance: true`. Per the checkpoint protocol, `checkpoint:human-verify` auto-approves; the orchestrator handles cross-wave visual verification after Plan 10-01 (Section 11 in-app brand swap) lands in the same wave.
- **Auto-approved evidence:**
  - Substantive plan gates all pass (gold-brand value present, legacy gold absent, stray literals eliminated, TS clean over `src/lib/pdf/`, sovereign palettes preserved).
  - The static hex substitution has no runtime path — `@react-pdf/renderer` consumes the token values verbatim at render time, so visual diff is bounded by the four hex changes listed above.

## Deviations from Plan

### Auto-fixed / observed issues

**1. [Rule SCOPE - Observation] Pre-existing test-file TypeScript errors**
- **Found during:** Task 2 verification (`npx tsc --noEmit -p tsconfig.json`).
- **Issue:** The plan's automated verify gate is written as `npx tsc --noEmit -p tsconfig.json 2>&1 | grep -v "^$" | wc -l | grep -q "^0$"`, which counts ALL TypeScript errors project-wide, including pre-existing breakage in `src/__tests__/setup.tsx` (missing `vi` import from Vitest globals), `src/__tests__/store/assessment-store.test.ts` (Record<string, unknown>↔BloodTests interface drift), `src/__tests__/components/layout.test.tsx` (`getByAlt` typo), and `src/__tests__/normative/data.test.ts` (SimpleMarker type cast).
- **Fix:** None applied. These errors are pre-existing on parent commit `5429d85` and are unrelated to PDF brand work. They live in `src/__tests__/` and do not affect production builds, runtime, or the PDF renderer. Per the executor scope-boundary rule, out-of-scope discoveries should be logged not fixed.
- **Files modified:** None.
- **Commit:** N/A.
- **Logged for follow-up:** Test-suite hygiene (Vitest globals config + interface alignment) — orthogonal to brand alignment; should be addressed in a dedicated test-hardening plan.

**Resolution of verify gate:** The substantive `tsc` check scoped to `src/lib/pdf/` returns zero errors (`npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "^src/lib/pdf" | wc -l` → `0`). The plan's intent (PDF code type-checks cleanly) is satisfied.

### Auth gates

None — pure presentation token swap. No auth touched.

## Verification Run

### Plan verification commands

| Command | Expected | Result |
|---------|----------|--------|
| `grep -E "#F5A623\|#d4891a" src/lib/pdf/colors.ts` | no matches | ✅ 0 matches |
| `grep -rE "'#1a365d'\|'#F5A623'" src/lib/pdf/ \| grep -v "src/lib/pdf/colors.ts:" \| wc -l` | `0` | ✅ `0` |
| `grep -E "'#f1f5f9'\|'#f9fafb'\|'#e5e7eb'\|'#9ca3af'" src/lib/pdf/components/MarkerTable.tsx src/lib/pdf/components/MarkerRow.tsx src/lib/pdf/components/ConsentStatus.tsx` | no matches | ✅ 0 matches |
| `grep -rE "'#9ca3af'" src/lib/pdf/ \| grep -v "src/lib/pdf/colors.ts:" \| wc -l` | `0` | ✅ `0` (only sovereign TIER_BORDER_PDF.normal at colors.ts:39 remains) |
| `npx tsc --noEmit -p tsconfig.json` for `src/lib/pdf/` errors | `0` | ✅ `0` |

### Success criteria checklist

- [x] `COLORS.gold = '#c9a24a'`, `COLORS.goldDark = '#e8d6a8'` in `src/lib/pdf/colors.ts`
- [x] No `#F5A623` or `#d4891a` literals anywhere in `src/lib/pdf/`
- [x] No `#1a365d` literals anywhere in `src/lib/pdf/` outside the single `navy: '#1a365d'` line in `colors.ts`
- [x] No `#9ca3af` literals anywhere in `src/lib/pdf/` outside the sovereign `TIER_BORDER_PDF.normal` line in `colors.ts`
- [x] Three stray non-status hex literals (`#f1f5f9`, `#f9fafb`, `#e5e7eb`, `#9ca3af`) eliminated from MarkerTable / MarkerRow / ConsentStatus
- [x] Phase 8 sovereign palettes preserved verbatim (`TIER_COLORS_PDF`, `TIER_ROW_BG_PDF`, `TIER_BORDER_PDF`, `TIER_TEXT_PDF`, `TRAFFIC_LIGHT_HEX` re-export untouched)
- [x] PillarsPage STATUS_TEXT, MedicalSection status hexes, ReferralFlagPdf hexes — confirmed not modified (sovereign per Phase 9 D-16)
- [x] `git diff src/lib/pdf/colors.ts` shows changes confined to lines 7–8 (gold + goldDark hex values; comments added inline)

## Known Stubs

None. All four edits are pure presentation token routing — no UI surfaces gain or lose data, no components were stubbed, no "coming soon" placeholders introduced.

## Threat Flags

None. Pure presentation token swap inside a server-side PDF renderer; no new trust boundaries, no new inputs, no auth/data-flow surface introduced. The Phase 10 threat model dispositions (T-10-03 accept, T-10-04 accept, T-10-05 mitigate-via-verification) all hold.

## Self-Check: PASSED

**Files modified — all exist:**
- ✅ `src/lib/pdf/colors.ts` (FOUND)
- ✅ `src/lib/pdf/components/MarkerTable.tsx` (FOUND)
- ✅ `src/lib/pdf/components/MarkerRow.tsx` (FOUND)
- ✅ `src/lib/pdf/components/ConsentStatus.tsx` (FOUND)

**Commits — both present in `git log --oneline`:**
- ✅ `8cff05d` feat(10-02): shift PDF gold tokens to Phase 9 brand palette (FOUND)
- ✅ `604947e` refactor(10-02): route stray PDF hex literals through COLORS tokens (FOUND)

**Substantive plan gates — all pass:** gold-brand value present, legacy gold absent, stray literals eliminated, TS clean over `src/lib/pdf/`, sovereign palettes preserved.
