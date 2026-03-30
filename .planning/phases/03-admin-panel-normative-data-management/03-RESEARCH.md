# Phase 3: Admin Panel & Normative Data Management - Research

**Researched:** 2026-03-31
**Domain:** Database-backed normative data management, admin CRUD UI, range versioning
**Confidence:** HIGH

## Summary

Phase 3 transforms the normative rating system from hardcoded TypeScript (`src/lib/normative/data.ts`, 813 lines, ~49 markers across 5 categories) into a database-backed configuration with an admin UI. The current `getStandards()` function in `ratings.ts` directly imports `normativeData` from `data.ts` and resolves tiers based on marker key, age, and gender. This phase must: (1) create new DB tables to store normative ranges, (2) build an admin UI for CRUD operations on those ranges, (3) implement range versioning so existing assessments retain the norms they were created with, (4) maintain hardcoded fallback when no DB overrides exist, and (5) add red flag severity weighting configuration.

The existing architecture is well-suited for this change. The rating engine (`getPeak360Rating` -> `getStandards` -> `resolveRawLabel`) has a single data source entry point (`normativeData` import) that can be swapped to a DB-first-with-fallback resolver. The `REPORT_MARKERS` array (98 markers, 48 with norms) already categorizes markers with `testKey`, `category`, and `subcategory` fields that map cleanly to an admin browse UI. The dual-schema pattern (PG + SQLite) with the proxy DB requires new tables in both `schema.ts` and `schema-sqlite.ts` plus corresponding `runMigrations()` entries.

**Primary recommendation:** Add two new tables (`normative_ranges` for admin-editable data, `normative_versions` for immutable snapshots), modify `getStandards()` to check DB first with hardcoded fallback, and build the admin UI under `/admin/normative` using the existing Next.js App Router pattern with server components for layout and client components for the editable forms.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADMN-01 | Normative ranges moved from hardcoded TypeScript to database-backed configuration | New `normative_ranges` table schema; `getStandards()` refactored to query DB first, fall back to `data.ts` |
| ADMN-02 | Hardcoded defaults used as fallback when no DB overrides exist | `getStandards()` uses `normativeData` import as fallback when DB query returns null |
| ADMN-03 | Admin UI to browse all markers grouped by category | Admin page at `/admin/normative` rendering `REPORT_MARKERS` grouped by category/subcategory |
| ADMN-04 | Admin UI to edit min/max values for each tier per marker | Client component with 5-tier form (poor/cautious/normal/great/elite) x {min, max} = 10 fields per marker variant |
| ADMN-05 | Normative range versioning -- snapshot the version used per assessment | `normative_versions` table stores immutable JSON snapshots; `assessments` table gets `normative_version_id` column |
| ADMN-06 | Red flag marker weighting with configurable severity | `red_flag_config` table or column on `normative_ranges` with severity weight (numeric) per marker |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Tech stack**: Next.js 16 + React 19 + Tailwind CSS v4 + SQLite/Drizzle -- must stay consistent
- **Backwards compatibility**: Existing assessments must continue to work after normative data moves to DB (fallback to hardcoded defaults)
- **Import style**: Always use `@/` alias, never relative paths
- **Type imports**: Always use `import type { ... }` for TypeScript types
- **Component pattern**: Client components use `'use client'` directive; default exports for components, named exports for utilities/types
- **API routes**: Return `NextResponse.json({ success, data?, error? })`
- **Color scheme**: Navy/gold with existing tier colors (emerald/blue/gray/amber/red)
- **Dual DB support**: Both PG (`schema.ts`) and SQLite (`schema-sqlite.ts`) schemas must be updated

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App Router pages for admin UI | Already the framework |
| Drizzle ORM | 0.45.1 | Schema definitions + queries for normative tables | Already the ORM |
| drizzle-kit | 0.31.9 | Migration generation | Already installed |
| React | 19.2.3 | Admin UI components | Already the UI library |
| Tailwind CSS | 4 | Admin page styling | Already the styling framework |
| Zustand | 5.0.11 | Optional: local state for admin form edits | Already installed |

### Supporting (No new dependencies needed)
This phase requires NO new npm packages. All functionality is achievable with the existing stack.

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    admin/
      normative/
        page.tsx              # Browse all markers by category (server component)
        [marker]/
          page.tsx            # Edit a specific marker's ranges (client component)
      layout.tsx              # Admin layout with nav, role guard
  lib/
    db/
      schema.ts               # + normative_ranges, normative_versions, red_flag_config (PG)
      schema-sqlite.ts         # + same tables (SQLite)
    normative/
      data.ts                  # Unchanged -- remains as hardcoded fallback
      ratings.ts               # Modified getStandards() to check DB first
      db-ranges.ts             # NEW: DB query functions for normative data
  app/
    api/
      admin/
        normative/
          route.ts             # GET all ranges, POST new range
          [marker]/
            route.ts           # GET/PUT/DELETE single marker ranges
        normative-versions/
          route.ts             # POST to create snapshot, GET versions list
        red-flags/
          route.ts             # GET/PUT red flag severity config
