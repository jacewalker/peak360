# Phase 12: Admin-managed marker registry - Pattern Map

**Mapped:** 2026-05-28
**Files analyzed:** 17 new/modified files
**Analogs found:** 16/17 (1 greenfield — `getFieldMappings()`)

Every section below points the planner at a single closest analog in the existing codebase, plus the exact lines/snippets to clone. Conventions to preserve across the phase:

- **Drizzle tables** live in BOTH `src/lib/db/schema.ts` (Postgres, `pgTable`) AND `src/lib/db/schema-sqlite.ts` (SQLite, `sqliteTable`). New tables must be added to both.
- **Migrations** are also hand-written in `src/lib/db/index.ts` `runMigrations()` (two parallel blocks — PG + SQLite) using raw SQL `CREATE TABLE IF NOT EXISTS` for forward-deploy idempotency.
- Drizzle columns use camelCase TS names → snake_case SQL names. `created_at`/`updated_at` use `text` (ISO strings) on the older tables and `integer` (epoch ms) on the newer Phase 8/11 tables — `markers` should follow the **Phase 11 convention** (epoch ms) since it is being added alongside `markerContent`.
- **Auth gate:** every admin route uses `requireAdmin()` from `src/lib/auth-helpers.ts`; every admin page server-side does `auth.api.getSession({ headers })` then `redirect('/portal')` for non-admins.
- **Response shape:** `NextResponse.json({ success: true, data: … })` on success, `{ success: false, error: '…' }` + status code on failure.
- **Optimistic concurrency:** client sends `updatedAt` in PUT body; server reads current row, returns 409 if newer.
- **Audit:** every mutating admin route ends with `logAuditEvent({ … }) + getRequestContext()`; action strings are namespaced (`marker_content.update`, `pillar_prescription.upsert`). New phase uses `marker.create`, `marker.update`, `marker.delete`.
- **camelCase IDs everywhere** (form fields, dataKey, store updates). Field handlers: `(v) => onChange('fieldName', v)` or `n('field')` for numeric.
- **Path alias:** always `@/…` (mapped to `./src/`), never relative.
- **Import types:** `import type { … }` for type-only imports.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/db/schema.ts` (+ `markers` table) | schema | persistence | existing `markerContent` block (lines 105-115) | exact |
| `src/lib/db/schema-sqlite.ts` (+ `markers` table) | schema | persistence | existing `markerContent` block (lines 105-113) | exact |
| `src/lib/db/index.ts` (migration block) | migration | DDL | `marker_content` + seed blocks (lines 300-327 PG / 564-592 SQLite) | exact |
| `src/lib/markers/queries.ts` | query layer | CRUD | `src/lib/marker-content/queries.ts` | exact |
| `src/lib/markers/registry.ts` (`getReportMarkers()`) | service | transform/merge | `src/lib/normative/db-ranges.ts` `preloadDbRanges` + `src/lib/normative/ratings.ts` `getStandards` (DB-over-hardcoded fallback) | role-match |
| `src/lib/markers/field-mappings.ts` (`getFieldMappings()`) | service | transform/merge | **greenfield** — model after `getReportMarkers()` itself; consumed at `src/app/api/ai/extract/route.ts:107` | greenfield |
| `src/app/api/admin/markers/route.ts` | API route | CRUD list/create | `src/app/api/admin/marker-content/route.ts` + `src/app/api/admin/normative/route.ts` | exact |
| `src/app/api/admin/markers/[testKey]/route.ts` | API route | CRUD GET/PUT/DELETE | `src/app/api/admin/normative/[marker]/route.ts` | exact |
| `src/app/api/markers/route.ts` | API route | request-response (any role) | (no exact analog — uses `requireSession` instead of `requireAdmin`); shape mirrors `/api/admin/markers` | role-match |
| `src/app/portal/admin/markers/page.tsx` | page | SSR list | `src/app/portal/admin/marker-content/page.tsx` + child `MarkerContentList.tsx` | exact |
| `src/app/portal/admin/markers/new/page.tsx` | page | create form | `src/app/portal/admin/marker-content/[marker]/page.tsx` (form scaffolding); `src/app/portal/admin/normative/[marker]/page.tsx` (tier-ranges editor) | role-match |
| `src/app/portal/admin/markers/[testKey]/page.tsx` | page | edit form | same two analogs as above | role-match |
| `src/app/portal/admin/page.tsx` (ADMIN_SECTIONS) | UI config | static array push | existing entries (lines 6-71) | exact |
| `src/components/forms/CustomMarkersBlock.tsx` | component | request-response (client-fetched markers + onChange) | composition of `FormField`/`FormRow` (every Section1-10); fetch+state mirrors `MarkerContentList.tsx` | role-match |
| `src/components/sections/Section{1..10}.tsx` | components | passthrough | existing close-of-form pattern (each section's last `</div></div>` before `);}`) | exact |
| `src/lib/pillars/mapping.ts` (`markerToPillar` extension) | utility | transform | existing function lines 71-116 | exact |
| `src/lib/audit.ts` (AuditAction union) | type | n/a | existing union lines 6-29 | exact |
| `src/lib/report/load-report-data.ts` (REPORT_MARKERS swap) | service | transform | existing iteration lines 63-100 | exact |
| `src/components/sections/Section11.tsx` (REPORT_MARKERS swap) | component | transform | existing iterations lines 214-253 | exact |

---

## Pattern Assignments

### 1. `markers` Drizzle table → `src/lib/db/schema.ts` and `src/lib/db/schema-sqlite.ts`

**Analog:** `markerContent` table (Phase 11) + `normativeRanges` table (Phase 3) in the same file.

**File:** `/Users/jace/Code/peak360/src/lib/db/schema.ts:108-115` — Postgres definition:
```typescript
export const markerContent = pgTable('marker_content', {
  testKey: text('test_key').primaryKey(),          // matches REPORT_MARKERS[].testKey
  definition: text('definition'),                  // gender-neutral, nullable
  impact: text('impact'),                          // gender-neutral, nullable
  coachInsights: jsonb('coach_insights'),          // Record<RatingTier, { male: string|null; female: string|null }>
  updatedBy: text('updated_by').notNull(),
  updatedAt: integer('updated_at').notNull(),      // epoch ms — matches pillarDefinitions convention
});
```

**File:** `/Users/jace/Code/peak360/src/lib/db/schema.ts:42-54` — `normativeRanges` for the `tiers: jsonb` + `severityWeight: integer` + `category: text` column shapes that D-02 mirrors:
```typescript
export const normativeRanges = pgTable('normative_ranges', {
  id: serial('id').primaryKey(),
  testKey: text('test_key').notNull(),
  category: text('category').notNull(),
  gender: text('gender'),
  ageGroup: text('age_group'),
  unit: text('unit'),
  note: text('note'),
  tiers: jsonb('tiers'),
  severityWeight: integer('severity_weight'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
```

**Conventions to clone for `markers`:**
- Use `pgTable('markers', { … })` in `schema.ts` and `sqliteTable('markers', { … })` in `schema-sqlite.ts`.
- camelCase TS field names, snake_case SQL column names (`testKey`/`test_key`, `dataKey`/`data_key`, `hasNorms`/`has_norms`, `aiAliases`/`ai_aliases`, `severityWeight`/`severity_weight`, `fallbackUnit`/`fallback_unit`).
- **Epoch ms for `createdAt`/`updatedAt`** (`integer('created_at').notNull()`) — matches `markerContent`/`pillarDefinitions`, not the older `text(ISO)` of `normativeRanges`. CONTEXT D-02 spells out `INTEGER NOT NULL`.
- `boolean('has_norms').notNull()` (PG); SQLite uses `integer('has_norms', { mode: 'boolean' })` — check `schema-sqlite.ts` `user.emailVerified` pattern.
- `jsonb('ai_aliases')` (PG) / `text('ai_aliases', { mode: 'json' })` (SQLite).
- `text('test_key').primaryKey()` — mirrors `markerContent`.

**Required additional change:** `runMigrations()` in `src/lib/db/index.ts` needs a parallel `CREATE TABLE IF NOT EXISTS "markers" (…)` block in BOTH the PG branch (around line 300) and the SQLite branch (around line 564), following the exact pattern of the `marker_content` blocks already there. No seed data — D-03 says no migration of seeded markers.

**Blocking task:** After schema edit, run `npm run db:generate` + `npm run db:push` (per CLAUDE.md `## Commands`).

---

### 2. `src/lib/markers/queries.ts` — query layer

**Analog:** `/Users/jace/Code/peak360/src/lib/marker-content/queries.ts` (exact match — same role, same shape).

**Full file (58 lines) shows the pattern to clone:** typed interface declaration, `getAllX()` returning `Promise<X[]>`, `getXByKey(testKey)` returning `Promise<X | null>`, defensive `Record<string, unknown>` row coercion. Reproduce:

```typescript
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { markerContent } from '@/lib/db/schema';

export interface MarkerContent { testKey: string; … }

export async function getAllMarkerContent(): Promise<MarkerContent[]> {
  const rows = await db.select().from(markerContent);
  return rows.map((r: Record<string, unknown>) => ({ … }));
}

export async function getMarkerContentByKey(testKey: string): Promise<MarkerContent | null> {
  const rows = await db.select().from(markerContent).where(eq(markerContent.testKey, testKey));
  const r = rows[0] as Record<string, unknown> | undefined;
  if (!r) return null;
  return { … };
}
```

**Secondary analog for the multi-variant case:** `/Users/jace/Code/peak360/src/lib/normative/db-ranges.ts:75-137` shows the `upsertDbRange` pattern (gender/ageGroup null-safe predicate building with `and(eq(…), isNull(…))`), and the dual-schema runtime switch (lines 4-14) that selects PG vs SQLite schema at runtime based on `process.env.DATABASE_URL`. Phase 12's `markers` queries do NOT need the dual-schema dance if all reads/writes use the PG `markers` import directly (the existing `marker-content/queries.ts` does that — uses PG schema for everything, relies on Drizzle's PG-compatible SQLite mode).

**Required exports for Phase 12:**
- `getAllMarkers(): Promise<MarkerRow[]>`
- `getMarkerByTestKey(testKey: string): Promise<MarkerRow | null>`
- `createMarker(input): Promise<MarkerRow>`
- `updateMarker(testKey, input, sentUpdatedAt): Promise<MarkerRow>` — includes optimistic-concurrency check
- `deleteMarker(testKey): Promise<{ deletedMarker: number; deletedContent: number; deletedRanges: number }>`

---

### 3. `getReportMarkers()` merge helper (D-01) → `src/lib/markers/registry.ts`

**Analog 1 — DB-over-hardcoded fallback pattern (best match):** `/Users/jace/Code/peak360/src/lib/normative/ratings.ts:73-80` `getStandards()` is the canonical "if DB row, use it; else fall back to hardcoded" resolver in this codebase. Then `/Users/jace/Code/peak360/src/lib/normative/db-ranges.ts:177-204` `preloadDbRanges()` is how the report loader pre-fetches all DB rows into a Map once per request to avoid N+1.

**Analog 2 — merge by key with DB wins:** No existing exact analog returns "seed ∪ DB rows de-duplicated by testKey". The closest semantic is the conflict-resolution comment in `pillar-page-data.ts:220` ("REPORT_MARKERS order wins"); Phase 12 inverts that — DB wins over seed.

**Pattern to write (greenfield-ish, model after preloadDbRanges shape):**
```typescript
// src/lib/markers/registry.ts
import { REPORT_MARKERS, type MarkerDef } from '@/lib/report-markers';
import { getAllMarkers } from '@/lib/markers/queries';

export type RegistryMarker = MarkerDef & {
  pillar?: PillarKey;       // present only on DB rows (D-07)
  source: 'seed' | 'db';
  aiAliases?: string[];
};

export async function getReportMarkers(): Promise<RegistryMarker[]> {
  const dbRows = await getAllMarkers();
  const seen = new Set(dbRows.map((r) => r.testKey));
  const merged: RegistryMarker[] = [];
  // Seed first (preserves existing order), skipping any keys the DB has overridden
  for (const m of REPORT_MARKERS) {
    if (seen.has(m.testKey)) continue;
    merged.push({ ...m, source: 'seed' });
  }
  // DB rows last, in created_at order (assumption #3)
  for (const r of dbRows) {
    merged.push({ ...r, source: 'db' });
  }
  return merged;
}
```

**Decision per "Claude's Discretion" in CONTEXT:** memoize behind a per-request cache OR a 30s LRU; pick async-no-cache for v1 — every existing analog uses async-no-cache (e.g. `loadReportData` reloads everything per render). The merge is cheap (~100 rows). Document the choice in the plan.

---

### 4. `getFieldMappings()` merge helper (D-04) → `src/lib/markers/field-mappings.ts`

**No existing analog** — this is greenfield. Model after `getReportMarkers()` itself.

**Consumer to update:** `/Users/jace/Code/peak360/src/app/api/ai/extract/route.ts:4` (`import { fieldMappings } from '@/lib/ai/field-mappings'`) and line 107 (the call site `fieldMappings[lowerKey] || fieldMappings[key] || key`). Swap to `await getFieldMappings()` once at the top of the POST handler, then keep using it as a plain `Record<string, string>` to minimize the diff.

**Pattern to write:**
```typescript
// src/lib/markers/field-mappings.ts
import { fieldMappings } from '@/lib/ai/field-mappings';
import { getAllMarkers } from '@/lib/markers/queries';

export async function getFieldMappings(): Promise<Record<string, string>> {
  const dbRows = await getAllMarkers();
  const merged: Record<string, string> = { ...fieldMappings };
  for (const m of dbRows) {
    if (!Array.isArray(m.aiAliases)) continue;
    for (const alias of m.aiAliases) {
      const key = String(alias).toLowerCase().trim();
      if (!key) continue;
      merged[key] = m.dataKey; // DB wins over hardcoded on alias collision
    }
  }
  return merged;
}
```

---

### 5. Admin API routes → `/api/admin/markers[/[testKey]]`

**Best analog:** `/Users/jace/Code/peak360/src/app/api/admin/marker-content/[marker]/route.ts` (full file, lines 1-207). This is the single closest match — same domain (per-marker admin authoring), same gate, same upsert + audit, same optimistic-concurrency on `updatedAt`.

**Auth gate** (lines 1-6 imports + every handler's lines 1-3):
```typescript
import { requireAdmin } from '@/lib/auth-helpers';
import { logAuditEvent, getRequestContext } from '@/lib/audit';

export async function PUT(request, { params }) {
  const [session, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;
  …
}
```

**Optimistic concurrency** (lines 138-154):
```typescript
if (body.updatedAt != null) {
  const [current] = await db
    .select({ updatedAt: markerContent.updatedAt })
    .from(markerContent)
    .where(eq(markerContent.testKey, marker));
  if (current && current.updatedAt > body.updatedAt) {
    return NextResponse.json(
      { success: false, error: 'This marker was updated by another admin. Reload to see their changes before saving.' },
      { status: 409 }
    );
  }
}
```

**Upsert** (lines 166-186):
```typescript
const now = Date.now();
await db
  .insert(markerContent)
  .values({ testKey: marker, definition, impact, coachInsights, updatedBy: session.user.id, updatedAt: now })
  .onConflictDoUpdate({
    target: markerContent.testKey,
    set: { definition, impact, coachInsights, updatedBy: session.user.id, updatedAt: now },
  });
```

**Audit emission** (lines 188-197):
```typescript
const ctx = await getRequestContext();
await logAuditEvent({
  userId: session.user.id,
  action: 'marker_content.update',
  resourceType: 'marker_content',
  resourceId: marker,
  metadata: { fields: Object.keys(body).filter((k) => k !== 'updatedAt') },
  ipAddress: ctx.ipAddress,
  userAgent: ctx.userAgent,
});
```

**For the list/create route** (`/api/admin/markers/route.ts`):

- `GET` shape clones `/Users/jace/Code/peak360/src/app/api/admin/marker-content/route.ts:38-59` — `requireAdmin`, `runMigrations()`, `db.select().from(markers)`, `{ success: true, data: { rows } }`.
- `POST` is new; validation (regex `^[a-z][a-z0-9_]*$` for test_key, enum check on pillar/section) clones the validation style from `/Users/jace/Code/peak360/src/app/api/admin/normative/[marker]/route.ts:10-37` (`validateTiers`). The uniqueness check (DB + in-memory REPORT_MARKERS) must explicitly do BOTH:
  ```typescript
  if (REPORT_MARKERS.some((m) => m.testKey === body.testKey)) {
    return NextResponse.json({ success: false, error: 'testKey conflicts with a seeded marker' }, { status: 409 });
  }
  const existing = await getMarkerByTestKey(body.testKey);
  if (existing) return NextResponse.json({ success: false, error: 'testKey already in use' }, { status: 409 });
  ```
- Atomic write of marker row + initial `normativeRanges` row uses `upsertDbRange` from `/Users/jace/Code/peak360/src/lib/normative/db-ranges.ts:75-137` — same file already used by the normative editor route. Wrap in a try/catch; do NOT use a real transaction unless one already exists in the codebase (none does).

**For the `[testKey]` route's PUT** — add the **`data_key` immutability guard** noted in D-13:
```typescript
if (body.dataKey && body.dataKey !== existing.dataKey) {
  return NextResponse.json(
    { success: false, error: 'dataKey cannot be changed after creation (would orphan existing assessment data)' },
    { status: 400 }
  );
}
```

**For the `DELETE` cascade** — three deletes in sequence (no real transaction available):
1. `await deleteDbRange(testKey)` (from db-ranges.ts)
2. `await db.delete(markerContent).where(eq(markerContent.testKey, testKey))`
3. `await db.delete(markers).where(eq(markers.testKey, testKey))`
Then emit a single audit event with metadata describing the cascade.

---

### 6. Client-readable `GET /api/markers` (D-14)

**No exact existing "marker-content for any role" analog exists** — `/api/admin/marker-content` requires admin. The pattern to clone is the auth-gate swap from `requireAdmin` → `requireSession`:

**Analog import:** `/Users/jace/Code/peak360/src/lib/auth-helpers.ts:37-46` defines `requireSession()` returning `[session, null] | [null, NextResponse(401)]`.

**Pattern to write** (`src/app/api/markers/route.ts`):
```typescript
import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth-helpers';
import { getReportMarkers } from '@/lib/markers/registry';

export async function GET() {
  const [, errorRes] = await requireSession();
  if (errorRes) return errorRes;

  try {
    const markers = await getReportMarkers();
    return NextResponse.json({ success: true, data: { markers } });
  } catch {
    return NextResponse.json({ success: false, error: 'Could not load markers.' }, { status: 500 });
  }
}
```

No audit (read-only). No POST/PUT/DELETE — writes go through admin routes.

---

### 7. Admin UI pages → `/portal/admin/markers/{page,new/page,[testKey]/page}.tsx`

**List page analog:** `/Users/jace/Code/peak360/src/app/portal/admin/marker-content/page.tsx` (full file, 55 lines) — SSR session gate (lines 17-20) + Hero header (lines 25-47) + child client component (`MarkerContentList`). Use this skeleton verbatim, swap "MARKER CONTENT" → "MARKERS" and the child to `MarkersList`.

**SSR auth gate to clone (lines 17-20):**
```typescript
const rawSession = await auth.api.getSession({ headers: await headers() });
if (!rawSession?.user) redirect('/login');
const session = rawSession as unknown as AuthSession;
if (session.user.role !== 'admin') redirect('/portal');
```

**Hero header pattern (lines 25-47):** breadcrumb back-link → `MonoEyebrow variant="hero"` → `<h1>` → `<p>` description. Inherits Phase 9 dark portal styling (`text-text`, `text-text-dim`, `bg-bg-3`, `border-line`, `text-gold-brand`).

**Section accordion list pattern:** `MarkerContentList.tsx` (full file, 122 lines) — search input + `useMemo`-grouped sections + per-row hover link styling (lines 89-114). Adapt to group by `section` (1-10) instead of category. Render seeded markers with a muted "SEEDED" badge (analog: the `StatusPill` `HC` badge in `/portal/admin/normative/page.tsx:18-28`), DB markers with edit/delete actions.

**Edit page analog (form scaffolding):** `/Users/jace/Code/peak360/src/app/portal/admin/marker-content/[marker]/page.tsx` (full file, ~400 lines) — `use(params)` (line 54), useState pattern (lines 56-66), fetch-on-mount (lines 69-91), `isDirty` + `beforeunload` guard (the latter at line 172-179 of normative editor), save button with success state (lines 60-63). Same shape works here.

**Edit page analog (tier-ranges editor sub-component):** `/Users/jace/Code/peak360/src/app/portal/admin/normative/[marker]/page.tsx` (lines 1-180). The new "inline ranges" block in the create form (D-05, unisex only at create time) borrows just the 5-tier min/max-pair editor — lines 26-34 (`emptyTiers`), lines 36-57 (`validateTiers`).

**Form composition primitive:** `<FormField>` from `/Users/jace/Code/peak360/src/components/forms/FormField.tsx:1-50` (`id`, `label`, `type`, `value`, `onChange`, `step`, `placeholder`, `required`). Used everywhere in Section1-10; reuse for the create-marker form's label/category/subcategory/unit/severityWeight inputs.

**Delete confirm:** No existing destructive-confirm modal pattern is in the admin dirs — adopt an inline confirm (e.g. button labelled "Confirm delete" appearing after first click).

---

### 8. Admin nav card → `src/app/portal/admin/page.tsx` ADMIN_SECTIONS

**Analog:** `/Users/jace/Code/peak360/src/app/portal/admin/page.tsx:6-71` (the existing `ADMIN_SECTIONS` array). Push a new entry between "Marker Content" (line 22-38) and "Audit Logs" (line 39-54):

```typescript
{
  label: 'Markers',
  href: '/portal/admin/markers',
  description: 'Add or remove markers from any assessment section. Configure pillar, normative ranges, and AI extraction aliases.',
  stat: 'Registry',
  icon: (<svg className="w-7 h-7" … />),  // pick a plus-in-circle or list-plus icon
},
```

The card is rendered automatically by the `.map()` at line 97.

---

### 9. `CustomMarkersBlock` component (D-08) → `src/components/forms/CustomMarkersBlock.tsx`

**No exact analog** — this is a NEW shared component, but it composes three existing patterns:

1. **Client-fetch on mount** — clone the `useEffect`/`fetch`/`json => setX` pattern from `/Users/jace/Code/peak360/src/app/portal/admin/normative/page.tsx:58-69` (`fetchOverrides` callback + `useEffect(() => { fetchOverrides() }, [])`).
2. **Numeric field composition** — clone Section5's pattern (e.g. line 240 of Section5.tsx):
   ```typescript
   const n = (field: string) => (v: string) => onChange(field, v === '' ? null : Number(v));
   …
   <FormField id="rbc" label="RBC (million/mcL)" type="number" value={data.rbc as number} onChange={n('rbc')} step={0.01} />
   ```
3. **Self-hide when empty** — pattern: `if (filtered.length === 0) return null;` at top of render.

**Required props/shape:**
```typescript
interface CustomMarkersBlockProps {
  section: number;             // 1..10
  data: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
}

export default function CustomMarkersBlock({ section, data, onChange }: CustomMarkersBlockProps) {
  const [markers, setMarkers] = useState<RegistryMarker[]>([]);
  useEffect(() => {
    fetch('/api/markers').then((r) => r.json()).then((j) => {
      if (j.success) setMarkers(j.data.markers.filter((m: RegistryMarker) => m.source === 'db' && m.section === section));
    });
  }, [section]);

  if (markers.length === 0) return null;

  const n = (field: string) => (v: string) => onChange(field, v === '' ? null : Number(v));

  return (
    <div className="bg-bg-3 rounded-xl border border-line p-4 sm:p-6 space-y-4">
      <h3 className="text-[14px] font-medium text-text">Custom markers</h3>
      <FormRow>
        {markers.map((m) => (
          <FormField
            key={m.testKey}
            id={m.dataKey}
            label={`${m.label}${m.fallbackUnit ? ` (${m.fallbackUnit})` : ''}`}
            type="number"
            value={data[m.dataKey] as number}
            onChange={n(m.dataKey)}
            step={0.01}
          />
        ))}
      </FormRow>
    </div>
  );
}
```

**Imports** to match Section file conventions:
```typescript
'use client';
import { useEffect, useState } from 'react';
import FormField from '@/components/forms/FormField';
import FormRow from '@/components/forms/FormRow';
```

---

### 10. Section component touch points (D-09)

Each Section1–10 gets a single insertion of `<CustomMarkersBlock section={N} data={data} onChange={onChange} />` immediately before the closing `</div>` of the outermost wrapper (the one that sits inside `return ( … )`). Line numbers are from current HEAD.

| File | Insertion line (immediately before this line) | Closing wrapper above this line |
|------|-----------------------------------------------|---------------------------------|
| `src/components/sections/Section1.tsx` | 146 | `</div>` (form wrapper) at L145 |
| `src/components/sections/Section2.tsx` | 86 | `</div>` at L85 |
| `src/components/sections/Section3.tsx` | 112 (before final `</div>` at L111) | — |
| `src/components/sections/Section4.tsx` | 115 (before final `</div>` at L114) | — |
| `src/components/sections/Section5.tsx` | 295 (after the last `<TestCategory>` block at L286-293, before `</div></div>` L294-295) | `<TestCategory title="Heavy Metals Screen">` ends at L293 |
| `src/components/sections/Section6.tsx` | 169 (before final `</div>` at L168) | `</div>` wrapping the bottom `<FormRow>`s closes at L168 |
| `src/components/sections/Section7.tsx` | 38 (before final `</div>` at L37) | Vitals card closes at L37 |
| `src/components/sections/Section8.tsx` | 167 (before final `</div>` at L167) | Last `TestRow` ends at L166 |
| `src/components/sections/Section9.tsx` | 75 (before final `</div>` at L74) | `</div>` at L74 |
| `src/components/sections/Section10.tsx` | 20 (before final `</div>` at L19) | informational card closes at L19 |

**Section10 special case:** Section10 currently has no FormField — the file is a placeholder noting balance/power moved to Section 8. The `CustomMarkersBlock` should still be inserted (Section 10 admin-added markers would render in its own card; otherwise self-hides via the `markers.length === 0` short-circuit). Confirm in plan whether Section 10 stays in scope; D-08 says "Section1.tsx–Section10.tsx".

**Pattern for each insert (uniform — make a single mechanical commit per section file or one batch commit):**
```tsx
      </div>  {/* existing closing wrapper */}
      <CustomMarkersBlock section={N} data={data} onChange={onChange} />
    </div>  {/* outermost wrapper - already exists */}
  );
}
```

Add the import at top of each section file:
```typescript
import CustomMarkersBlock from '@/components/forms/CustomMarkersBlock';
```

---

### 11. `markerToPillar` extension (D-07) → `src/lib/pillars/mapping.ts`

**Analog (the function itself):** `/Users/jace/Code/peak360/src/lib/pillars/mapping.ts:71-116`. Function signature already accepts a wide `ClassifiableMarker` shape (lines 63-69) with optional `testKey`/`key`/`subcategory` — DB rows satisfy it.

**Insertion point:** The very top of the function body (line 74, after `const testKey = m.testKey ?? m.key ?? '';`). Add a DB-marker short-circuit BEFORE the BALANCE_REGEX check:

```typescript
export function markerToPillar(m: ClassifiableMarker): {
  pillar: PillarKey | null;
  supporting: boolean;
} {
  const testKey = m.testKey ?? m.key ?? '';
  const label = m.label ?? '';

  // Phase 12 D-07 — DB-driven markers carry their pillar directly
  if ('pillar' in m && m.pillar) {
    return { pillar: m.pillar as PillarKey, supporting: false };
  }

  const haystack = `${testKey} ${label}`;
  if (BALANCE_REGEX.test(haystack)) { … }
  …
}
```

Widen `ClassifiableMarker` (lines 63-69) to accept optional `pillar?: PillarKey | null`:
```typescript
type ClassifiableMarker = {
  category: string;
  subcategory?: string;
  testKey?: string;
  key?: string;
  label: string;
  pillar?: PillarKey | null;   // Phase 12 — DB-driven short-circuit
};
```

**Test:** existing test dir `/Users/jace/Code/peak360/src/lib/pillars/__tests__/` has at least one mapping test — add a case covering the new branch.

---

### 12. AuditAction additions (D-13) → `src/lib/audit.ts`

**Analog (the union):** `/Users/jace/Code/peak360/src/lib/audit.ts:6-29`. Append three new members at the end of the union (preserve trailing comment style):

```typescript
export type AuditAction =
  | 'assessment.view'
  | 'section.edit'
  | …
  // Phase 11 — Marker content authoring (D-11)
  | 'marker_content.update'
  // Phase 12 — Admin-managed marker registry (D-13)
  | 'marker.create'
  | 'marker.update'
  | 'marker.delete';
```

**Note the convention:** namespace.verb, lowercase, dot-separated. Existing Phase 11 used underscore in `marker_content.update` to disambiguate from "marker"; Phase 12 deliberately uses bare `marker.*` per CONTEXT D-13 ("`'marker.create'`, `'marker.update'`, `'marker.delete'`").

**Emit pattern** is identical for all three actions (see snippet in §5 above).

---

### 13. PDF integration (D-11) — `src/lib/report/load-report-data.ts`

**Analog (the call site to swap):** `/Users/jace/Code/peak360/src/lib/report/load-report-data.ts:4` (import) and line 63 (`for (const m of REPORT_MARKERS) {`).

**Single-line semantic change:**
```typescript
// Before:
import { REPORT_MARKERS } from '@/lib/report-markers';
…
for (const m of REPORT_MARKERS) { … }

// After (function becomes await-ed; loadReportData already async):
import { getReportMarkers } from '@/lib/markers/registry';
…
const reportMarkers = await getReportMarkers();
for (const m of reportMarkers) { … }
```

Iteration body lines 63-100 remain unchanged — both `REPORT_MARKERS` rows and merged DB rows expose the same `testKey`/`dataKey`/`section`/`category`/`subcategory`/`fallbackUnit`/`hasNorms` shape.

**Note:** `src/lib/pdf/pillar-page-data.ts` mentions REPORT_MARKERS only in comments (lines 190-220) — no code change needed there for v1. `src/lib/pdf/pages/FullResultsPage.tsx:70` is also a comment-only reference. `src/lib/pdf/__tests__/marker-coverage.test.ts` still asserts against the hardcoded REPORT_MARKERS — leave it alone for v1 (it's a coverage guard for SEEDED markers only).

---

### 14. Section 11 integration (D-10) — `src/components/sections/Section11.tsx`

**Analog (the call sites to swap):** `/Users/jace/Code/peak360/src/components/sections/Section11.tsx`:
- Line 66 — import: `import { REPORT_MARKERS, type MarkerDef } from '@/lib/report-markers';` → swap to fetching via state since component is `'use client'`.
- Line 214 — `for (const m of REPORT_MARKERS) {`
- Line 243 — `const pillarMarkers = REPORT_MARKERS.map((m) => { … })`
- Line 285 — `const categories = [...new Set(REPORT_MARKERS.map((m) => m.category))];`

**Pattern for client-side fetch (Section11 is a client component):**
Add a `useState<RegistryMarker[]>([])` + fetch in the existing `useEffect` at lines 198-264 (the one that already does `loadReport`). Replace `REPORT_MARKERS` with the fetched array. The line 285 derivation (`categories`) moves inside the same effect or becomes derived state.

```typescript
// inside the existing useEffect
const markersRes = await fetch('/api/markers');
const markersJson = await markersRes.json();
const allMarkers: RegistryMarker[] = markersJson.success ? markersJson.data.markers : [];
…
for (const m of allMarkers) { /* lines 214-238 unchanged */ }
const pillarMarkers = allMarkers.map(…) // line 243
```

**`PillarsDisplay`** — verify whether it iterates `REPORT_MARKERS` itself: grep showed no direct import in `PillarsDisplay.tsx` (it consumes the already-evaluated `pillars`/`markers` props from Section11). No change required in `PillarsDisplay`.

---

### 15. Other `REPORT_MARKERS` import sweep — every consumer to consider

Grep results (full list — planner should treat each as a "decide: migrate to `getReportMarkers()` or leave as seed-only"):

| File | Lines | Recommendation |
|------|-------|----------------|
| `src/lib/report/load-report-data.ts` | 4, 63 | **MIGRATE** — primary PDF/report path (D-11) |
| `src/components/sections/Section11.tsx` | 66, 214, 243, 285 | **MIGRATE** — primary interactive report (D-10) |
| `src/app/portal/page.tsx` | 9, 587, 612, 649 | **MIGRATE** — dashboard reads section data per marker; same shape used |
| `src/app/portal/clients/[name]/page.tsx` | 8, 124, 144 | **MIGRATE** — client page reads section data per marker |
| `src/app/portal/clients/[name]/TrendsTab.tsx` | 5, 101, 267, 296 | **MIGRATE** — trends should include DB markers |
| `src/app/portal/admin/normative/page.tsx` | 4, 84 | **LEAVE** — normative editor is for seeded markers; DB markers' ranges are edited via the new markers editor |
| `src/app/portal/admin/normative/[marker]/page.tsx` | 4, 104 | **LEAVE** — same reason |
| `src/app/portal/admin/marker-content/page.tsx` | (none directly — via list child) | n/a |
| `src/app/portal/admin/marker-content/MarkerContentList.tsx` | 5, 21 | **LEAVE for v1** — content editor lists seeded markers; new markers redirect to this editor after create (D-06) but the LIST view can stay seeded-only for now. **Optional**: migrate to show DB markers too. Flag this in the plan as a decision. |
| `src/app/portal/admin/marker-content/[marker]/page.tsx` | 4, 70 | **MIGRATE** — must accept DB-marker testKeys, otherwise the post-create redirect (D-06) 404s. **Critical for v1.** |
| `src/app/api/admin/marker-content/[marker]/route.ts` | 3 (import), 65, 123 | **MIGRATE** — same reason: marker-not-found 404 logic must accept DB testKeys |
| `src/app/api/admin/normative/[marker]/route.ts` | 2, 49, 101, 196 | **MIGRATE** — same reason: ranges editor for DB markers (D-05 deferred editing flow) |
| `src/app/api/admin/red-flags/route.ts` | 3, 12 | **MIGRATE** — red-flags resolver should know about DB markers; verify if needed |
| `src/components/admin/NormativeEditPanel.tsx` | 4, 90 | **MIGRATE** — same reason as normative editor |
| `src/lib/pdf/pillar-page-data.ts` | (comments only, L190-220) | NO CHANGE — comments only |
| `src/lib/pdf/pages/FullResultsPage.tsx` | (comment only, L70) | NO CHANGE — comment only; verify the page actually iterates marker arrays passed in props, not REPORT_MARKERS directly |
| `src/lib/pdf/__tests__/marker-coverage.test.ts` | 2, 7, 19, 26, 29, 61 | **LEAVE** — this is a guard for SEEDED coverage; DB markers don't need pillar mapping (they carry their pillar directly via D-07) |
| `src/lib/report-markers.ts` | (the source) | LEAVE — canonical seed |
| `src/lib/db/schema.ts` | (comment only, L106) | NO CHANGE |
| `src/lib/marker-content/queries.ts` | (comment only, L9, L11) | NO CHANGE |
| `src/lib/db/index.ts` | 317, 583 | **LEAVE** — these are migration seed loops for `marker_content`, not runtime reads. Stay seed-only. |
| `src/lib/marker-content/seed-content.ts` | (comment only, L4) | NO CHANGE |
| `src/lib/pillars/mapping.ts` | (no direct import — comment only) | NO CHANGE |

**Count: 11 files to migrate, 8 to leave, 4 comment-only / N/A.**

---

## Shared Patterns

### Admin auth gate (server-side, both API routes and pages)

**Source (API routes):** `/Users/jace/Code/peak360/src/lib/auth-helpers.ts:50-60`
```typescript
const [session, errorRes] = await requireAdmin();
if (errorRes) return errorRes;
```
**Apply to:** all `/api/admin/markers/**` routes (and use `requireSession` for the client-readable `/api/markers`).

**Source (pages):** `/Users/jace/Code/peak360/src/app/portal/admin/marker-content/page.tsx:17-20`
```typescript
const rawSession = await auth.api.getSession({ headers: await headers() });
if (!rawSession?.user) redirect('/login');
const session = rawSession as unknown as AuthSession;
if (session.user.role !== 'admin') redirect('/portal');
```
**Apply to:** all `/portal/admin/markers/**` SSR pages.

### Audit emission

**Source:** `/Users/jace/Code/peak360/src/lib/audit.ts:31-71` + emission example at `marker-content/[marker]/route.ts:188-197`. **Apply to:** every PUT/POST/DELETE in the new admin routes. Fire-and-forget — failures must NEVER bubble up (the helper already swallows errors at line 52).

### Drizzle upsert + optimistic concurrency

**Source:** `/Users/jace/Code/peak360/src/app/api/admin/marker-content/[marker]/route.ts:138-186`. **Apply to:** the new `PUT /api/admin/markers/[testKey]` and (with adapter) the `POST /api/admin/markers` create flow's initial range write.

### `NextResponse.json` envelope

**Source:** every existing API route. **Apply to:** all new routes. Success: `{ success: true, data: {…} }`. Failure: `{ success: false, error: 'human-readable string' }` + status code (400 validation / 401 unauth / 403 forbidden / 404 not found / 409 conflict / 500 unexpected).

### Section-form FormField composition

**Source:** Section5 line 240+, Section7 lines 33-36, etc. **Apply to:** `CustomMarkersBlock`. Convention:
- `id={camelCaseDataKey}`, `label={"Label (unit)"}`, `type="number"`
- `value={data[dataKey] as number}`
- `onChange={n(dataKey)}` where `const n = (field) => (v) => onChange(field, v === '' ? null : Number(v));`

### Page hero header

**Source:** `/Users/jace/Code/peak360/src/app/portal/admin/marker-content/page.tsx:24-47` (the entire `<header>` block). **Apply to:** all three new admin pages. Phase 9 dark portal tokens: `bg-bg-3`, `border-line`, `text-text`, `text-text-dim`, `text-gold-brand`, `text-text-faint`, Inter Tight + JetBrains Mono via `<MonoEyebrow>` (per CONTEXT D-15).

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/lib/markers/field-mappings.ts` (`getFieldMappings()`) | service | transform/merge | No existing function merges a hardcoded record with DB-flattened aliases. Model after `getReportMarkers()` (also new) since they have identical shape requirements. |

---

## Metadata

**Analog search scope:**
- `src/lib/db/` (schema + migration)
- `src/lib/marker-content/`, `src/lib/normative/`, `src/lib/pillars/` (query layers)
- `src/app/api/admin/marker-content/`, `src/app/api/admin/normative/` (admin API)
- `src/app/portal/admin/` (admin UI)
- `src/components/sections/` (Section1-11 form anchors)
- `src/components/forms/` (FormField composition)
- `src/lib/audit.ts`, `src/lib/auth-helpers.ts` (cross-cutting)
- `src/lib/report/`, `src/lib/pdf/` (REPORT_MARKERS callsites)

**Files scanned:** 35+
**Pattern extraction date:** 2026-05-28
