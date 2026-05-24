---
phase: quick-260524-hua
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/ui/ValdResultCard.tsx
  - src/components/sections/Section8.tsx
autonomous: true
requirements:
  - HUA-01  # CMJ: single jump height (not L/R) + Modified RSI
  - HUA-02  # IMTP: computed Max Force Asymmetry %
  - HUA-03  # Rename Single Leg Hop -> SL Jump; L/R jump height + L/R Modified RSI
  - HUA-04  # Surface the new metrics in the result cards
must_haves:
  truths:
    - "CMJ records a single Jump Height (cm), not Left/Right, plus a Modified RSI value"
    - "The CMJ result card shows the jump height and Modified RSI as a secondary stat"
    - "IMTP result card shows a computed Max Force Asymmetry % derived from Left/Right max force"
    - "The Single Leg Hop test is renamed 'SL Jump' (input section heading and result card title)"
    - "SL Jump records Left/Right Jump Height (cm) and Left/Right Modified RSI"
    - "The SL Jump result card shows the L/R jump height and a second L/R row for Modified RSI"
  artifacts:
    - path: "src/components/ui/ValdResultCard.tsx"
      provides: "Secondary L/R metric row + computed asymmetry % display"
      contains: "secondaryLeft"
    - path: "src/components/sections/Section8.tsx"
      provides: "Updated CMJ / IMTP / SL Jump inputs + card wiring"
      contains: "cmjJumpHeight"
  key_links:
    - from: "src/components/sections/Section8.tsx"
      to: "ValdResultCard"
      via: "passes new props (singleValue, secondary L/R, showAsymmetryPercent)"
      pattern: "ValdResultCard"
---

# Quick 260524-hua — Strength testing (Section 8) metric changes

## Background

`src/components/sections/Section8.tsx` is a VALD-style section. Each test has
free-form inputs (left) bound to `data.<key>` via `onChange`, and a
`ValdResultCard` (right). Fields persist in the section JSON blob — there is NO
strict TypeScript interface gating them (the `StrengthTesting` interface in
`src/types/assessment.ts` is stale/unused for these and does NOT need editing).
None of these feed the report/normative ratings.

`ValdResultCard` (`src/components/ui/ValdResultCard.tsx`) today supports:
- `left`/`right` → L/R split with an `AsymmetryGraph`
- `singleValue` → one big number
- `secondaryLabel`/`secondaryValue`/`secondaryUnit` → ONE extra stat, but only
  rendered in the single-value (`hasSingle`-only) branch
- combined branch (`hasLR && hasSingle`) → big number + L/R split + graph

## Locked decisions (from user)

- IMTP "Max Force Asymmetry %" is **computed** from Left/Right (`|L−R| / max × 100`), shown **read-only** — NOT a typed input.
- New metrics are **shown in the result cards**.
- CMJ jump height becomes a **single** value; CMJ Modified RSI is a single value.
- SL Jump keeps **L/R** jump height and adds **L/R** Modified RSI (mirrors jump height).
- Modified RSI is a unitless ratio (no unit suffix). Use `step={0.01}` inputs.

## Tasks

### Task 1 — Extend `ValdResultCard` for a second L/R metric + computed asymmetry %

**File:** `src/components/ui/ValdResultCard.tsx`

**Action:** Add optional props (all backward-compatible — existing call sites unaffected when omitted):
- `secondaryLeft?: number | null`
- `secondaryRight?: number | null`
- `secondaryMetric?: string`   // label for the secondary L/R row, e.g. "Modified RSI"
- `showAsymmetryPercent?: boolean`  // when true, render the computed Max Force Asymmetry %