```

### Pattern 1: DB-First with Hardcoded Fallback
**What:** `getStandards()` queries the `normative_ranges` table for the requested marker. If a row exists, use it. If not, fall back to the hardcoded `normativeData` object.
**When to use:** Every rating calculation.
**Example:**
```typescript
// src/lib/normative/db-ranges.ts
import { db } from '@/lib/db';
import { normativeRanges } from '@/lib/db/schema-sqlite'; // or schema
import { eq, and } from 'drizzle-orm';
import { normativeData } from './data';
import type { TierRanges } from '@/types/normative';

export async function getDbStandards(
  testKey: string,
  gender?: string | null,
  ageGroup?: string | null
): Promise<{ unit: string | null; note: string | null; standards: TierRanges | null } | null> {
  const conditions = [eq(normativeRanges.testKey, testKey)];
  if (gender) conditions.push(eq(normativeRanges.gender, gender));
  if (ageGroup) conditions.push(eq(normativeRanges.ageGroup, ageGroup));

  const row = await db.select().from(normativeRanges)
    .where(and(...conditions))
    .limit(1);

  if (!row.length) return null; // Caller falls back to hardcoded

  return {
    unit: row[0].unit,
    note: row[0].note,
    standards: row[0].tiers as TierRanges,
  };
}
```

### Pattern 2: Immutable Version Snapshots
**What:** When an assessment is created (or finalized), snapshot the current normative ranges into a `normative_versions` row. The assessment references this version_id. Future admin edits create new "current" rows but never modify the snapshot.
**When to use:** Assessment creation or first section save.
**Design choices:**
- Snapshot stores the FULL normative dataset as a JSON blob (both DB overrides merged with hardcoded defaults)
- This avoids complex joins at report-render time -- just load the snapshot
- Storage cost: ~49 markers x ~100 bytes each = ~5KB per snapshot; very manageable
- Deduplicate: hash the JSON content; if the same hash exists, reuse the version_id

```typescript
// normative_versions table
{
  id: text('id').primaryKey(),        // UUID
  rangesJson: text('ranges_json'),     // Full merged normative dataset as JSON
  contentHash: text('content_hash'),   // SHA-256 of rangesJson for dedup
  createdAt: text('created_at'),
}

