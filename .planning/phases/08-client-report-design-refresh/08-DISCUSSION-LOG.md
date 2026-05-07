# Phase 8: Client report design refresh — Discussion Log

**Date:** 2026-05-07
**Format:** User-prompt driven; structured questions used to resolve codebase ambiguities only.

This is a human-readable audit log. Downstream agents (researcher, planner, executor) consume `08-CONTEXT.md`, not this file.

---

## Round 1 — User-supplied design prompt

The user pasted a comprehensive design prompt covering the Peak Living product positioning, the five-pillar traffic-light requirement, and the modal interaction pattern. The full text is preserved verbatim in the `<specifics>` section of `08-CONTEXT.md` as the source of truth.

Key direction captured:
- Peak Living framing (Long Living → Healthy Living → Peak Living; top 10% for age; 40+ business owners).
- Five pillars: Cardiometabolic, Body Composition, Strength, Balance, VO2 / Fitness Capacity. Questionnaires fold into interpretation, not a 6th pillar.
- Traffic-light status (red/amber/green) + score /100 prominently on each card.
- Click → modal drill-down with explanation, results, doing-well, needs-attention, sub-scores, prescription/recommendation.
- Premium, modern, clean, mobile-first.
- PDF version mirrors the cards (no modal).

The user said "Please implement this now." Per CLAUDE.md GSD-workflow enforcement, this captures decisions only — implementation runs through plan-phase → execute-phase.

## Round 2 — Codebase-ambiguity questions

Four ambiguities the codebase forced (I asked because downstream agents would otherwise guess):

| # | Question | User answer |
|---|---|---|
| 1 | What surface is "Page 10" — portal, PDF, or both? | **Portal + PDF mirrored** |
| 2 | How is pillar score (0–99) computed? | **Tier-rollup placeholder** (defensible, no invented clinical logic) |
| 3 | Where do prescriptions come from? | (Initially) **Placeholder integration point only** — superseded in Round 3 |
| 4 | How do existing categories map to the five pillars? | **My proposed mapping** (Cardiometabolic = Lipid + Glucose & Metabolic + Inflammation + BP; Body Composition clean; Strength clean; Balance = balance-subset of Mobility & Flexibility; VO2 = Cardiovascular Fitness ex-BP; supporting markers shown in Cardiometabolic modal under "Supporting markers") |

## Round 3 — Mid-discussion scope expansion

The user added: **"The definitions and the consultant recommendations should all be available within the admin area only to administrators."**

This lifted both pillar definitions and per-assessment recommendations from "placeholder" / "hardcoded" to "real admin-authored data". I asked two clarifying questions:

| # | Question | User answer |
|---|---|---|
| 5 | Where do pillar definitions live? | **Global — same for every client.** One canonical set, edited at `/portal/admin/pillars`. All clients see the same wording. |
| 6 | Recommendation scope and editor? | **Per-assessment, admin-only edit, all roles read.** New `pillar_prescriptions` table keyed `(assessment_id, pillar_key)`. RBAC: admin-only writes. |

Captured as decisions D-12..D-25 and new "Admin authoring" scope additions in `08-CONTEXT.md`.

---

## Areas explored

| Area | Status | Where captured |
|---|---|---|
| Surface (portal vs PDF) | Locked | D-01, D-19, D-26 |
| Five-pillar model + category mapping | Locked | D-04, D-05, D-06, D-07 |
| Pillar score formula | Locked | D-08, D-09 |
| Traffic-light thresholds | Locked | D-10, D-11 |
| Per-assessment recommendation data model | Locked | D-12, D-13, D-14, D-15, D-16 |
| Global pillar definitions data model | Locked | D-17, D-18, D-19, D-20, D-21 |
| Portal UX (modal, mobile, sort order) | Locked | D-22, D-23, D-24, D-25 |
| PDF mirror | Locked | D-26, D-27, D-28 |
| Visual / brand | Locked | D-29, D-30 |

## Claude's discretion (planner / UI-spec free to refine)

- Exact pillar card visual treatment (shadow, radius, score typography size).
- Animation / micro-interactions on card open (within "premium not gimmicky").
- Storage shape choice for `pillar_page_copy` (single-row table vs sentinel row in `pillar_definitions`).
- Inline-edit form pattern for the admin pillar-prescriptions page (5 forms one save vs save-each).
- Whether to introduce a headless-dialog primitive (e.g., Radix Dialog) or hand-roll a single-purpose modal with focus-trap.

## Deferred ideas

Captured in `08-CONTEXT.md` `<deferred>` section. Highlights:

- Coach (non-admin) authoring of recommendations.
- Recommendation template library.
- Configurable thresholds / score weighting / definitions versioning.
- Trend sparkline on pillar cards.

## Scope creep redirected

None this round — the user's prompt was tightly scoped, and the mid-stream addition (admin authoring) was a direct expansion of the same surface, not a new capability.

---

*Phase: 8-client-report-design-refresh*
*Discussion gathered: 2026-05-07*
