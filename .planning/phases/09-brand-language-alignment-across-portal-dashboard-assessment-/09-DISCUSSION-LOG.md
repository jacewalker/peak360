# Phase 9: Brand-language alignment across portal, dashboard, assessment, and client surfaces - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `09-CONTEXT.md` — this log preserves the alternatives considered.

**Date:** 2026-05-12
**Phase:** 09-brand-language-alignment-across-portal-dashboard-assessment-
**Mode:** `--auto` (autonomous, single-pass, recommended option chosen for every gray area; no user prompts)
**Areas discussed:** Plan slicing, Token migration strategy, Theme gating boundary, Sequencing within 09-01, Sequencing within 09-02, Phase 8 report-frame edge, Section 1–11 sweep strategy, Verification strategy, Anti-pattern guardrails

---

## Context loading (pre-discussion)

- **PROJECT.md**: read — Peak360 Milestone 1; coaches deliver gender-aware health assessments.
- **STATE.md**: read — current focus Phase 09; Phase 9 lock-in (2026-05-10): "dark across all surfaces; 2 fat plans (09-01 foundations+auth, 09-02 working surfaces)."
- **ROADMAP.md §Phase 9**: read — phase entry confirmed.
- **09-UI-SPEC.md**: read — approved 2026-05-12, sovereign visual contract for this phase (tokens, typography 11/13/20/40, spacing {4..64}, copywriting, components inventory, 10-item acceptance heuristic).
- **08-CONTEXT.md**: skimmed — Phase 8 pillar contract (D-01..D-30) is sovereign on `/portal/assessment/[id]/report`; Phase 9 may only touch the frame.
- **Codebase scout**: `src/app/portal/{layout.tsx, page.tsx, admin/, clients/, assessments/, assessment/}`, `src/app/login/{layout.tsx, page.tsx}`, `src/app/reset-password/page.tsx` (no layout.tsx — must be created), `src/components/layout/{Sidebar, Header, ProgressBar, NavigationButtons, AdminPanel, AppShell}.tsx`, `src/components/forms/*`, `src/components/sections/Section{1..11}.tsx`, `src/components/ui/Dialog.tsx`, `src/app/landing.css` (.v2-root tokens), `src/app/globals.css`.

---

## Plan Slicing

| Option | Description | Selected |
|--------|-------------|----------|
| 2 fat plans (foundations+auth / working surfaces) | Honors STATE.md roadmap lock from 2026-05-10. Foundations land tokens + chrome + auth heroes; working surfaces consumes the themed shell. | ✓ |
| Per-surface micro-plans (login, dashboard, clients, admin, sections separately) | Higher commit granularity, but token-driven changes don't de-risk per-surface; would create busywork. | |
| 3 plans (foundations / auth + chrome / working surfaces) | Marginal de-risking; not requested by roadmap lock. | |

**Selected option:** 2 fat plans
**Rationale:** Roadmap lock is explicit. Token-driven restyle means working-surface deltas are utility-class swaps; splitting per page adds friction without lowering risk.

---

## Token Migration Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Additive (new tokens alongside legacy; rebind `--font-sans` only) | Matches UI-SPEC §Token-rename discipline. Phase 5 PDF + Phase 8 report continue resolving legacy tokens. | ✓ |
| Replace (overwrite `--color-navy` / `--color-gold` to new values) | Would break Phase 5 PDF + Phase 8 report shell. | |
| Scoped (use `.theme-dark` to override token resolution) | Adds runtime cost + selector specificity drift. | |

**Selected option:** Additive
**Rationale:** Phase 8 + Phase 5 contracts must remain sovereign; non-destructive token addition is the only safe path.

---

## Theme Gating Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Per route-segment layout (`portal`, `login`, `reset-password`, `assessment/[id]`) wraps in `theme-dark` | Isolates Phase 8 report inside dark portal wrapper while letting the report apply its own light frame. | ✓ |
| Root `<body>` hard-sets dark | Forces Phase 8 report to fight the body background. | |
| Per-page `theme-dark` wrapper | Repetitive; layouts already exist. | |

**Selected option:** Per route-segment layout
**Rationale:** Layouts already exist; one new layout (`reset-password/layout.tsx`) pattern-matches `login/layout.tsx`. Phase 8 report page applies its own light wrapper inside the dark portal wrapper — mirrors existing report shell pattern.

---

## Sequencing Within 09-01 (Foundations)

| Step order | Description | Selected |
|------------|-------------|----------|
| tokens → fonts → segment layouts → chrome → auth pages | Each step compiles cleanly against the prior. Auth heroes land last so they show the finished chrome. | ✓ |
| auth pages first | Skips foundation; would require workaround styles. | |

