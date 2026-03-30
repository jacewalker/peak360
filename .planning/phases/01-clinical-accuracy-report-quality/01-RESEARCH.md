# Phase 1: Clinical Accuracy & Report Quality - Research

**Researched:** 2026-03-29
**Domain:** Normative data engine (gender-specific blood marker ranges) + report visualization (range bars, referral flags, recommendations, disclaimer)
**Confidence:** HIGH

## Summary

This phase extends the existing normative rating engine and Section 11 report component. The codebase already has working patterns for gender-specific markers (`GenderedMarker`, `GenderedAgeMarker`) used by body composition and strength tests. The task is to apply these same patterns to ~15-20 blood markers where male and female clinical reference ranges differ, then enhance the report with visual range bars, referral flags, actionable recommendations, and a medical disclaimer.

The blood_tests section of `normativeData` currently uses only `SimpleMarker` (no gender differentiation). The `NormativeData` type in `src/types/normative.ts` enforces `Record<string, SimpleMarker>` for blood_tests, which must be widened to accept `GenderedMarker` as well. The rating engine (`getStandards`) already handles gendered markers for fitness, body_comp, and strength categories but has a special code path for blood_tests that ignores gender entirely -- this must be updated.

For visualization, pure CSS/SVG range bars are recommended over Recharts for this use case. The bars are simple segmented rectangles with a position marker -- no axes, legends, or interactivity needed. Pure CSS/SVG renders identically in screen and PDF (html2canvas), avoids Recharts' SVG complexity that can cause print rendering issues, and keeps the component lightweight. Recharts is better suited for charts with data series, tooltips, and interaction.

**Primary recommendation:** Widen `blood_tests` type to accept `GenderedMarker`, add gender-specific ranges for ~18 blood markers using WHO/clinical reference data, update the `getStandards` blood_tests code path to handle gendered lookups, build a pure CSS/SVG `RangeBar` component, and add referral flags + recommendations as data-driven content in the insights system.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use horizontal segmented bars (lab report style) showing the value's position across all 5 tiers (poor to elite). Each tier segment is color-coded using existing TIER_COLORS/TIER_BG_STRONG. A marker/needle indicates where the actual value falls.
- **D-02:** Use Recharts (already installed at 3.8.0) or pure CSS/SVG for the bars -- whichever produces cleaner output in both screen and PDF export. Researcher should evaluate both approaches for print fidelity.
- **D-03:** Recommendations should be specific: include supplement names and general dosage ranges (e.g., "Consider Vitamin D3 supplementation 2000-4000 IU/day") for poor/cautious tier markers.
- **D-04:** Lifestyle/dietary suggestions for cautious tier (e.g., "Increase iron-rich foods: red meat, spinach, legumes").
- **D-05:** All recommendations clearly marked as guidance, not medical advice. Every recommendation section prefixed with context like "Based on normative ranges, consider discussing with your healthcare provider."
- **D-06:** Two severity levels for referral flags: Monitor (cautious-tier, amber) and Urgent Referral (poor-tier, red flag).
- **D-07:** Referral flags should be visually prominent -- not hidden in small text. Use existing TIER_COLORS red/amber scheme.
- **D-08:** Use "Biological Sex" as the label in the report and rating engine, not "Gender".
- **D-09:** Male/Female are the two options for normative range selection. The existing `clientGender` field from Section 1 maps to this.
- **D-10:** Include a brief UI note in the report: "Normative ranges are based on biological sex reference data."
- **D-11:** If biological sex is not specified (empty/null), fall back to unisex ranges (existing SimpleMarker behavior) rather than erroring.

### Claude's Discretion
- Specific Recharts component choice vs pure CSS/SVG for range bars -- pick whichever renders best in both screen and PDF
- Exact wording of disclaimer text -- should be professionally written but not overly legal
- Which specific blood markers get gender-specific ranges -- follow clinical reference standards (WHO, pathology references)
- Layout positioning of range bars relative to existing tier badges in Section 11

