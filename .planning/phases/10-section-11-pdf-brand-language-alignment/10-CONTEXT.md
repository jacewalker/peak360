# Phase 10: Section 11 + PDF brand language alignment - Context

**Gathered:** 2026-05-12
**Status:** Ready for planning
**Source:** Inline (follow-on from Phase 9 verification — user identified Section 11 + PDF as missed surfaces)

<domain>
## Phase Boundary

**In scope:**
1. `src/components/sections/Section11.tsx` (636 lines) — the in-app longevity report rendered at `/portal/assessment/[id]/section/11` and `/assessment/[id]/section/11`. Currently rendered with legacy blue (`#1a365d` navy) + yellow (`#F5A623` legacy gold) + white surfaces. Must align to the Phase 9 dark portal palette while preserving the Phase 8 "light report card inside dark frame" pattern documented in 09-PATTERNS.md §10.
2. `src/lib/pdf/` (14 components, ~2000 lines) — `@react-pdf/renderer`-based exported PDF report. Owns its own token files (`colors.ts`, `styles.ts`). Must align with the Phase 8 print-safe variant of the new brand system (cream surface, navy text, gold-brand accents — same hues used in the in-app light report card, just rendered to PDF). The PDF is print-medium, so we keep light surfaces (no dark theme in PDF — paper is light).

**Out of scope:**
- Functional changes to data flow, rating math, or PDF layout structure
- Refactoring the Section 11 component into smaller pieces (deferred — pure brand work)
- Adding new sections, charts, or insights
- Modifying the @react-pdf/renderer dependency or migration approach

</domain>

<decisions>
## Implementation Decisions

### Section 11 (in-app) approach
- **Locked: Phase 8 pattern.** Section 11 renders as a light report card inside the dark portal frame. The card itself uses cream/navy/gold-brand (the Phase 8 light variant of the brand system), NOT the dark portal palette. This matches the in-portal report at `/portal/assessment/[id]/report/page.tsx` which already implements this pattern correctly per 09-PATTERNS.md §10.
- **Sweep target:** Replace all legacy palette literals — `#1a365d` (navy), `#F5A623` (legacy gold), `text-white`, `bg-white`, `border-gray-*` light tokens, `bg-blue-*`/`bg-yellow-*` — with the new brand system's print-safe tokens. Where Section 11 uses Tailwind classes, swap to the Phase 8 report tokens (likely `bg-paper`, `text-ink`, `text-gold-brand`, `border-line-light`, etc. — planner to confirm exact token names from existing Phase 8 work).
- **No tier-pill changes:** The 5-tier rating palette (poor/cautious/normal/great/elite) on the report card remains as Phase 8 set it (light-surface 50-tier pills). REVIEW WR-05 explicitly scopes the dark-surface tier-pill swap to portal client detail/trends, not the report card.

### PDF approach
- **Locked: Update PDF colors.ts + styles.ts at the source.** PDF has a centralized token file. Swap the legacy navy/gold/white values to the Phase 8 print-safe palette in one pass; per-component edits should be limited to literals that bypassed the token file.
- **Locked: Keep PDF surface light.** PDF is a print medium. Dark theme does not apply. Use the same cream/navy/gold-brand language as the in-app report card so the PDF and on-screen report feel like the same artefact.
- **Acceptance:** Visual diff (render before + after, eyeball) shows consistent brand language between the in-app report card (`/portal/.../report/page.tsx`) and the exported PDF.

### Plan splitting
- **Two plans recommended:** 10-01 Section 11 in-app; 10-02 PDF renderer. Section 11 is the hot user-facing complaint and should ship first; PDF is downstream of the report card decisions but can land independently.

### Claude's Discretion
- Token names (`bg-paper`, `text-ink`, etc.) — planner reads existing Phase 8 surfaces and confirms exact token names; if no canonical print-safe token set exists, planner proposes one and adds to `globals.css` + `colors.ts`.
- Whether Section 11 should consume the same React components used by `/portal/.../report/page.tsx` (DRY refactor) or stay as a standalone component. Default: keep separate, minimum-touch brand swap; flag any natural DRY win during planning but don't expand scope.
- PDF font choices — if @react-pdf/renderer needs fonts registered for the new brand wordmark (Inter Tight + JetBrains Mono per 09-CONTEXT.md), planner handles registration. Otherwise leave existing font stack.

</decisions>

<specifics>
## Specific Ideas

- **Reference implementations already in repo:**
  - `/portal/assessment/[id]/report/page.tsx` (Phase 8 light report card inside dark portal frame) — token source of truth for the in-app light variant
  - `09-PATTERNS.md` §10 ("Phase 8 report card inside dark portal frame") — the documented pattern
  - `src/components/report/*` (Phase 8 components) — proven Phase 8 light-surface implementations
- **Brand assets:** Logo at `/landing/peak360-logo.png` (silver+gold wordmark) — should appear consistently on both Section 11 header and PDF cover page if applicable.
- **Verification heuristic:** After fixes, `grep -rEn "#1a365d|#F5A623|text-white|bg-white" src/components/sections/Section11.tsx src/lib/pdf/` should return zero matches outside justified exceptions (PDF SVG strokes for chart axes, etc.).

</specifics>

<canonical_refs>
## Canonical References

- `.planning/phases/09-brand-language-alignment-across-portal-dashboard-assessment-/09-PATTERNS.md` (§6, §7, §10 — light report card inside dark frame)
- `.planning/phases/09-brand-language-alignment-across-portal-dashboard-assessment-/09-CONTEXT.md` (brand token vocabulary)
- `.planning/phases/09-brand-language-alignment-across-portal-dashboard-assessment-/09-UI-SPEC.md` (Phase 9 design contract)
- `.planning/phases/08-client-report-design-refresh/` (Phase 8 light report card precedent)
- `src/app/globals.css` (`@theme inline` token definitions)
- `src/lib/pdf/colors.ts` + `src/lib/pdf/styles.ts` (PDF token files)

</canonical_refs>