**Selected option:** Bottom-up foundations
**Rationale:** Each step's dependency is the previous step. Auth pages depend on hero scaffold + tokens + fonts.

---

## Sequencing Within 09-02 (Working Surfaces)

| Step order | Description | Selected |
|------------|-------------|----------|
| Forms → section headings → Dialog → Toast → dashboard → clients → assessments → admin → report-frame | Form-level change propagates to 11 sections automatically; admin/last because volume; report-frame last as the most boundary-sensitive change. | ✓ |
| Page-by-page (dashboard first, then everything else inline) | Slower; misses the leverage of central form-component restyle. | |

**Selected option:** Component-leverage-first
**Rationale:** Form components are the biggest leverage point — restyling them once restyles the assessment form across all 11 sections. The report-frame edge is last because it requires the most precision (not touching Phase 8 internals).

---

## Phase 8 Report-Frame Edge

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal: only outer page bg + portal top brand strip; report card untouched | Honors Phase 8 sovereignty per 09-UI-SPEC.md §Out-of-scope. | ✓ |
| Aggressive: restyle pillar cards to align with dark surfaces | Would violate Phase 8 contract D-01..D-30. | |
| None: skip report route entirely | UI-SPEC explicitly calls out the frame around the card so the dashboard→report transition feels coherent. | |

**Selected option:** Minimal
**Rationale:** UI-SPEC §Out-of-scope is explicit on what may and may not be touched.

---

## Section 1–11 Sweep Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Centralised at form-component layer + single mono-eyebrow injection per Section{N}.tsx | Visual delta inside each section body is near-zero; only the heading wrapper changes. | ✓ |
| Per-section bespoke restyle | Unnecessary repetition; no per-section design variance is required. | |

**Selected option:** Centralised + single per-section heading edit
**Rationale:** Form components are the lever; section bodies inherit automatically.

---

## Verification Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| UI-SPEC §Acceptance Heuristics (10-item checklist) + `npm run build` per plan | Matches `gsd-ui-checker` / `gsd-ui-auditor` rubric; deterministic. | ✓ |
| Automated visual regression suite (Playwright snapshots) | Out of scope for Phase 9; would need its own phase. | |
| Per-page screenshot review only | Misses token/scale audits. | |

**Selected option:** UI-SPEC heuristics + build
**Rationale:** The contract is the rubric. UI-checker pass required before commit; build catches compile-time token-resolution issues.

---

## Anti-Pattern Guardrails

| Guardrail | Selected |
|-----------|----------|
| No light/dark theme toggle introduced | ✓ |
| No bright legacy `--color-gold` (`#F5A623`) on Phase 9 surfaces | ✓ |
| Cream (`#ece5d3`) is text-only; never a card surface | ✓ |
| Status colours (sage / coral) are status-only; not decorative | ✓ |
| Spacing values constrained to `{4, 8, 16, 24, 32, 48, 64}` + the inline `96px` hero margin | ✓ |
| Font sizes constrained to `{11, 13, 20, 40}` + mobile downscale `32` | ✓ |

**All guardrails captured in CONTEXT.md D-13..D-18.**

---

## Cross-reference todos

| Todo | Score | Decision |
|------|-------|----------|
| Admin reassign clients/assessments between coaches | 0.4 | **Reviewed, not folded** — functional feature; belongs in future auth/admin phase. Keyword match incidental. |
| Add password reset, account management, and admin invitations | 0.2 | **Reviewed, not folded** — password reset already in place (Phase 7); the rest is functional auth work. |

`--auto` rule says "fold ≥ 0.4" but applied judgment: neither todo fits a brand-language alignment scope. Both recorded in CONTEXT.md §Deferred Ideas → Reviewed Todos so future phases see they were considered.

---

## Claude's Discretion

- Exact tailwind utility names for the new tokens (`text-bg`, `bg-bg-3`, etc.) — planner picks names consistent with `@theme inline` convention.
- Focus-ring as CSS utility vs inline boxShadow on form components — planner picks based on form-component API fit.
- Whether to lift the mono eyebrow into a `<MonoEyebrow>` primitive — yes if >3 usages, no otherwise.

## Deferred Ideas

- Light/dark theme switch (Phase 9 explicitly does not introduce a toggle).
- Landing-page redesign feedback — capture in a separate phase if discovered during QA.
- Recommendation template library (deferred from Phase 8; still deferred).
- Mobile-only behaviours beyond UI-SPEC §Layout.