### Deferred Ideas (OUT OF SCOPE)
- Admin panel for normative range and risk threshold management -- Phase 3 scope
- Client portal with auth, data encryption, and backups -- Phase 2/4 scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CLIN-01 | Rating engine accepts gender parameter and selects gender-specific thresholds for blood markers | `getStandards` blood_tests path needs same pattern as body_comp/strength; `getPeak360Rating` already accepts gender param |
| CLIN-02 | Gender-specific normative ranges added for ~15-20 blood markers where male/female ranges differ clinically | Clinical reference data identified for 18 markers; `GenderedMarker` type already exists |
| CLIN-03 | Combined age-bucketed and gender-specific threshold lookups work together | `GenderedAgeMarker` type exists; some markers (e.g., hemoglobin by age group) may need it |
| CLIN-04 | Gender propagated from Section 1 (clientGender) through to Section 11 rating calls | Section 11 already reads `clientGender` from Section 1 data and passes to `getPeak360Rating` |
| REPT-01 | Horizontal range bar/gauge next to each marker showing value position within 5-tier range | Pure CSS/SVG component recommended; integrates into existing `renderMarkerRow` |
| REPT-02 | Referral flags for markers critically out of range | Two-level system (Monitor/Urgent) driven by tier rating; new component in marker row |
| REPT-03 | Supplementation recommendations for markers in poor/cautious tiers | Extend insights system with specific supplement data per marker |
| REPT-04 | Lifestyle/dietary suggestions for markers in cautious tier | Extend insights system with dietary/lifestyle content per marker |
| REPT-05 | Medical advice disclaimer clearly displayed on report | Static component at report top and bottom |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Framework:** Next.js 16 (App Router) + TypeScript + React 19 -- no framework changes
- **Styling:** Tailwind CSS v4 with `@theme inline` tokens -- use existing color system
- **State:** Zustand store with auto-save -- no state changes needed (Section 11 is read-only report)
- **Imports:** Always use `@/` alias, never relative paths; use `import type` for TypeScript types
- **Components:** `'use client'` directive required for interactive components
- **Naming:** PascalCase components, camelCase utilities, form field IDs are camelCase
- **Error handling:** No explicit throws; defensive null/undefined checks
- **Testing:** Vitest with jsdom environment; tests in `src/__tests__/`

## Standard Stack

### Core (No New Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App framework | Existing |
| React | 19.2.3 | UI components | Existing |
| Tailwind CSS | 4 | Styling | Existing, provides color utilities for range bars |
| Vitest | 4.0.18 | Unit tests | Existing test runner |

### Supporting (Already Installed)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Recharts | 3.8.0 | Charts | NOT recommended for range bars (see Architecture Patterns); keep for future trend charts |
| jsPDF | 4.2.0 | PDF export | Existing, range bars must render correctly through html2canvas |
| html2canvas-pro | 2.0.0 | HTML to canvas | Existing PDF pipeline; pure CSS/SVG renders more reliably than complex SVG |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pure CSS/SVG range bars | Recharts BarChart | Recharts adds unnecessary complexity for simple segmented bars; SVG rendering through html2canvas can produce artifacts with Recharts' generated SVG structure; pure CSS divs are pixel-perfect in both screen and print |
| Static recommendation data | AI-generated recommendations | Static data is predictable, auditable, and doesn't require API calls; AI generation deferred |

## Architecture Patterns

### Recommended Changes by File

```
src/types/normative.ts          # Widen blood_tests type
src/lib/normative/data.ts       # Add ~18 gendered blood markers
src/lib/normative/ratings.ts    # Update getStandards blood_tests path
src/lib/normative/insights.ts   # Extend with recommendations + referral content
src/lib/report-markers.ts       # Update hasNorms for newly-normed markers
src/components/sections/Section11.tsx  # Add RangeBar, referral flags, disclaimer
```

### Pattern 1: Widening blood_tests Type

