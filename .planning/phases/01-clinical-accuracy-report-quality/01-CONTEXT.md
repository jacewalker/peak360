# Phase 1: Clinical Accuracy & Report Quality - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix gender-specific blood marker ratings and enhance the Section 11 report with visual range bars, referral flags, actionable recommendations, and a medical disclaimer. No infrastructure changes (no auth, no DB migration, no new routes). Pure data layer extension and report component enhancement.

</domain>

<decisions>
## Implementation Decisions

### Range Bar Design
- **D-01:** Use horizontal segmented bars (lab report style) showing the value's position across all 5 tiers (poor → elite). Each tier segment is color-coded using existing TIER_COLORS/TIER_BG_STRONG. A marker/needle indicates where the actual value falls.
- **D-02:** Use Recharts (already installed at 3.8.0) or pure CSS/SVG for the bars — whichever produces cleaner output in both screen and PDF export. Researcher should evaluate both approaches for print fidelity.

### Recommendation Depth
- **D-03:** Recommendations should be specific: include supplement names and general dosage ranges (e.g., "Consider Vitamin D3 supplementation 2000-4000 IU/day") for poor/cautious tier markers.
- **D-04:** Lifestyle/dietary suggestions for cautious tier (e.g., "Increase iron-rich foods: red meat, spinach, legumes").
- **D-05:** All recommendations clearly marked as guidance, not medical advice. Every recommendation section prefixed with context like "Based on normative ranges, consider discussing with your healthcare provider."

### Referral Flag Levels
- **D-06:** Two severity levels for referral flags:
  - **Monitor** — cautious-tier markers that are borderline; shown as amber indicator with text like "Monitor — retest in 3-6 months"
  - **Urgent Referral** — poor-tier markers that are critically out of range; shown as red flag with text like "Refer to GP for further investigation"
- **D-07:** Referral flags should be visually prominent — not hidden in small text. Use the existing TIER_COLORS red/amber scheme for consistency.

### Gender Handling
- **D-08:** Use "Biological Sex" as the label in the report and rating engine, not "Gender". Clinical normative ranges are based on biological sex.
- **D-09:** Male/Female are the two options for normative range selection. The existing `clientGender` field from Section 1 maps to this.
- **D-10:** Include a brief UI note in the report: "Normative ranges are based on biological sex reference data."
- **D-11:** If biological sex is not specified (empty/null), fall back to unisex ranges (existing SimpleMarker behavior) rather than erroring.

### Claude's Discretion
- Specific Recharts component choice vs pure CSS/SVG for range bars — pick whichever renders best in both screen and PDF
- Exact wording of disclaimer text — should be professionally written but not overly legal
- Which specific blood markers get gender-specific ranges — follow clinical reference standards (WHO, pathology references)
- Layout positioning of range bars relative to existing tier badges in Section 11

### Folded Todos
- **Report marker range visualization and recommendations** — directly maps to REPT-01 through REPT-05
- **Gender-based blood marker normative ranges** — directly maps to CLIN-01 through CLIN-04

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Normative System
- `src/lib/normative/data.ts` — Current hardcoded normative thresholds; blood_tests section needs gender extension
- `src/lib/normative/ratings.ts` — Rating engine; getPeak360Rating needs gender parameter
- `src/lib/normative/insights.ts` — Insight generation; needs recommendation and referral flag content
- `src/types/normative.ts` — Type definitions; GenderedMarker/GenderedAgeMarker already exist, blood_tests type needs updating

### Report
- `src/components/sections/Section11.tsx` — Report component; range bars, referral flags, recommendations, disclaimer go here

### Client Info
- `src/components/sections/Section1.tsx` — clientGender field source; must propagate to Section 11

### Research
- `.planning/research/FEATURES.md` — Feature landscape and table stakes analysis
- `.planning/research/PITFALLS.md` — Gender range fallback logic pitfall, visualization pitfalls
- `.planning/research/ARCHITECTURE.md` — Build order rationale

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GenderedMarker` type: `{ unit, note?, male: TierRanges, female: TierRanges }` — ready to use for blood markers
- `GenderedAgeMarker` type: `{ unit, note?, male: Record<string, TierRanges>, female: Record<string, TierRanges> }` — for age+gender combined
- `TIER_COLORS`, `TIER_BG_STRONG`, `TIER_BORDER`, `TIER_LABELS` — complete color/label system for 5 tiers
- Recharts 3.8.0 — already installed, available for bar visualizations
- `normalizeRating()` — maps raw labels to tier enum
- `resolveRawLabel()` — matches value against tier min/max ranges

### Established Patterns
- `body_comp.body_fat_percent` uses `GenderedAgeMarker` — exact pattern needed for blood markers
- `body_comp.waist_to_hip` uses `GenderedMarker` — simpler gender-only pattern
- `strength` section mixes `SimpleMarker | GenderedMarker | GenderedAgeMarker` — precedent for mixed types in a category
- Rating engine resolves tiers by iterating `['poor', 'cautious', 'normal', 'great', 'elite']` and checking `value >= range.min && value <= range.max`

### Integration Points
- `blood_tests` type in `NormativeData` must change from `Record<string, SimpleMarker>` to `Record<string, SimpleMarker | GenderedMarker | GenderedAgeMarker>`
- `getPeak360Rating()` must accept optional `gender` parameter
- Section 11 REPORT_MARKERS array determines which markers appear in report — range bars integrate here
- PDF export via jsPDF + html2canvas-pro — range bars must render correctly in PDF

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard clinical lab report approaches for visualization and evidence-based supplementation guidance.

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- **Admin panel for normative range and risk threshold management** — Phase 3 scope, not relevant to Phase 1
- **Client portal with auth, data encryption, and backups** — Phase 2/4 scope

</deferred>

---

*Phase: 01-clinical-accuracy-report-quality*
*Context gathered: 2026-03-29*