Rendering:
1. **Secondary L/R row:** In the `hasLR` (L/R-only) branch, when `secondaryLeft`/`secondaryRight` are present (non-null), render a second compact Left/Right row beneath the primary one, labeled `secondaryMetric`. Reuse the existing blue(Left)/amber(Right) styling but smaller (e.g. text-lg) so it reads as secondary. No second asymmetry graph needed.
2. **Computed asymmetry %:** Add a small helper `asymmetryPct(l, r) = max>0 ? Math.abs(l-r)/max*100 : 0`. When `showAsymmetryPercent` is true AND both `left`/`right` are present, render a labeled stat "Max Force Asymmetry" with the value formatted to 1 decimal + "%". Place it sensibly in the combined branch (near the L/R values / asymmetry graph) and/or the L/R branch. Keep it subtle (mono eyebrow label + tabular-nums value), on-brand tokens.
3. Do not break the existing `secondaryLabel`/`secondaryValue` single-stat path (CMJ Modified RSI and Farmers Carry use it).

**Verify:** `npx tsc --noEmit` clean for the file; `npx eslint src/components/ui/ValdResultCard.tsx` clean.

### Task 2 — Update Section 8 CMJ, IMTP, and SL Jump

**File:** `src/components/sections/Section8.tsx`

**2a. Countermovement Jump (test 2):**
- Replace the two inputs `cmjLeft`/`cmjRight` with:
  - `cmjJumpHeight` — "Jump Height (cm)", `step={0.1}`
  - `cmjModifiedRsi` — "Modified RSI", `step={0.01}`
- Card: `<ValdResultCard title="Countermovement Jump" category="Jump" metric="Jump height" unit="cm" isForceDecks singleValue={data.cmjJumpHeight as number} secondaryLabel="Modified RSI" secondaryValue={data.cmjModifiedRsi as number} secondaryUnit="" date={assessmentDate} />`
  (single-value branch already renders the secondary stat.)

**2b. Isometric Mid-Thigh Pull (test 3):**
- Inputs unchanged (`imtpMaxForce`, `imtpLeft`, `imtpRight`).
- Card: add `showAsymmetryPercent` so the computed Max Force Asymmetry % renders. Keep existing `singleValue={imtpMaxForce}` + `left`/`right`.

**2c. Single Leg Hop → "SL Jump" (test 4):**
- Rename `TestRow` title from "Single Leg Hop Test" to "SL Jump".
- Keep the L/R jump-height inputs but relabel: `singleLegHopLeft` → label "Left Jump Height (cm)", `singleLegHopRight` → "Right Jump Height (cm)" (KEEP the existing data keys to preserve any saved values).
- Add two Modified RSI inputs: `singleLegHopRsiLeft` ("Left Modified RSI", step 0.01) and `singleLegHopRsiRight` ("Right Modified RSI", step 0.01).
- Card: `title="SL Jump"`, `metric="Jump height"` (you may drop the "Top 3 hops" subtitle or keep it — keep `unit="cm"`), pass `left={singleLegHopLeft}` `right={singleLegHopRight}` AND `secondaryLeft={singleLegHopRsiLeft}` `secondaryRight={singleLegHopRsiRight}` `secondaryMetric="Modified RSI"`.

**Verify:** `npx tsc --noEmit` clean; `npx eslint src/components/sections/Section8.tsx` clean.

**Done when:** CMJ shows one jump-height number + Modified RSI; IMTP card shows a computed asymmetry %; the test is named "SL Jump" with L/R jump height + L/R Modified RSI, all visible in the result cards.

## Out of scope

- No normative thresholds / report-marker changes (these metrics aren't rated).
- No DB/schema migration (JSON blob). The stale `StrengthTesting` interface is left as-is.
- Orphaned dev data in `cmjLeft`/`cmjRight` from the old two-field CMJ is acceptable (dev only).

## Conventions

Follow `CLAUDE.md`: `'use client'`, `@/` imports, camelCase field keys, navy/gold
Tailwind tokens (`text-text`, `text-text-faint`, `text-blue-500`/`text-amber-500`
for L/R, `tabular-nums`, mono eyebrow labels). Match the existing card's visual
language.