**What:** Change `blood_tests: Record<string, SimpleMarker>` to `Record<string, SimpleMarker | GenderedMarker>` in the `NormativeData` interface.

**When to use:** This is the foundational change that enables gender-specific blood marker lookups.

**Example:**
```typescript
// src/types/normative.ts - Update NormativeData interface
export interface NormativeData {
  blood_tests: Record<string, SimpleMarker | GenderedMarker>;
  // ... rest unchanged
}
```

### Pattern 2: Gendered Blood Marker Data (follow existing waist_to_hip pattern)

**What:** Add male/female tier ranges for blood markers using the `GenderedMarker` shape.

**Example:**
```typescript
// src/lib/normative/data.ts - Example for hemoglobin
hemoglobin: {
  unit: 'g/dL',
  note: 'Oxygen-carrying capacity; lower in females is physiologically normal.',
  male: {
    poor: { min: 0, max: 12.9 },
    cautious: { min: 13.0, max: 13.9 },
    normal: { min: 14.0, max: 16.9 },
    great: { min: 17.0, max: 17.9 },
    elite: { min: 18.0, max: 22 },
  },
  female: {
    poor: { min: 0, max: 10.9 },
    cautious: { min: 11.0, max: 11.9 },
    normal: { min: 12.0, max: 15.4 },
    great: { min: 15.5, max: 16.4 },
    elite: { min: 16.5, max: 22 },
  },
},
```

### Pattern 3: Updating getStandards for Blood Tests

**What:** The blood_tests code path in `getStandards()` currently ignores gender entirely (line 96-99 of ratings.ts). It must be updated to check for `'male' in test` the same way the body_comp and strength paths do.

**Current (broken for gendered markers):**
```typescript
if (key in normativeData.blood_tests) {
  const test = normativeData.blood_tests[key];
  return { unit: test.unit || null, note: test.note || null, standards: test as unknown as TierRanges };
}
```

**Required (same pattern as body_comp):**
```typescript
if (key in normativeData.blood_tests) {
  const test = normativeData.blood_tests[key];
  if ('male' in test && 'female' in test) {
    const genderData = test[g === 'female' ? 'female' : 'male'];
    return { unit: test.unit || null, note: test.note || null, standards: genderData as unknown as TierRanges };
  }
  return { unit: test.unit || null, note: test.note || null, standards: test as unknown as TierRanges };
}
```

**Fallback behavior (D-11):** When gender is null/empty, `g` resolves to `''` which is neither `'female'`, so the ternary defaults to `'male'`. For ungendered SimpleMarkers this path is never hit. For gendered markers with no gender provided, falling back to male ranges matches existing body_comp behavior. The CONTEXT decision D-11 says to fall back to "unisex ranges (existing SimpleMarker behavior)" -- but for a GenderedMarker, there IS no unisex variant. Two options:
1. Fall back to male (current body_comp behavior) -- simple but potentially misleading
2. Average male/female or pick the wider range -- complex, fragile

**Recommendation:** Fall back to male ranges (matching existing pattern) and add a note in the report when gender is not specified: "Ranges shown are for male reference; provide biological sex for accurate ranges." This is honest and simple.

### Pattern 4: Pure CSS/SVG Range Bar Component

**What:** A horizontal bar divided into 5 segments (one per tier), color-coded, with a needle/marker showing the actual value position.

**Why pure CSS over Recharts:**
- html2canvas renders CSS `<div>` elements perfectly; Recharts generates complex SVG with transforms, clip-paths, and animations that can produce blank/misaligned output in html2canvas
- No interactivity needed (no tooltips, hover, zoom)
- Much smaller component (~40 lines vs ~80+ with Recharts config)
- Zero additional bundle impact

