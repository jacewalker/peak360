---
phase: quick
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/api/assessments/[id]/normative-version/route.ts
autonomous: true
must_haves:
  truths:
    - "Old assessments without normativeVersionId get a live merged snapshot (DB overrides + hardcoded)"
    - "Markers like Vitamin B12 with DB-only overrides show tier and scale bar on Section 11 for old assessments"
    - "Assessments WITH a normativeVersionId still use their pinned snapshot (no behavior change)"
  artifacts:
    - path: "src/app/api/assessments/[id]/normative-version/route.ts"
      provides: "Live snapshot fallback for unversioned assessments"
      contains: "mergeDbWithHardcoded"
  key_links:
    - from: "src/app/api/assessments/[id]/normative-version/route.ts"
      to: "src/lib/normative/versioning.ts"
      via: "mergeDbWithHardcoded import"
      pattern: "mergeDbWithHardcoded"
---

<objective>
Fix Section 11 report for old/pre-Phase-3 assessments that have no normative version snapshot.

Currently, when an assessment has no `normativeVersionId`, the normative-version API returns `null`, and Section 11 falls back to hardcoded data only. Markers with DB-only overrides (e.g., Vitamin B12) show no tier or scale bar.

Fix: When the assessment has no `normativeVersionId`, return a live merged snapshot (DB overrides + hardcoded) from the existing `mergeDbWithHardcoded()` function instead of returning `null`. This requires a one-line change in the API route. Section 11's existing code path already handles snapshots correctly -- it just needs to receive one.

Purpose: Ensure all markers with DB overrides are properly evaluated in Section 11 regardless of whether the assessment was created before or after version pinning.
Output: Updated normative-version API route.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/app/api/assessments/[id]/normative-version/route.ts
@src/lib/normative/versioning.ts
@src/lib/normative/ratings.ts
@src/components/sections/Section11.tsx

<interfaces>
From src/lib/normative/versioning.ts:
```typescript
export async function mergeDbWithHardcoded(): Promise<NormativeVersionSnapshot>;
export async function getVersionSnapshot(versionId: string): Promise<NormativeVersionSnapshot | null>;
```

From src/types/normative.ts:
```typescript
export interface NormativeVersionSnapshot {
  [testKey: string]: NormativeVersionMarker;
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Return live merged snapshot for unversioned assessments</name>
  <files>src/app/api/assessments/[id]/normative-version/route.ts</files>
  <action>
In the GET handler, when `versionId` is null (line 40-43 area), instead of returning `{ success: true, data: null }`, call `mergeDbWithHardcoded()` from `@/lib/normative/versioning` and return the result.

Specific changes:
1. Add `mergeDbWithHardcoded` to the existing import from `@/lib/normative/versioning` (currently only imports `getVersionSnapshot`).
2. Replace the block:
   ```typescript
   if (!versionId) {
     // Old assessment without version pinning — fall back to hardcoded
     return NextResponse.json({ success: true, data: null });
   }
   ```
   With:
   ```typescript
   if (!versionId) {
     // Old assessment without version pinning — build live snapshot from current DB overrides + hardcoded
     const liveSnapshot = await mergeDbWithHardcoded();
     return NextResponse.json({ success: true, data: liveSnapshot });
   }
   ```

This is the minimal fix. Section 11 already handles snapshots correctly via `getStandardsFromSnapshot` -- it just needs to receive a snapshot instead of null. The `mergeDbWithHardcoded()` function already exists and produces the exact format needed (NormativeVersionSnapshot), merging all DB admin overrides with hardcoded fallback data.

Note: Assessments WITH a normativeVersionId continue to use their pinned snapshot (no behavior change for those).
  </action>
  <verify>
    <automated>cd /Users/jace/Code/peak360 && npx tsc --noEmit --pretty 2>&1 | head -20</automated>
  </verify>
  <done>
    - The normative-version API returns a live merged snapshot (not null) for assessments without a normativeVersionId
    - TypeScript compiles without errors
    - Assessments with a normativeVersionId still return their pinned snapshot unchanged
  </done>
</task>

</tasks>

<verification>
1. TypeScript compiles: `npx tsc --noEmit` passes
2. Manual spot-check: Open an old assessment (no normativeVersionId) in Section 11 -- markers with DB-only overrides (e.g., Vitamin B12) should now show tier pills and scale bars
</verification>

<success_criteria>
- Old assessments get a live snapshot with all DB overrides included
- New assessments with pinned versions are unaffected
- No TypeScript errors introduced
</success_criteria>

<output>
After completion, create `.planning/quick/260331-dob-section11-fallback-to-current-db-overrid/260331-dob-SUMMARY.md`
</output>
