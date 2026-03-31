---
name: add-biomarker
description: Add a new biomarker across all required files (normative data, report markers, field mappings, insights)
argument-hint: <testKey> <label> <category> <subcategory> <section> <dataKey>
---

# Add Biomarker

Add a new biomarker to the Peak360 assessment platform. This requires changes across 4 files. Walk the user through each step.

## Arguments

`$ARGUMENTS` should contain at minimum a biomarker name/key. If not all details are provided, ask the user for:

1. **testKey** — snake_case key for normative data (e.g., `cholesterol_total`)
2. **label** — Display name (e.g., "Total Cholesterol")
3. **category** — Report category (e.g., "Blood Tests & Biomarkers", "Strength Testing", "Body Composition")
4. **subcategory** — Optional subcategory (e.g., "Lipid Panel", "Inflammation")
5. **section** — Which section collects this data (5=Blood, 6=Body Comp, 7=Cardio, 8=Strength, 9=Mobility)
6. **dataKey** — camelCase field name in section data (e.g., `cholesterolTotal`)
7. **unit** — Measurement unit (e.g., "mg/dL", "kg", "seconds")
8. **markerType** — One of: `simple` (no age/gender), `gendered` (gender-specific), `gendered-age` (gender + age-specific)
9. **tier thresholds** — The {min, max} ranges for all 5 tiers (poor, cautious, normal, great, elite)
10. **hasNorms** — Whether this marker should show a tier rating (true) or just display the value (false)

## Steps

### Step 1: Add normative thresholds to `src/lib/normative/data.ts`

Add the marker to the appropriate category object (`blood_tests`, `body_comp`, `fitness`, `strength`, or `mobility`).

**Simple marker pattern:**
```typescript
testKey: {
  unit: 'unit',
  poor:     { min: X, max: X },
  cautious: { min: X, max: X },
  normal:   { min: X, max: X },
  great:    { min: X, max: X },
  elite:    { min: X, max: X },
},
```

**Gendered marker pattern:**
```typescript
testKey: {
  unit: 'unit',
  male: {
    poor:     { min: X, max: X },
    cautious: { min: X, max: X },
    normal:   { min: X, max: X },
    great:    { min: X, max: X },
    elite:    { min: X, max: X },
  },
  female: {
    poor:     { min: X, max: X },
    cautious: { min: X, max: X },
    normal:   { min: X, max: X },
    great:    { min: X, max: X },
    elite:    { min: X, max: X },
  },
},
```

**Gendered + age-bucketed marker pattern:**
```typescript
testKey: {
  unit: 'unit',
  male: {
    '20-39': { poor: { min, max }, cautious: { min, max }, normal: { min, max }, great: { min, max }, elite: { min, max } },
    '40-59': { ... },
    '60+': { ... },
  },
  female: { ... },
},
```

Skip this step if `hasNorms` is false.

### Step 2: Add to REPORT_MARKERS in `src/components/sections/Section11.tsx`

Add to the `REPORT_MARKERS` array (around line 77), grouped with related markers:

```typescript
{ testKey: 'testKey', label: 'Label', section: N, dataKey: 'dataKey', category: 'Category', subcategory: 'Subcategory', hasNorms: true },
```

If `hasNorms: false`, include `fallbackUnit: 'unit'` instead.

### Step 3: Add field mapping aliases to `src/lib/ai/field-mappings.ts`

Add all reasonable text variations that GPT-4o might extract from documents:

```typescript
'variation 1': 'dataKey',
'variation_2': 'dataKey',
'Variation Three': 'dataKey',
```

Include: full name, abbreviations, common lab report formats, snake_case, with/without units.

### Step 4: Add insight template to `src/lib/normative/insights.ts`

Add a case to the switch statement in `generatePeak360Insights` for when this marker scores cautious or poor:

```typescript
case 'testKey': {
  insights.push({
    title: 'Descriptive insight title',
    why: 'Explanation of why this marker matters for longevity...',
    doNow: [
      'Actionable recommendation 1',
      'Actionable recommendation 2',
      'Actionable recommendation 3',
    ],
  });
  break;
}
```

Skip this step if `hasNorms` is false.

### Step 5: Verify

After all changes, confirm:
- [ ] Tier ranges have no gaps or overlaps (each tier's max should equal the next tier's min, or be adjacent)
- [ ] The dataKey matches the field name used in the section component
- [ ] The testKey in REPORT_MARKERS matches the key in normativeData
- [ ] Field mappings use the correct dataKey (camelCase)

Tell the user which files were modified and suggest running `npm run build` to verify no TypeScript errors.