**Example structure:**
```tsx
function RangeBar({ value, standards }: { value: number; standards: TierRanges }) {
  const tiers: RatingTier[] = ['poor', 'cautious', 'normal', 'great', 'elite'];
  const fullMin = standards.poor.min;
  const fullMax = standards.elite.max;
  const range = fullMax - fullMin;

  // Calculate needle position as percentage
  const clampedValue = Math.min(Math.max(value, fullMin), fullMax);
  const needlePercent = ((clampedValue - fullMin) / range) * 100;

  // Calculate each tier's width as percentage of total range
  const tierWidths = tiers.map(tier => {
    const tierRange = standards[tier].max - standards[tier].min;
    return (tierRange / range) * 100;
  });

  const SEGMENT_COLORS: Record<RatingTier, string> = {
    poor: 'bg-red-500',
    cautious: 'bg-amber-400',
    normal: 'bg-gray-400',
    great: 'bg-blue-500',
    elite: 'bg-emerald-500',
  };

  return (
    <div className="relative w-full h-3 flex rounded-full overflow-hidden">
      {tiers.map((tier, i) => (
        <div
          key={tier}
          className={`${SEGMENT_COLORS[tier]} h-full`}
          style={{ width: `${tierWidths[i]}%` }}
        />
      ))}
      {/* Needle */}
      <div
        className="absolute top-0 h-full w-0.5 bg-[#1a365d]"
        style={{ left: `${needlePercent}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1a365d] rounded-full" />
      </div>
    </div>
  );
}
```

**Key considerations:**
- Tier widths must be proportional to actual range spans (not equal fifths) -- some tiers span much wider ranges than others
- The needle position must be calculated from the absolute min to absolute max
- For markers where "lower is better" (e.g., cholesterol) vs "higher is better" (e.g., HDL), the tier order in the data already handles this (poor has high values for cholesterol, low values for HDL)
- Clamp the needle to stay within the bar bounds
- The bar should be compact enough to sit next to the existing tier pill in the marker row

### Pattern 5: Referral Flag Component

**What:** A visually prominent badge/banner attached to markers in poor or cautious tiers.

**Example:**
```tsx
function ReferralFlag({ tier }: { tier: 'monitor' | 'urgent' }) {
  if (tier === 'urgent') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100 border border-red-300 rounded-md">
        <span className="text-red-600 text-[10px] font-bold uppercase tracking-wide">
          Refer to GP for further investigation
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 border border-amber-300 rounded-md">
      <span className="text-amber-700 text-[10px] font-bold uppercase tracking-wide">
        Monitor -- retest in 3-6 months
      </span>
    </div>
  );
}
```

### Pattern 6: Extending Insights for Recommendations (D-03, D-04)

**What:** The existing `generatePeak360Insights` function already produces per-marker advice (the `doNow` array). The recommendations need to be enhanced with:
1. Specific supplement names and dosage ranges for poor-tier markers
2. Dietary/lifestyle suggestions for cautious-tier markers
3. A prefix on every recommendation: "Based on normative ranges, consider discussing with your healthcare provider:"

**Current structure is already correct** -- the `flagIf` function generates insights based on marker key and tier. The content just needs to be enriched with more specific supplement/dosage data and the disclaimer prefix.

### Anti-Patterns to Avoid
- **Equal-width tier segments in range bar:** Tiers have different-sized ranges (e.g., poor might span 0-12.9 while elite is 18-22). Each segment width must be proportional to its actual range span.
- **Ignoring the "lower is better" vs "higher is better" distinction:** The data already encodes this (poor has the extreme end for each marker), so the bar renders correctly as long as segment order follows `poor -> cautious -> normal -> great -> elite` left to right and widths are proportional.
- **Hardcoding referral flag text per marker:** Use a data-driven approach -- the tier rating determines Monitor vs Urgent, not per-marker if-else logic.
- **Breaking existing SimpleMarker blood tests:** Markers like `cholesterol_total` that remain ungendered must continue working. The type union `SimpleMarker | GenderedMarker` and the `'male' in test` check handle this.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Gender-specific range types | New type system | Existing `GenderedMarker` / `GenderedAgeMarker` | Already defined, tested, used by body_comp and strength |
| Tier color mapping | New color system | Existing `TIER_COLORS`, `TIER_BG_STRONG`, `TIER_DOT` | Consistent color language already established |
| PDF rendering pipeline | New PDF approach | Existing jsPDF + html2canvas-pro pipeline | Works, just ensure new components render through it |
| Recommendation content generation | AI-generated content at runtime | Static recommendation data in insights.ts | Predictable, auditable, no API dependency, existing pattern |

## Common Pitfalls

### Pitfall 1: Gender Fallback Silently Produces Wrong Ratings
**What goes wrong:** A gendered marker with no gender specified silently returns male ranges, which may be meaningfully wrong for a female client whose gender field is empty.
**Why it happens:** The ternary `g === 'female' ? 'female' : 'male'` defaults to male for any non-'female' value including empty string.
**How to avoid:** Fall back to male (matching existing pattern for body_comp) but surface a visual indicator in the report: "Biological sex not specified -- ranges shown may not be accurate." This matches D-11 while being honest.
**Warning signs:** Test with gender=null for every gendered blood marker.

### Pitfall 2: Range Bar Proportions Are Wrong for Extreme Tiers
**What goes wrong:** Tiers with very wide ranges (e.g., `poor: { min: 0, max: 12.9 }`) dominate the bar, making narrow tiers invisible.
**Why it happens:** Naively using the full range (0 to max of elite) makes clinically relevant tiers too thin.
**How to avoid:** Consider clamping the visual range to a clinically meaningful window. For example, for hemoglobin male (0-22), the relevant range is really 10-20. Display the bar from the 2nd percentile to 98th percentile of the practical range, with markers outside shown at the edge. Alternatively, use a minimum width (e.g., 8%) for each tier segment.
**Warning signs:** Test with markers at extreme values (value=1 for a marker with range 0-300).

### Pitfall 3: html2canvas Fails to Render SVG Elements
**What goes wrong:** Range bars appear blank in the PDF export.
**Why it happens:** html2canvas has known issues with certain SVG features (filters, clip-paths, foreign objects). Recharts generates complex SVGs.
**How to avoid:** Use pure CSS `<div>` elements for the range bar segments and needle. `div` elements with background colors render perfectly in html2canvas. If SVG is needed, keep it to basic `<rect>` and `<circle>` without transforms.
**Warning signs:** Test PDF export early with the range bar component, not at the end.

### Pitfall 4: Report Markers Array Not Updated with hasNorms
**What goes wrong:** New gendered markers exist in `normativeData` but don't show range bars because `hasNorms: false` in REPORT_MARKERS.
**Why it happens:** Adding ranges to data.ts without updating report-markers.ts.
**How to avoid:** For every marker that gets normative ranges added, also set `hasNorms: true` in REPORT_MARKERS. The two files must be updated in lockstep.
**Warning signs:** Marker has a tier pill but no range bar.

### Pitfall 5: Insights De-duplication Hides Important Recommendations
**What goes wrong:** If both `hemoglobin` and `ferritin` are flagged, they might both match "Iron status concern" and the second gets de-duplicated away.
**Why it happens:** The existing de-duplication in `generatePeak360Insights` uses title as the key.
**How to avoid:** When expanding insights with more specific supplement/dosage data, ensure each marker-specific recommendation gets a unique title, or group related markers into a single combined insight that mentions all flagged markers.
**Warning signs:** Multiple iron-related markers flagged but only one insight appears.

## Code Examples

### Blood Markers Requiring Gender-Specific Ranges

Based on WHO, Medscape, and clinical pathology references, these blood markers have clinically meaningful male/female differences:

| Marker (testKey) | Male Reference | Female Reference | Source |
|---|---|---|---|
| `hemoglobin` | 14.0-18.0 g/dL | 12.0-16.0 g/dL | WHO/Medscape |
| `hematocrit` | 40-54% | 36-48% | NCBI/Cleveland Clinic |
| `rbc` | 4.7-6.1 M/mcL | 4.2-5.4 M/mcL | Medscape |
| `ferritin` | 12-300 ng/mL | 10-150 ng/mL | Mayo Clinic/ASH |
| `serum_iron` | 55-160 ug/dL | 40-155 ug/dL | Medscape |
| `total_testosterone` | 300-1000 ng/dL | 15-70 ng/dL | Clinical standard |
| `free_testosterone` | 5-21 pg/mL | 0.3-1.9 pg/mL | Clinical standard |
| `creatinine` | 0.7-1.3 mg/dL | 0.6-1.1 mg/dL | Medscape |
| `egfr` | >90 mL/min (context) | >90 mL/min (different calc) | Clinical standard |
| `uric_acid` | 4.0-8.5 mg/dL | 2.7-7.3 mg/dL | Medscape |
| `alt` | 7-56 U/L (optimal <25) | 7-45 U/L (optimal <19) | Clinical standard |
| `ast` | 10-40 U/L | 9-32 U/L | Clinical standard |
| `ggt` | 0-50 U/L | 0-30 U/L | Medscape |
| `oestradiol` | 10-40 pg/mL | 15-350 pg/mL (varies by cycle) | Clinical standard |
| `shbg` | 10-57 nmol/L | 18-144 nmol/L | Clinical standard |
| `dheas` | 280-640 ug/dL | 65-380 ug/dL | Clinical standard |
| `fsh` | 1.5-12.4 mIU/mL | 3.5-12.5 mIU/mL (follicular) | Clinical standard |
| `lh` | 1.8-8.6 mIU/mL | 2.4-12.6 mIU/mL (follicular) | Clinical standard |

**Important notes:**
- These reference ranges must be converted into the 5-tier Peak360 system (poor/cautious/normal/great/elite). The reference ranges above represent approximately the "normal" band; optimal and concerning ranges must be extrapolated based on clinical context.
- Female hormone markers (FSH, LH, oestradiol, progesterone) vary significantly by menstrual cycle phase. For a coach-facing tool, use follicular phase reference ranges as the default with a note indicating variability.
- eGFR is calculated differently for males and females in clinical practice, but since the input is a pre-calculated value, the ranges themselves may be similar. Include a note.

### Disclaimer Text (D-05)

```
This report is generated for informational and educational purposes only.
It does not constitute medical advice, diagnosis, or treatment. Normative
ranges are based on published clinical reference data for the general adult
population and may not reflect individual health circumstances. All results
should be reviewed in consultation with a qualified healthcare professional.
If any markers are flagged as critically out of range, seek prompt medical advice.
```

### Integration Point: Where RangeBar Goes in Section 11

The existing `renderMarkerRow` function (line 322-344 of Section11.tsx) renders each marker as a flex row with label, value, and tier pill. The range bar should be added below the existing row content as a full-width element:

```tsx
const renderMarkerRow = (m: ReportMarker, i: number) => (
  <div key={m.key} className={`report-marker-row ...existing classes...`}>
    {/* Existing: label, value, tier pill */}
    <span className="text-[13px] font-medium text-[#1a202c]">{m.label}</span>
    <div className="flex items-center gap-3">
      {/* ...existing value + tier pill... */}
    </div>
    {/* NEW: Range bar (only for markers with norms and a value) */}
    {m.hasNorms && m.value !== null && m.tier && (
      <div className="w-full mt-1.5">
        <RangeBar value={m.value} testKey={m.key} age={age} gender={gender} />
      </div>
    )}
    {/* NEW: Referral flag (only for poor/cautious markers) */}
    {m.tier === 'poor' && <ReferralFlag tier="urgent" />}
    {m.tier === 'cautious' && <ReferralFlag tier="monitor" />}
  </div>
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| All blood markers use unisex ranges | Gender-specific ranges standard in clinical labs | Always been standard | Current code produces wrong ratings for ~50% of population |
| Text-only tier labels | Visual range bars standard in lab reports | Industry standard | Users expect visual position indicator |
| No actionable recommendations | Supplement/lifestyle guidance per marker | Growing trend in longevity platforms | Differentiator for coaching context |

## Open Questions

1. **Hormone cycle phase for female reference ranges**
   - What we know: Female FSH, LH, oestradiol, progesterone vary dramatically by cycle phase (follicular, ovulatory, luteal, post-menopausal)
   - What's unclear: Whether the coaching context needs cycle phase input or if follicular-phase defaults suffice
   - Recommendation: Use follicular phase ranges as default with a note "Hormone ranges shown for follicular phase; results may vary by cycle phase." Cycle-aware ranges deferred to v2.

2. **Range bar minimum tier width**
   - What we know: Some tiers span very narrow ranges (e.g., elite hemoglobin male 18-22 = 4 units vs poor 0-12.9 = 13 units)
   - What's unclear: Exact minimum percentage that remains visible/readable
   - Recommendation: Apply a minimum width of 10% per segment. If a tier's proportional width is < 10%, expand to 10% and proportionally shrink others. Test visually.

3. **Report markers hasNorms currently false for many blood markers**
   - What we know: Of ~55 blood markers in REPORT_MARKERS, only 8 currently have `hasNorms: true`. Adding ~18 gendered markers raises this to ~26.
   - What's unclear: Whether remaining markers (e.g., insulin, homocysteine, vitamin B12) should also get normative ranges in this phase
   - Recommendation: Add ranges ONLY for the ~18 clinically gendered markers listed above. Adding ungendered norms for remaining markers is a separate concern that can be done incrementally.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/types/normative.ts`, `src/lib/normative/data.ts`, `src/lib/normative/ratings.ts`, `src/lib/normative/insights.ts`, `src/components/sections/Section11.tsx`, `src/lib/report-markers.ts` -- direct source analysis
- [Medscape Lab Values, Normal Adult](https://emedicine.medscape.com/article/2172316-overview) -- comprehensive reference ranges by sex
- [NCBI: Hemoglobin and Hematocrit Clinical Methods](https://www.ncbi.nlm.nih.gov/books/NBK259/) -- sex-based hemoglobin/hematocrit ranges
- [Cleveland Clinic: Ferritin Test](https://my.clevelandclinic.org/health/diagnostics/17820-ferritin-test) -- male/female ferritin ranges
- [ASH: Sex, Lies, and Iron Deficiency](https://ashpublications.org/hematology/article/2023/1/617/506479/Sex-lies-and-iron-deficiency-a-call-to-change) -- ferritin reference range critique
- [Medscape: GGT Reference Range](https://emedicine.medscape.com/article/2087891-overview) -- sex-specific GGT ranges

### Secondary (MEDIUM confidence)
- [PMC: Gender-Specific Reference Intervals](https://pmc.ncbi.nlm.nih.gov/articles/PMC7956001/) -- sex-based range differences overview
- [PMC: Graphical display for laboratory data](https://pmc.ncbi.nlm.nih.gov/articles/PMC2995657/) -- visualization effectiveness
- html2canvas CSS rendering behavior -- based on known issues in the html2canvas GitHub repository; CSS divs render more reliably than complex SVG

### Tertiary (LOW confidence)
- Female hormone cycle-phase reference ranges -- general clinical knowledge; specific tier boundaries for the 5-tier system need clinical validation or expert input
- Range bar minimum width threshold of 10% -- UX heuristic, not empirically tested for this specific context

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies; all existing libraries confirmed in package.json
- Architecture: HIGH - Extending established patterns (GenderedMarker, getStandards, insights); every code path verified in source
- Pitfalls: HIGH - Based on direct code analysis (gender fallback logic, html2canvas behavior, report-markers sync)
- Clinical data: MEDIUM - Reference ranges from authoritative medical sources but 5-tier mapping requires clinical judgment for optimal/elite boundaries

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable domain; clinical reference ranges and codebase patterns don't change frequently)