// assessments table addition
{
  normativeVersionId: text('normative_version_id')
    .references(() => normativeVersions.id),
}
```

### Pattern 3: Admin UI Category Browser
**What:** Reuse `REPORT_MARKERS` grouping for the admin browse view. Group markers by `category` then `subcategory`.
**When to use:** Admin normative management page.
**Key insight:** The 98 `REPORT_MARKERS` entries already have category/subcategory. The admin UI shows only the ~48 markers with `hasNorms: true`, but should list all markers so admins can see which ones lack norms and potentially add them.

### Pattern 4: Red Flag Severity Configuration
**What:** Each marker can have an optional `redFlagSeverity` weight (0-10 scale or similar). When a marker's rating is poor or cautious, the severity weight determines how prominent the referral flag appears in the report.
**When to use:** Report generation in Section 11, referral flag display.
**Storage:** Either a dedicated `red_flag_config` table or a `severity_weight` column on `normative_ranges`. Recommend a column on `normative_ranges` for simplicity since severity is per-marker.

### Anti-Patterns to Avoid
- **Storing ranges in assessment_sections JSON blob:** Do NOT put normative config inside section data. Keep it separate and versioned.
- **Eager loading all ranges on every page:** Only load ranges when rating engine needs them (API-side). Admin pages can load lazily per category.
- **Mutating version snapshots:** Once a `normative_versions` row is created, it MUST be immutable. Admin edits always modify `normative_ranges` (the "current" table), never the snapshots.
- **Making getStandards() async everywhere:** The current `getStandards()` is synchronous. For the report (Section 11), pre-load all needed ranges before calling the rating engine, or create a sync cache. Avoid making every `getPeak360Rating()` call async.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Content-addressable dedup | Custom diff engine | SHA-256 hash of JSON.stringify(sorted) | Simple, deterministic, handles dedup perfectly |
| Admin role guard | Custom session checking | Phase 2's auth system (Better Auth RBAC) | Phase 2 establishes admin role; reuse its middleware/guards |
| Form validation for tier ranges | Custom validation logic | HTML5 input validation + simple checks (min < max, no gaps) | Tier ranges are just 10 numbers; no need for a form library |
| Category grouping | Custom category registry | `REPORT_MARKERS` array already has category/subcategory | Data already exists in the right shape |

**Key insight:** The normative data structure is well-defined (5 tiers x {min,max} per variant) and the `REPORT_MARKERS` array already provides the metadata needed for the admin UI. Most of this phase is plumbing data through DB tables and building straightforward CRUD forms.

## Common Pitfalls

### Pitfall 1: Sync vs Async Rating Engine
**What goes wrong:** Current `getStandards()` and `getPeak360Rating()` are synchronous. Switching to DB queries makes them async. Every caller (Section 11 report, insights engine) must be updated.
**Why it happens:** SQLite via better-sqlite3 is actually synchronous, but Drizzle ORM queries return Promises. PG is truly async.
**How to avoid:** Pre-load all normative ranges into a Map/object at the start of report generation (one DB call), then pass this resolved data to a synchronous rating function. Keep the hot path sync.
**Warning signs:** `await` calls inside tight loops; "Cannot use async function" errors in existing sync code.

### Pitfall 2: Dual Schema Drift
**What goes wrong:** PG schema (`schema.ts`) and SQLite schema (`schema-sqlite.ts`) get out of sync. One gets the new tables, the other doesn't.
**Why it happens:** Two separate files with no automated sync check.
**How to avoid:** Always update both files in the same commit. Add both to the `runMigrations()` function in `src/lib/db/index.ts`.
**Warning signs:** Works in dev (SQLite) but breaks in production (PG) or vice versa.

### Pitfall 3: Gender/Age Variant Complexity in DB Schema
**What goes wrong:** Some markers are simple (5 tiers), some are gendered (male/female x 5 tiers), some are gendered + age-bucketed (male/female x age groups x 5 tiers). A flat DB table doesn't capture this well.
**Why it happens:** The hardcoded data uses nested objects; relational tables need flattening.
**How to avoid:** Use a design where each row represents one "variant" of a marker: `(testKey, gender?, ageGroup?, tiers_json)`. A simple marker has 1 row (gender=null, ageGroup=null). A gendered marker has 2 rows. A gendered+age-bucketed marker has ~12 rows (2 genders x 6 age groups).
**Warning signs:** Admin UI doesn't know how to display gendered vs non-gendered markers; ranges silently ignored because gender/age columns don't match.

### Pitfall 4: Version Bloat
**What goes wrong:** Creating a new version snapshot on every assessment creation, even when ranges haven't changed.
**Why it happens:** No deduplication.
**How to avoid:** Hash the merged normative JSON. If the hash matches an existing version, reuse it. Most assessments created between admin edits will share the same version.
**Warning signs:** Thousands of identical snapshot rows in the DB.

### Pitfall 5: Breaking Existing Assessments During Migration
**What goes wrong:** After adding `normative_version_id` to `assessments`, existing assessments have NULL for this column. Report generation breaks because it tries to load a version that doesn't exist.
**Why it happens:** New code assumes version_id is always present.
**How to avoid:** When `normative_version_id` is NULL, fall back to hardcoded defaults (same as no-DB-override behavior). This is the expected behavior for pre-Phase-3 assessments.
**Warning signs:** Section 11 report fails to load for existing assessments after deployment.

## Code Examples

### Normative Ranges Table Schema (SQLite)
```typescript
// src/lib/db/schema-sqlite.ts additions
export const normativeRanges = sqliteTable('normative_ranges', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  testKey: text('test_key').notNull(),          // e.g., 'cholesterol_total'
  category: text('category').notNull(),          // e.g., 'blood_tests'
  gender: text('gender'),                        // null = unisex, 'male' or 'female'
  ageGroup: text('age_group'),                   // null = all ages, '18-25', '26-35', etc.
  unit: text('unit'),
  note: text('note'),
  tiers: text('tiers', { mode: 'json' }),        // JSON: { poor: {min,max}, cautious: {min,max}, ... }
  severityWeight: integer('severity_weight'),     // Red flag severity: 0-10, null = default
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const normativeVersions = sqliteTable('normative_versions', {
  id: text('id').primaryKey(),                   // UUID
  rangesJson: text('ranges_json'),               // Full merged dataset as JSON
  contentHash: text('content_hash').notNull(),   // SHA-256 for dedup
  createdAt: text('created_at').notNull(),
});
```

### Modified getStandards with DB Support
```typescript
// Preloaded approach for report generation
export function getStandardsFromSnapshot(
  snapshot: Record<string, unknown>,
  testKey: string,
  age?: number | null,
  gender?: string | null
): Standards {
  // Look up in snapshot first
  const snapshotEntry = snapshot[testKey];
  if (snapshotEntry) {
    // Resolve gender/age from snapshot entry (same logic as current getStandards)
    return resolveFromEntry(snapshotEntry, age, gender);
  }
  // Fall back to hardcoded
  return getStandards(testKey, age, gender);
}
```

### Admin Marker List Component
```typescript
// src/app/admin/normative/page.tsx
import { REPORT_MARKERS } from '@/lib/report-markers';

export default function NormativeAdmin() {
  const categories = [...new Set(REPORT_MARKERS.map(m => m.category))];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-navy mb-6">Normative Range Management</h1>
      {categories.map(cat => (
        <section key={cat} className="mb-8">
          <h2 className="text-lg font-semibold text-navy mb-3">{cat}</h2>
          <div className="grid gap-2">
            {REPORT_MARKERS.filter(m => m.category === cat).map(m => (
              <a key={m.testKey} href={`/admin/normative/${m.testKey}`}
                 className="flex justify-between items-center p-3 bg-surface border border-border rounded hover:border-gold">
                <span className="font-medium">{m.label}</span>
                <span className="text-sm text-gray-500">
                  {m.hasNorms ? 'Has ranges' : 'No ranges'}
                </span>
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded normative data in `data.ts` | DB-backed with hardcoded fallback | This phase | Rating engine becomes configurable without code deploys |
| No versioning of ranges | Per-assessment version snapshots | This phase | Existing assessments retain their original rating context |
| No admin UI | Full CRUD admin panel | This phase | Non-developers can manage normative standards |
| Fixed red flag behavior | Configurable severity weighting | This phase | Admins can tune which markers trigger referral flags |

## Open Questions

1. **Version snapshot granularity**
   - What we know: Snapshots should be immutable, content-hash deduplicated
   - What's unclear: Should snapshots be created at assessment creation time, or at report generation (Section 11) time?
   - Recommendation: Create at assessment creation time. This matches the requirement that "existing assessments retain the normative range version they were created with" -- the version is locked when the assessment starts, not when the report is viewed.

2. **Admin UI: edit all markers or only hasNorms markers?**
   - What we know: 48 markers have norms, 50 do not
   - What's unclear: Should admins be able to add norms for markers that currently have `hasNorms: false`?
   - Recommendation: Show all markers in browse view, allow editing only for `hasNorms: true` markers initially. Adding new norms is a v2 feature (ADEX-01 territory).

3. **Red flag severity: what does the weight control?**
   - What we know: ADMN-06 says "configurable severity"
   - What's unclear: Does severity affect only visual prominence, or does it affect the referral flag threshold (e.g., severity=high means flag at cautious, not just poor)?
   - Recommendation: Start with visual prominence only (severity weight controls sort order and visual emphasis of referral flags in the report). Threshold-based logic is more complex and can be added later.

4. **Phase 2 dependency: admin role guard**
   - What we know: Phase 2 establishes Better Auth with RBAC (admin/coach/client roles)
   - What's unclear: Exact middleware pattern and session API from Phase 2
   - Recommendation: Build admin pages assuming a `getSession()` utility exists from Phase 2 that returns the user's role. Guard admin routes with role check. Specific implementation depends on Phase 2 output.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/lib/normative/data.ts` (813 lines, 49 markers, 5 categories)
- Codebase analysis: `src/lib/normative/ratings.ts` (173 lines, sync rating engine)
- Codebase analysis: `src/lib/report-markers.ts` (98 markers, 48 with norms, 15 categories/subcategories)
- Codebase analysis: `src/lib/db/schema.ts` and `schema-sqlite.ts` (dual-schema pattern)
- Codebase analysis: `src/lib/db/index.ts` (DB proxy, runMigrations pattern)
- Codebase analysis: `src/types/normative.ts` (TierRanges, RatingTier, SimpleMarker, GenderedMarker, GenderedAgeMarker types)

### Secondary (MEDIUM confidence)
- Project decisions from STATE.md: "Range versioning schema design needs resolution during Phase 3 planning"
- REQUIREMENTS.md: ADMN-01 through ADMN-06 definitions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, uses existing Drizzle + Next.js patterns
- Architecture: HIGH - clear data model, well-understood CRUD pattern, existing codebase patterns to follow
- Pitfalls: HIGH - identified from direct codebase analysis (sync/async, dual schema, variant complexity)

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable domain, no external dependency changes expected)
