---
phase: 10-section-11-pdf-brand-language-alignment
verified: 2026-05-17T00:00:00Z
status: human_needed
score: 11/12 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Zero hex literals matching #1a365d|#F5A623 remain anywhere in src/lib/pdf/ (the legacy bright-gold and bright-navy hexes — replaced by either gold-brand or routed through token)"
    status: partial
    reason: "The literal-hex grep passes (0 #1a365d or #F5A623 hex literals outside colors.ts), satisfying the wording of the must-have. However, src/lib/pdf/components/MarkerTable.tsx:42 still contains `color: 'rgba(26, 54, 93, 0.7)'`, which decodes to #1a365d at 70% alpha. This bypasses the COLORS.navy token and silently breaks the spirit of the must-have (which states the navy value should be 'routed through COLORS.navy = #1a365d centrally'). If COLORS.navy ever changes, this category-header label will drift out of sync. Flagged as WR-01 in 10-REVIEW.md."
    artifacts:
      - path: "src/lib/pdf/components/MarkerTable.tsx"
        issue: "Line 42 uses rgba(26, 54, 93, 0.7) — a navy literal in rgba form that bypasses COLORS.navy token routing."
    missing:
      - "Replace `color: 'rgba(26, 54, 93, 0.7)'` on MarkerTable.tsx:42 with `color: COLORS.textSecondary` (recommended — matches the table's existing dim-label convention at line 65) OR `color: COLORS.navy` if the navy weight is intentional."
human_verification:
  - test: "Section 11 renders as a light card on the dark portal frame"
    expected: "At /portal/assessment/{id}/section/11, the page shows the dark portal chrome (sidebar/header/MonoEyebrow 'SECTION 11 / 11 · LONGEVITY ANALYSIS') and Section 11 itself appears as a single cream/white rounded card with a subtle shadow. Inside the card: logo on the LEFT, 'Complete Longevity Analysis' title in navy ink on the RIGHT, gold-brand divider, then 4-column client meta strip in dim ink labels + ink values. Pillars, tier cards, marker rows, and insights all render normally below."
    why_human: "Visual layout/contrast cannot be programmatically verified. Need to confirm light-card-on-dark-frame composition reads correctly and tier palette pops as before."
  - test: "Exported PDF gold accents match in-app Section 11 gold-brand"
    expected: "Click 'Export PDF' from Section 11. In the resulting PDF: (1) cover gold accent bar is dull gold-brand (#c9a24a) NOT bright orange (#F5A623); (2) all SectionHeading vertical bars throughout the PDF are dull gold-brand; (3) insight card left-edge stripes + bullet dots are dull gold-brand; (4) 5-tier marker palette (emerald/blue/gray/amber/red) renders identically to the in-app Section 11 tier pills; (5) medical-flag amber callout + referral-flag red callout unchanged (status palette sovereign)."
    why_human: "Visual brand-cohesion check between two rendered surfaces (in-app card vs PDF). Static color grep cannot confirm what the rendered PDF cover and accent bars look like."
  - test: "Browser-print (Cmd+P) of Section 11 renders without box-shadows"
    expected: "Hit Cmd+P on /portal/assessment/{id}/section/11. The print preview should show the report content without box-shadows on the bg-paper card or inner cards."
    why_human: "WR-02 in 10-REVIEW.md notes the print rule `.bg-white { box-shadow: none !important; }` in globals.css:259 no longer matches Section 11 (now bg-paper), so browser-print box shadows may print. Need to visually confirm whether this is a real regression for the browser-print path (orthogonal to the @react-pdf/renderer Export PDF path)."
  - test: "Action button row visual gutter on mobile viewport"
    expected: "Resize to mobile width (<640px). The 'Export PDF' and 'Save & Complete Assessment' buttons should have visible horizontal breathing room from the card edge."
    why_human: "WR-03 in 10-REVIEW.md notes the button row sits inside the bg-paper card but outside the px-6 sm:px-8 body padding wrapper, with only pt-8 pb-4 vertical padding. The buttons' internal px-8 keeps them from touching the edge in normal sizing, but layout fragility may surface on extreme widths or future button changes. Visual confirmation needed."
---

# Phase 10: Section 11 + PDF Brand Language Alignment Verification Report

**Phase Goal:** Retokenize Section 11 (in-app longevity report) and the PDF renderer to the Phase 9 brand system — Section 11 renders as a light cream/navy card inside the dark portal frame; PDF uses gold-brand (#c9a24a) + champagne (#e8d6a8) accents so the two artefacts read as the same brand. Eliminate legacy `#1a365d` / `#F5A623` literals from Section11.tsx, and route stray PDF hex literals through COLORS tokens while preserving Phase 8 sovereign medical/status palettes verbatim.

**Verified:** 2026-05-17
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                                                                                                                                                                                                  | Status      | Evidence                                                                                                                                                                                                                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Section 11 renders as a light cream/navy card inside the dark portal frame (matches Phase 8 /report page pattern)                                                                                                                                                                       | ? UNCERTAIN | Outer wrapper at Section11.tsx:294 = `<div className="bg-paper rounded-2xl shadow-sm">`. Header at lines 295-323 has logo LEFT + title RIGHT + gold-brand divider + meta grid. Visual confirmation requires browser. Routed to human verification.                          |
| 2   | Zero hex literals matching #1a365d\|#F5A623 remain in Section11.tsx                                                                                                                                                                                                                       | ✓ VERIFIED  | `grep -nE "#1a365d\|#F5A623\|text-white\|bg-white" src/components/sections/Section11.tsx` → 0 matches.                                                                                                                                                                       |
| 3   | Zero text-white\|bg-white utility classes remain in Section11.tsx                                                                                                                                                                                                                         | ✓ VERIFIED  | Same grep above → 0 matches. Banned-literal sweep passes cleanly.                                                                                                                                                                                                          |
| 4   | Phase 8 tier-pill palette on Results Overview is preserved verbatim (emerald-600 / blue-600 / gray-500 / amber-500 / red-600)                                                                                                                                                          | ✓ VERIFIED  | Section11.tsx:77-81 — bg map untouched: `elite: 'bg-emerald-600'`, `great: 'bg-blue-600'`, `normal: 'bg-gray-500'`, `cautious: 'bg-amber-500'`, `poor: 'bg-red-600'`.                                                                                                       |
| 5   | Phase 8 emerald/amber/red status hexes (#10b981 / #f59e0b / #ef4444 etc.) on tier dots and pillar pills remain                                                                                                                                                                          | ✓ VERIFIED  | Section11.tsx:31-35 TIER_DOT preserves: elite `#10b981`, great `#3b82f6`, normal `#6b7280`, cautious `#f59e0b`, poor `#ef4444`. TIER_ROW_BG, TIER_ROW_BORDER, TIER_TEXT also preserved (lines 30-60). Status hexes on medical screening dots untouched.                       |
| 6   | globals.css exposes paper / ink / ink-dim / ink-faint / line-light tokens consumable as Tailwind utilities                                                                                                                                                                            | ✓ VERIFIED  | `grep -nE "^  --color-(paper\|paper-alt\|ink\|ink-dim\|ink-faint\|line-light):" src/app/globals.css` → 6 matches at lines 71-76 inside @theme inline block. 61 utility usages (`bg-paper`/`text-ink`/`text-gold-brand`/`border-line-light`) confirmed in Section11.tsx.        |
| 7   | Exported PDF accent palette is gold-brand (#c9a24a) + champagne (#e8d6a8), matching Section 11 light card                                                                                                                                                                            | ✓ VERIFIED  | `src/lib/pdf/colors.ts:7-8`: `gold: '#c9a24a'`, `goldDark: '#e8d6a8'`. ~83 downstream consumers auto-aligned via field-name preservation.                                                                                                                                  |
| 8   | PDF cover navy + paper-white surfaces remain; navy hex literal #1a365d eliminated from src/lib/pdf/ tree (routed through COLORS.navy)                                                                                                                                                | ✓ VERIFIED  | `grep -rnE "#1a365d" src/lib/pdf/` returns only the canonical token definition at colors.ts:7 (`navy: '#1a365d'`). No component bypasses the token via hex form.                                                                                                            |
| 9   | Zero hex literals matching `#1a365d\|#F5A623` remain anywhere in src/lib/pdf/                                                                                                                                                                                                            | ⚠️ PARTIAL  | **Hex literal grep passes** (only colors.ts token defs remain). **But rgba form leaks:** MarkerTable.tsx:42 uses `rgba(26, 54, 93, 0.7)` = #1a365d at 70% alpha, bypassing the token. See gaps section + WR-01 in 10-REVIEW.md.                                              |
| 10  | Phase 8 sovereign palettes preserved verbatim (TIER_COLORS_PDF, TIER_ROW_BG_PDF, TIER_BORDER_PDF, TIER_TEXT_PDF, status surface tints, TRAFFIC_LIGHT_HEX re-exports)                                                                                                                | ✓ VERIFIED  | `src/lib/pdf/colors.ts:20-59` — all four TIER_*_PDF maps unchanged with their Phase 8 hex values. TRAFFIC_LIGHT_HEX re-export at line 59 intact. PillarsPage, MedicalSection, ReferralFlagPdf, Peak360Report gender-warning hexes confirmed not modified.                  |
| 11  | Stray hex literals routed through existing COLORS tokens (MarkerTable subcategory `#f1f5f9`, MarkerRow no-tier `#f9fafb`/`#e5e7eb`, ConsentStatus unsigned dot `#9ca3af`)                                                                                                              | ✓ VERIFIED  | `grep -E "'#f1f5f9'\|'#f9fafb'\|'#e5e7eb'\|'#9ca3af'" src/lib/pdf/components/MarkerTable.tsx src/lib/pdf/components/MarkerRow.tsx src/lib/pdf/components/ConsentStatus.tsx` → 0 matches. ConsentStatus.tsx:35 uses `COLORS.textMuted` for unsigned, keeps `#10b981` for signed.   |
| 12  | Visual diff: PDF cover + accents + body align brand language with in-app Section 11 light card (same gold-brand, same navy ink, both surfaces read as the same artefact)                                                                                                              | ? UNCERTAIN | Substantively verified — both surfaces consume the same hex values via tokens. But the "two artefacts read as the same brand" claim is a visual diff that requires human eye. Routed to human verification.                                                                |

**Score:** 9/12 verified, 1/12 partial (WR-01 rgba leak), 2/12 uncertain (require human visual verification).

### Required Artifacts

| Artifact                                              | Expected                                                                                            | Status     | Details                                                                                                                                                                                          |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/globals.css`                                 | 6 new print-safe alias tokens (paper, paper-alt, ink, ink-dim, ink-faint, line-light) in @theme    | ✓ VERIFIED | All 6 present at lines 71-76 inside @theme inline block. Contains `--color-paper` (required marker).                                                                                              |
| `src/components/sections/Section11.tsx`               | Retokenized to Phase 8 light-card vocabulary, wrapped in light card surface, min_lines 600        | ✓ VERIFIED | 623 lines (≥ min_lines 600). Outer wrapper = `bg-paper rounded-2xl shadow-sm` at line 294. 61 token usages of bg-paper/text-ink/text-gold-brand/border-line-light. Phase 8 sovereign maps intact. |
| `src/lib/pdf/colors.ts`                               | gold/goldDark shifted to #c9a24a/#e8d6a8; contains #c9a24a; sovereign palettes untouched           | ✓ VERIFIED | Lines 7-8 updated. Contains `#c9a24a`. All TIER_*_PDF maps unchanged.                                                                                                                            |
| `src/lib/pdf/components/MarkerTable.tsx`              | Subcategory header bg routed through COLORS.borderLight                                            | ⚠️ PARTIAL | Line 59 = `backgroundColor: COLORS.borderLight` ✓. But line 42 retains `rgba(26, 54, 93, 0.7)` navy literal bypassing COLORS.navy — see WR-01.                                                  |
| `src/lib/pdf/components/MarkerRow.tsx`                | No-tier fallback bg/border routed through COLORS.bgLighter/COLORS.border                          | ✓ VERIFIED | Stray-literal grep returns 0 matches; COLORS import present.                                                                                                                                     |
| `src/lib/pdf/components/ConsentStatus.tsx`            | Unsigned dot routed through COLORS.textMuted                                                       | ✓ VERIFIED | Line 35: `backgroundColor: consentSigned ? '#10b981' : COLORS.textMuted`. Status-sovereign emerald preserved.                                                                                    |

### Key Link Verification

| From                                                | To                                                            | Via                                                                       | Status     | Details                                                                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/sections/Section11.tsx`             | `globals.css @theme tokens`                                   | Tailwind utilities `bg-paper / text-ink / text-gold-brand / border-line-light` | ✓ WIRED   | 61 utility usages confirmed; tokens defined in @theme block at globals.css:71-76; Tailwind v4 auto-generates utilities from @theme. |
| `src/components/sections/Section11.tsx outer container` | `section/[num]/page.tsx` dark portal frame                | Self-contained light card wrapper that mirrors /report page line 122 inner wrapper | ✓ WIRED   | Outer wrapper at line 294 = `bg-paper rounded-2xl shadow-sm` — matches Phase 8 inner wrapper pattern (minus padding which is internal on Section 11).                                                                                              |
| `src/lib/pdf/components/*.tsx` (~83 token refs)     | `src/lib/pdf/colors.ts COLORS export`                         | `import { COLORS } from '@/lib/pdf/colors'`                              | ✓ WIRED   | COLORS imported in MarkerTable, MarkerRow, ConsentStatus. Field-name preservation means downstream consumers auto-aligned.       |
| `src/lib/pdf/Peak360Report.tsx`                     | ReportHeader + PillarsPage + TierSummary + MarkerTable + InsightsSection | Document → Page composition; all downstream components consume tokens via COLORS | ✓ WIRED   | Centralized token swap propagates through the rendering pipeline.                                                                |

### Data-Flow Trace (Level 4)

| Artifact                                | Data Variable    | Source                            | Produces Real Data | Status     |
| --------------------------------------- | ---------------- | --------------------------------- | ------------------ | ---------- |
| `src/components/sections/Section11.tsx` | clientInfo, readiness, medical, consent, markers, insights, pillars, tierCounts | Existing assessment data loaded via fetch (untouched per plan §16) | ✓ Yes | ✓ FLOWING |
| `src/lib/pdf/*` (rendering)             | report data props | Peak360Report aggregates from assessment data | ✓ Yes | ✓ FLOWING |

Token swap does not alter data flow; existing wiring (verified in prior phases) preserved by `<task>` step 16 "do NOT modify any logic, data flow, useEffect, useCallback, or component structure."

### Behavioral Spot-Checks

| Behavior                                        | Command                                                          | Result                                                    | Status |
| ----------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------- | ------ |
| TypeScript compilation (Phase 10 production files) | `npx tsc --noEmit -p tsconfig.json 2>&1 \| grep -E "Section11\|src/lib/pdf/\|globals.css"` | 0 errors                                                  | ✓ PASS |
| TypeScript compilation (project-wide)            | `npx tsc --noEmit -p tsconfig.json`                              | Errors only in pre-existing test files (src/__tests__/*) | ✓ PASS (out of scope per plan — logged in 10-02-SUMMARY) |
| Banned-literal grep (Section11)                  | `grep -nE "#1a365d\|#F5A623\|text-white\|bg-white" src/components/sections/Section11.tsx` | 0 matches                                                 | ✓ PASS |
| Banned-literal grep (PDF tree, excl. token file) | `grep -rnE "'#1a365d'\|'#F5A623'" src/lib/pdf/ \| grep -v colors.ts` | 0 matches                                                 | ✓ PASS |
| rgba navy leak check (gap detector)              | `grep -rnE "rgba\(26, ?54, ?93" src/lib/pdf/`                    | 1 match: MarkerTable.tsx:42                              | ✗ FAIL — gap identified (WR-01) |
| Section11 line count (≥600 min_lines)           | `wc -l src/components/sections/Section11.tsx`                    | 623 lines                                                 | ✓ PASS |
| Section 11 renders + PDF export end-to-end       | Browser visit + click Export PDF                                 | Cannot run in verifier (requires dev server + auth + assessment data) | ? SKIP — routed to human verification |

### Probe Execution

No formal `probe-*.sh` scripts declared in PLAN frontmatter or referenced in SUMMARY for this phase. Phase 10 is a CSS/token retokenization phase; verification gates are grep + tsc + visual diff (per plan `<verify>` sections). No probe execution required.

### Requirements Coverage

| Requirement | Source Plan                    | Description                                                                 | Status         | Evidence                                                                                                                                                                                                                                                            |
| ----------- | ------------------------------ | --------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-9.1     | 10-01-PLAN, 10-02-PLAN, ROADMAP | "brand consistency across portal surfaces" (inherited from Phase 9)         | ⚠️ ORPHANED (in REQUIREMENTS.md) — but SATISFIED in spirit | REQ-9.1 is referenced by both plans and the ROADMAP entry, but does NOT appear in `.planning/REQUIREMENTS.md`. The ROADMAP labels it as "inherited from Phase 9" — implicit/conceptual rather than formally tracked. The brand-consistency intent IS satisfied: Section 11 + PDF both consume the same gold-brand/champagne accents and navy ink via tokens. Recommend adding REQ-9.1 to REQUIREMENTS.md for traceability hygiene. |

### Anti-Patterns Found

| File                                              | Line | Pattern                              | Severity   | Impact                                                                                                                                                                                                                |
| ------------------------------------------------- | ---- | ------------------------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/pdf/components/MarkerTable.tsx`          | 42   | `color: 'rgba(26, 54, 93, 0.7)'`     | ⚠️ Warning | Navy literal in rgba form bypasses COLORS.navy token. Brand-drift risk if COLORS.navy is rebranded later. Sweep heuristic was hex-only; this slipped through. (WR-01 in 10-REVIEW.md)                                |
| `src/app/globals.css`                             | 259  | `.bg-white { box-shadow: none }` print rule no longer matches new `bg-paper` card | ℹ️ Info    | Browser-print (Cmd+P) of Section 11 may now render box-shadows the rule was supposed to strip. PDF Export path (@react-pdf/renderer) unaffected. (WR-02 in 10-REVIEW.md)                                              |
| `src/components/sections/Section11.tsx`           | 585  | Action button row outside `px-6 sm:px-8` body wrapper | ℹ️ Info    | Layout fragility — buttons rely on their own internal `px-8` for gutter. Future button changes could render edge-to-edge. (WR-03 in 10-REVIEW.md)                                                                    |
| `src/components/sections/Section11.tsx`           | 240  | `border-3` non-standard Tailwind utility (pre-existing) | ℹ️ Info    | If JIT doesn't match `border-3`, spinner has no visible border. Not introduced by this phase but inherited. (IN-01)                                                                                                  |
| `src/components/sections/Section11.tsx`           | 298, 571 | Raw `<img>` instead of `next/image` (pre-existing) | ℹ️ Info    | Next.js best practice — pre-existing, not introduced. (IN-02)                                                                                                                                                         |
| `src/lib/pdf/colors.ts`                           | 8    | `goldDark` field name semantically inverted by new champagne value | ℹ️ Info    | Field named `goldDark` now holds a *lighter* champagne value. Misleading-but-acceptable per plan trade-off (rename would touch ~83 consumers). Token-naming debt. (IN-03)                                              |

### Human Verification Required

See frontmatter `human_verification` section. Summary:

#### 1. Section 11 renders as a light card on the dark portal frame

**Test:** Visit `/portal/assessment/{id}/section/11` as authenticated coach/admin.
**Expected:** Dark portal frame + sidebar/MonoEyebrow intact; Section 11 is a single cream rounded card with subtle shadow; header shows logo LEFT, title RIGHT, gold-brand divider, meta strip; tier palette pops with emerald/blue/gray/amber/red; insight cards have gold-brand-to-champagne stripe.
**Why human:** Visual contrast/composition cannot be programmatically verified.

#### 2. Exported PDF gold accents match in-app Section 11 gold-brand

**Test:** Click "Export PDF" from Section 11. Side-by-side PDF + in-app comparison.
**Expected:** PDF cover gold accent bar = dull `#c9a24a` (NOT bright `#F5A623`); all SectionHeading bars dull gold; insight stripes + bullets dull gold; 5-tier marker palette identical across both surfaces; status callouts unchanged.
**Why human:** Visual brand cohesion between two rendered surfaces requires eyeball.

#### 3. Browser-print (Cmd+P) of Section 11 renders without box-shadows

**Test:** Hit Cmd+P on `/portal/assessment/{id}/section/11`.
**Expected:** Print preview shows no box-shadows on the cream card or inner cards.
**Why human:** WR-02 — print rule `.bg-white { box-shadow: none }` no longer matches the new `bg-paper` card. Need to confirm whether this is a real regression for the browser-print path (orthogonal to @react-pdf/renderer Export PDF path).

#### 4. Action button row visual gutter on mobile viewport

**Test:** Resize browser to <640px and view Section 11 bottom action buttons.
**Expected:** Visible horizontal breathing room between buttons and card edge.
**Why human:** WR-03 — buttons sit outside body padding wrapper with only vertical padding; layout fragility check.

### Gaps Summary

The substantive token-sweep goals are met cleanly:
- Section11.tsx has **zero** banned hex/utility literals
- PDF colors.ts ships the Phase 9 gold-brand/champagne values
- All three stray-literal cleanups in MarkerTable/MarkerRow/ConsentStatus are done
- Phase 8 sovereign palettes (tier maps, status hexes, traffic-light re-export) preserved verbatim
- All 6 new alias tokens added to globals.css and consumed (61 utility usages in Section11.tsx)
- TypeScript compiles cleanly for all Phase 10 production files

**One real gap (partial):** Plan 10-02 truth #3 claims navy is "routed through COLORS.navy centrally" across `src/lib/pdf/`, but `MarkerTable.tsx:42` retains `rgba(26, 54, 93, 0.7)` — a navy literal in rgba clothing that bypasses the token. The grep heuristic missed it; the code review caught it (WR-01). Fix is a one-line swap to `color: COLORS.textSecondary` (preferred — matches the table's existing dim-label convention at line 65). This does not block goal achievement (PDF still renders correctly today; gold-brand alignment intent met) but does compromise the token-discipline invariant the plan asserted.

**Two visual checks required for goal closure (Section 11 light-card composition + PDF visual brand cohesion).** These are inherent to a brand-language phase — automated greps confirm token values, but rendered visual diff requires a human eye.

**Two info-level layout/print concerns surfaced by the code review** (WR-02 print box-shadow rule, WR-03 button gutter) — orthogonal to the brand-token goal but worth confirming during the human verification pass since they sit in the same files.

**REQ-9.1 traceability:** Referenced by both plans + ROADMAP but missing from `.planning/REQUIREMENTS.md`. Brand-consistency intent is satisfied; formal requirement entry should be added for traceability hygiene.

---

_Verified: 2026-05-17_
_Verifier: Claude (gsd-verifier)_
