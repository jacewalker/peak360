# Phase 11: Report marker-detail expansion + admin coach insights - Pattern Map

**Mapped:** 2026-05-26
**Files analyzed:** 11 new/modified files
**Analogs found:** 11 / 11

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/db/schema.ts` | model | CRUD | self (add `markerContent` pgTable) | exact — add table beside `pillarDefinitions` |
| `src/lib/db/index.ts` | config | batch | self (add `CREATE TABLE IF NOT EXISTS marker_content` + idempotent seed block) | exact — follow Phase 8 pillar block verbatim |
| `src/lib/audit.ts` | utility | event-driven | self (add `'marker_content.update'` to `AuditAction` union) | exact |
| `src/lib/marker-content/queries.ts` | utility | CRUD | `src/lib/pillars/queries.ts` | exact — same global-content read pattern |
| `src/app/api/admin/marker-content/[marker]/route.ts` | route | request-response | `src/app/api/admin/normative/[marker]/route.ts` | exact — same GET/PUT admin-gated + 409 concurrency |
| `src/app/api/admin/marker-content/route.ts` | route | request-response | `src/app/api/admin/normative/route.ts` | exact — admin-gated GET list |
| `src/app/api/marker-content/route.ts` | route | request-response | `src/app/api/assessments/[id]/sections/[num]/route.ts` (GET) | role-match — `requireSession`, any-role read |
| `src/app/portal/admin/marker-content/page.tsx` | page | request-response | `src/app/portal/admin/normative/page.tsx` | exact — client component, category-grouped list |
| `src/app/portal/admin/marker-content/[marker]/page.tsx` | page | request-response | `src/app/portal/admin/normative/[marker]/page.tsx` | exact — gender tabs, dirty guard, optimistic PUT |
| `src/components/report/PillarsDisplayModal.tsx` | component | event-driven | self (major extension — two-pane master/detail) | exact — extend in-place |
| `src/components/sections/Section11.tsx` | component | request-response | self (add fetch + thread-through in `loadReport()`) | exact — extend in-place |

---

## Pattern Assignments

### `src/lib/db/schema.ts` (model, CRUD)

**Analog:** self — add beside `pillarDefinitions` (lines 69–77)

**Existing `pillarDefinitions` column convention** (lines 69–77):
```typescript
export const pillarDefinitions = pgTable('pillar_definitions', {
  pillarKey: text('pillar_key').primaryKey(),
  label: text('label').notNull(),
  shortSummary: text('short_summary').notNull(),
  plainMeaning: text('plain_meaning').notNull(),
  sortOrder: integer('sort_order').notNull(),
  updatedBy: text('updated_by').notNull(),
  updatedAt: integer('updated_at').notNull(),  // epoch ms
});
```

**New table to add** (follow D-08 verbatim):
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

**Imports needed** (line 1):
```typescript
import { pgTable, text, integer, serial, jsonb, primaryKey, boolean } from 'drizzle-orm/pg-core';
```

---

### `src/lib/db/index.ts` (config, batch — idempotent migrations + seed)

**Analog:** self — follow the Phase 8 pillar block pattern exactly (lines 238–297 for Postgres, lines 475–533 for SQLite)

**Postgres block pattern** (lines 274–297):
```typescript
// Inside runMigrations(), after all other Phase 8 tables:
await d.execute(sql`
  CREATE TABLE IF NOT EXISTS "marker_content" (
    "test_key" text PRIMARY KEY NOT NULL,
    "definition" text,
    "impact" text,
    "coach_insights" jsonb,
    "updated_by" text NOT NULL,
    "updated_at" bigint NOT NULL
  )
`);

// Idempotent seed — insert-if-absent per test_key
{
  const now11 = Date.now();
  // One INSERT ... ON CONFLICT DO NOTHING block per marker batch
  // (split across multiple execute() calls if the query grows large)
  await d.execute(sql`
    INSERT INTO "marker_content" ("test_key", "definition", "impact", "coach_insights", "updated_by", "updated_at")
    VALUES (...)
    ON CONFLICT ("test_key") DO NOTHING
  `);
}
```

**SQLite block pattern** (lines 512–533 style):
```typescript
d.run(sql`
  CREATE TABLE IF NOT EXISTS "marker_content" (
    "test_key" text PRIMARY KEY NOT NULL,
    "definition" text,
    "impact" text,
    "coach_insights" text,      -- SQLite stores JSONB as text
    "updated_by" text NOT NULL,
    "updated_at" integer NOT NULL
  )
`);
// Seed uses INSERT OR IGNORE instead of ON CONFLICT DO NOTHING:
d.run(sql`
  INSERT OR IGNORE INTO "marker_content" (...)
  VALUES (...)
`);
```

**Key seed idiom** — idempotency is guaranteed by `ON CONFLICT ("test_key") DO NOTHING` (Postgres) or `INSERT OR IGNORE` (SQLite). Do NOT use `DO UPDATE` — that would overwrite admin edits.

---

### `src/lib/audit.ts` (utility, event-driven — add one union member)

**Analog:** self (lines 6–22)

**Existing union** (lines 6–22):
```typescript
export type AuditAction =
  | 'assessment.view'
  | 'section.edit'
  | 'report.export'
  | 'file.upload'
  | 'normative.update'
  | 'user.manage'
  | 'user.role.changed'
  | 'user.role.rollback'
  | 'user.name.changed'
  | 'user.password.reset'
  | 'user.coach.assigned'
  // Phase 8 — Peak Living pillar authoring (D-16, D-20)
  | 'pillar_definition.update'
  | 'pillar_page_copy.update'
  | 'pillar_prescription.upsert'
  | 'pillar_prescription.delete';
```

**Addition** — append after `'pillar_prescription.delete'`:
```typescript
  // Phase 11 — Marker content authoring (D-11)
  | 'marker_content.update';
```

**`logAuditEvent` call pattern** (lines 24–48 — copy exactly):
```typescript
await logAuditEvent({
  userId: session.user.id,
  action: 'marker_content.update',
  resourceType: 'marker_content',
  resourceId: marker,           // the testKey
  metadata: { fields: ['definition', 'impact', 'coachInsights'] },
  ipAddress: ctx.ipAddress,
  userAgent: ctx.userAgent,
});
```

---

### `src/lib/marker-content/queries.ts` (utility, CRUD — server-side read)

**Analog:** `src/lib/pillars/queries.ts` (entire file, lines 1–72)

**Imports pattern** (lines 1–13):
```typescript
import { db } from '@/lib/db';
import { markerContent } from '@/lib/db/schema';
import type { RatingTier } from '@/types/normative';
```

**TypeScript shape** (mirrors `PillarDefinition` from pillars/types):
```typescript
export interface MarkerContent {
  testKey: string;
  definition: string | null;
  impact: string | null;
  coachInsights: Record<RatingTier, { male: string | null; female: string | null }> | null;
  updatedBy: string;
  updatedAt: number;
}
```

**Core read query pattern** (lines 27–41 of queries.ts):
```typescript
export async function getAllMarkerContent(): Promise<MarkerContent[]> {
  const rows = await db.select().from(markerContent);
  return rows.map((r: Record<string, unknown>) => ({
    testKey: r.testKey as string,
    definition: (r.definition as string | null) ?? null,
    impact: (r.impact as string | null) ?? null,
    coachInsights: (r.coachInsights as MarkerContent['coachInsights']) ?? null,
    updatedBy: r.updatedBy as string,
    updatedAt: r.updatedAt as number,
  }));
}

export async function getMarkerContentByKey(testKey: string): Promise<MarkerContent | null> {
  const rows = await db
    .select()
    .from(markerContent)
    .where(eq(markerContent.testKey, testKey));
  const r = rows[0] as Record<string, unknown> | undefined;
  if (!r) return null;
  return {
    testKey: r.testKey as string,
    definition: (r.definition as string | null) ?? null,
    impact: (r.impact as string | null) ?? null,
    coachInsights: (r.coachInsights as MarkerContent['coachInsights']) ?? null,
    updatedBy: r.updatedBy as string,
    updatedAt: r.updatedAt as number,
  };
}
```

---

### `src/app/api/admin/marker-content/[marker]/route.ts` (route, request-response — admin GET/PUT)

**Analog:** `src/app/api/admin/normative/[marker]/route.ts` (entire file, lines 1–227)

**Imports pattern** (lines 1–6):
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { REPORT_MARKERS } from '@/lib/report-markers';
import { db } from '@/lib/db';
import { markerContent } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth-helpers';
import { logAuditEvent, getRequestContext } from '@/lib/audit';
import type { RatingTier } from '@/types/normative';
```

**Admin gate pattern** (lines 43–44 of normative route):
```typescript
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ marker: string }> }
) {
  const [, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;
  // ...
}
```

**Marker-not-found check** (lines 49–54):
```typescript
const markerDef = REPORT_MARKERS.find((m) => m.testKey === marker);
if (!markerDef) {
  return NextResponse.json(
    { success: false, error: 'Marker not found' },
    { status: 404 }
  );
}
```

**409 optimistic-concurrency check** (lines 130–143 of normative route — clone verbatim for `updatedAt` integer epoch ms):
```typescript
// Optimistic locking: if client sends updatedAt, reject if server's is newer
if (body.updatedAt != null) {
  const [current] = await db
    .select({ updatedAt: markerContent.updatedAt })
    .from(markerContent)
    .where(eq(markerContent.testKey, marker));
  if (current && current.updatedAt > body.updatedAt) {
    return NextResponse.json(
      {
        success: false,
        error: 'This marker was updated by another admin. Reload to see their changes before saving.',
      },
      { status: 409 }
    );
  }
}
```

**Upsert pattern** (mirrors normative upsertDbRange; use Drizzle `onConflictDoUpdate` like pillars route lines 88–113):
```typescript
await db
  .insert(markerContent)
  .values({
    testKey: marker,
    definition: body.definition ?? null,
    impact: body.impact ?? null,
    coachInsights: body.coachInsights ?? null,
    updatedBy: session.user.id,
    updatedAt: Date.now(),
  })
  .onConflictDoUpdate({
    target: markerContent.testKey,
    set: {
      definition: body.definition ?? null,
      impact: body.impact ?? null,
      coachInsights: body.coachInsights ?? null,
      updatedBy: session.user.id,
      updatedAt: Date.now(),
    },
  });
```

**Audit pattern** (lines 120–132 of pillars route):
```typescript
const ctx = await getRequestContext();
await logAuditEvent({
  userId: session.user.id,
  action: 'marker_content.update',
  resourceType: 'marker_content',
  resourceId: marker,
  metadata: { fields: Object.keys(body).filter(k => k !== 'updatedAt') },
  ipAddress: ctx.ipAddress,
  userAgent: ctx.userAgent,
});
return NextResponse.json({ success: true });
```

**Success response shape** (line 174 of normative route):
```typescript
return NextResponse.json({ success: true, data: { updated: 1 } });
```

---

### `src/app/api/admin/marker-content/route.ts` (route, request-response — admin GET list)

**Analog:** `src/app/api/admin/normative/route.ts` (lines 1–27)

**Full pattern** (entire file):
```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { markerContent } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth-helpers';

export async function GET() {
  const [, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;

  try {
    const rows = await db.select().from(markerContent);
    const authoredKeys = new Set(
      rows.filter(r => r.definition || r.impact || r.coachInsights).map(r => r.testKey)
    );
    return NextResponse.json({
      success: true,
      data: { rows, authoredKeys: [...authoredKeys] },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Could not load marker content.' },
      { status: 500 }
    );
  }
}
```

---

### `src/app/api/marker-content/route.ts` (route, request-response — any-role authenticated GET)

**Analog:** `src/app/api/assessments/[id]/sections/[num]/route.ts` GET handler (lines 25–68) — `requireSession`, no role gate beyond authenticated

**Imports + gate pattern** (lines 1–6, 29):
```typescript
import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth-helpers';
import { getAllMarkerContent } from '@/lib/marker-content/queries';

export async function GET() {
  const [, errorRes] = await requireSession();
  if (errorRes) return errorRes;

  try {
    const rows = await getAllMarkerContent();
    return NextResponse.json({ success: true, data: rows });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Could not load marker content.' },
      { status: 500 }
    );
  }
}
```

---

### `src/app/portal/admin/marker-content/page.tsx` (page, request-response — admin list)

**Analog:** `src/app/portal/admin/normative/page.tsx` (entire file, lines 1–253) — client component with category-grouped marker list, search, filter, status pills, and optional split-panel editor.

**For marker-content list, the pattern is simpler** — a static list (no inline edit panel needed since each marker links to `/portal/admin/marker-content/[marker]`). The SSR admin gate from `src/app/portal/admin/pillars/page.tsx` is preferred here since the list needs no client state:

**SSR admin gate pattern** (lines 1–23 of pillars/page.tsx):
```typescript
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { AuthSession } from '@/lib/auth-helpers';

export default async function AdminMarkerContentPage() {
  const rawSession = await auth.api.getSession({ headers: await headers() });
  if (!rawSession?.user) redirect('/login');
  const session = rawSession as unknown as AuthSession;
  if (session.user.role !== 'admin') redirect('/portal');
  // ...
}
```

**Category-grouped marker list pattern** (lines 147–209 of normative/page.tsx):
```typescript
// Grouped by REPORT_CATEGORIES, each marker is a Link to /portal/admin/marker-content/[testKey]
// Status pill shows: "Authored" (has definition/impact/coachInsights) | "Draft" (seeded but not edited) | "—" (no content)
import { REPORT_MARKERS, REPORT_CATEGORIES } from '@/lib/report-markers';
{REPORT_CATEGORIES.map(cat => {
  const markers = REPORT_MARKERS.filter(m => m.category === cat);
  return (
    <section key={cat}>
      <h2 className="font-mono text-[11px] font-medium text-text-faint uppercase tracking-[0.18em]">{cat}</h2>
      {markers.map(m => (
        <Link key={m.testKey} href={`/portal/admin/marker-content/${m.testKey}`}>
          {m.label}
        </Link>
      ))}
    </section>
  );
})}
```

---

### `src/app/portal/admin/marker-content/[marker]/page.tsx` (page, request-response — admin editor)

**Analog:** `src/app/portal/admin/normative/[marker]/page.tsx` (entire file, lines 1–509) — exact clone. The primary differences are content fields (definition, impact, coachInsights matrix) vs tier ranges.

**Component signature + state** (lines 66–88):
```typescript
'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { REPORT_MARKERS } from '@/lib/report-markers';
import type { RatingTier } from '@/types/normative';

const TIER_ORDER: RatingTier[] = ['poor', 'cautious', 'normal', 'great', 'elite'];

export default function MarkerContentEditorPage({
  params,
}: {
  params: Promise<{ marker: string }>;
}) {
  const { marker } = use(params);

  const [markerDef, setMarkerDef] = useState(null);
  const [definition, setDefinition] = useState('');
  const [impact, setImpact] = useState('');
  const [coachInsights, setCoachInsights] = useState<
    Record<RatingTier, { male: string; female: string }>
  >(/* empty matrix */);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverUpdatedAt, setServerUpdatedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeGender, setActiveGender] = useState<'male' | 'female'>('male');
}
```

**`beforeunload` guard** (lines 172–179 — copy verbatim):
```typescript
useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    if (isDirty) e.preventDefault();
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, [isDirty]);
```

**Fetch on mount** (lines 103–170 — adapt endpoint):
```typescript
useEffect(() => {
  const def = REPORT_MARKERS.find((m) => m.testKey === marker);
  setMarkerDef(def || null);

  fetch(`/api/admin/marker-content/${marker}`)
    .then((res) => res.json())
    .then((json) => {
      if (!json.success) {
        setError(json.error || 'Failed to load');
        setLoading(false);
        return;
      }
      const { data } = json;
      setDefinition(data.definition ?? '');
      setImpact(data.impact ?? '');
      setCoachInsights(data.coachInsights ?? /* default empty matrix */);
      setServerUpdatedAt(data.updatedAt ?? null);
      setLoading(false);
    })
    .catch(() => { setError('Failed to load marker data.'); setLoading(false); });
}, [marker]);
```

**Save handler with 409 handling** (lines 218–268 — adapt for integer `updatedAt`):
```typescript
const handleSave = async () => {
  setIsSaving(true);
  setError(null);
  try {
    const res = await fetch(`/api/admin/marker-content/${marker}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ definition, impact, coachInsights, updatedAt: serverUpdatedAt }),
    });
    const json = await res.json();
    if (res.status === 409) {
      setError(json.error || 'Conflict detected. Reload to see changes.');
    } else if (!res.ok) {
      setError(json.error || 'Failed to save.');
    } else {
      setIsDirty(false);
      setSaveSuccess(true);
      setServerUpdatedAt(Date.now());
      setTimeout(() => setSaveSuccess(false), 2000);
    }
  } catch {
    setError('Failed to save. Check your connection.');
  }
  setIsSaving(false);
};
```

**Gender tabs** (lines 360–381 — clone for male/female only, no "all" tab):
```typescript
<div className="flex gap-1 mb-4 border-b border-line">
  {(['male', 'female'] as const).map((g) => (
    <button
      key={g}
      onClick={() => setActiveGender(g)}
      className={`text-[13px] font-bold px-4 py-2 rounded-t-lg ${
        activeGender === g
          ? 'border-b-2 border-gold-brand text-text'
          : 'text-text-dim hover:text-text'
      }`}
    >
      {g === 'male' ? 'Male' : 'Female'}
    </button>
  ))}
</div>
```

**Save/Reset action bar** (lines 483–507):
```typescript
<div className="flex justify-between items-center p-4 border-t border-line">
  {/* Reset not needed here — content has no hardcoded default to revert to */}
  <button
    onClick={handleSave}
    disabled={!isDirty || isSaving}
    className={`text-[13px] font-bold px-6 py-2.5 rounded-lg ${
      isDirty && !isSaving
        ? 'bg-gold-brand text-bg hover:bg-champagne'
        : 'bg-gold-brand/50 text-bg opacity-50 cursor-not-allowed'
    }`}
  >
    {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
  </button>
</div>
{error && (
  <div className="mt-2 p-3 bg-danger/10 text-danger rounded-lg text-[13px] border border-danger/30">{error}</div>
)}
```

**Tone guidance text** (mirrors Phase 8 D-30 pattern — add below editor heading):
```typescript
<p className="text-[12px] text-text-dim mt-2 max-w-2xl">
  Write in consumer-friendly language. Avoid disease-prevention claims,
  longevity guarantees, or fabricated numbers. Focus on what the marker
  means and what the client can do.
</p>
```

---

### `src/components/report/PillarsDisplayModal.tsx` (component, event-driven — primary modification)

**Analog:** self (entire file, lines 1–548). Primary changes:
1. Widen container from `max-w-[640px]` to `max-w-[980px]` (desktop).
2. Split body into two panes: existing marker list (left) + new detail panel (right).
3. Add `selectedMarker` state; marker `<li>` becomes `<button>` with `aria-selected`.
4. Add mobile drill-in: single-column, back button to return to list.
5. Accept `markerContentMap: Map<string, MarkerContent>` + `gender: string` props; resolve `(tier, gender)` insight inside the modal.

**Current Props interface** (lines 17–23):
```typescript
interface Props {
  open: boolean;
  onClose: () => void;
  pillar: PillarScore;
  markers: ReportMarker[];
  insights?: Insight[];
}
```

**New props to add:**
```typescript
  markerContentMap?: Map<string, import('@/lib/marker-content/queries').MarkerContent>;
  gender?: string | null;
```

**Focus trap + body scroll lock** (lines 180–238) — preserve exactly; the modal internals expand but the outer `<aside>` wrapper and focus trap logic are unchanged.

**Current `<li>` static row** (lines 462–499) — becomes a `<button>`:
```typescript
// BEFORE (static <li>):
<li key={m.key} className="flex items-center justify-between gap-3 ...">
  ...
</li>

// AFTER (interactive <button> inside <ul>):
<li key={m.key}>
  <button
    type="button"
    onClick={() => setSelectedMarker(m.key)}
    aria-selected={selectedMarker === m.key}
    className={`w-full flex items-center gap-3 ... ${
      selectedMarker === m.key
        ? 'border-gold-brand/45 bg-gradient-to-r from-gold-brand/14 to-gold-brand/4'
        : 'border-transparent bg-bg-3 hover:bg-bg hover:border-line-2'
    }`}
  >
    <span className={`block h-6 w-0.5 rounded-full flex-none ${tierCls.rail}`} />
    <span className="flex-1 text-sm text-text truncate text-left">{m.label}</span>
    <span className="font-mono text-sm tabular-nums text-text-dim">
      {m.value != null ? `${m.value}${m.unit ? ` ${m.unit}` : ''}` : '—'}
    </span>
    <svg className={`w-3.5 h-3.5 flex-none ${selectedMarker === m.key ? 'text-gold-brand translate-x-0.5' : 'text-text-faint'}`} ...chevron... />
  </button>
</li>
```

**Desktop container split** (lines 311–312):
```typescript
// BEFORE:
<div className="relative w-full max-w-[640px] max-h-[90vh] ...">

// AFTER — two-pane grid inside a wider shell:
<div className="relative w-full max-w-[980px] max-h-[90vh] overflow-hidden ...">
  {/* Hero (unchanged) */}
  <div className="...hero..."> ... </div>

  {/* Two-pane body */}
  <div className="grid md:grid-cols-[minmax(280px,38%)_1fr]">
    {/* LEFT: tier-grouped marker list (now with interactive buttons) */}
    <div className="md:border-r border-line max-h-[520px] overflow-y-auto">
      {/* ...existing marker grouping, buttons replacing <li>... */}
    </div>

    {/* RIGHT: detail panel — hidden on mobile until marker selected */}
    <div className="max-h-[520px] overflow-y-auto hidden md:block">
      {selectedMarker ? <MarkerDetailPanel ... /> : <EmptyDetailState />}
    </div>
  </div>

  {/* Mobile: full-screen detail overlay when selectedMarker set */}
  <div className="md:hidden ...">
    {selectedMarker && (
      <>
        <button onClick={() => setSelectedMarker(null)}
          className="flex items-center gap-2 px-4 py-3.5 text-gold-brand font-mono text-[10px] uppercase tracking-[0.14em]">
          ← {pillar.label}
        </button>
        <MarkerDetailPanel ... />
      </>
    )}
  </div>
</div>
```

**`MarkerDetailPanel` sub-component pattern** (mirrors mockup `<div class="detail">` blocks — `mockups/marker-detail-modal.html` lines 87–259):
```typescript
// Detail panel sections — copy CSS class equivalents from mockup:
// d-top      → flex justify-between, marker name + value+unit+tier pill
// .block     → "What it is" / "How it affects you" — gold bar heading + paragraph
// .coach     → gold rail card, "Coach insight" heading, tailored badge, fallback note
//
// Tier pill color map mirrors TIER_THEME already in PillarsDisplayModal (lines 95–134)
// Fallback detection: if no authored insight for (tier, gender), show generatePeak360Insights output
//   with "Auto-generated · no coach insight authored yet" note (mockup line 218)
```

**Existing Insights block** (lines 508–541) — preserve below the pane area as "Insights & recommendations" (pillar-level, not marker-level).

---

### `src/components/sections/Section11.tsx` (component, request-response — add fetch + thread)

**Analog:** self — extend `loadReport()` (lines 165–237)

**`loadReport()` pattern to extend** (lines 165–237):
```typescript
useEffect(() => {
  const loadReport = async () => {
    // EXISTING: fetch sections 1-9 in parallel
    const sections: Record<number, Record<string, unknown>> = {};
    const fetches = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(async (num) => {
      const res = await fetch(`/api/assessments/${assessmentId}/sections/${num}`);
      const { data } = await res.json();
      sections[num] = (data || {}) as Record<string, unknown>;
    });
    await Promise.all(fetches);

    // ADD: fetch marker content in parallel with section fetches
    // (add to the Promise.all above, or run concurrently after):
    const mcRes = await fetch('/api/marker-content');
    const mcJson = await mcRes.json();
    const mcMap = new Map<string, MarkerContent>();
    if (mcJson.success) {
      for (const row of mcJson.data as MarkerContent[]) {
        mcMap.set(row.testKey, row);
      }
    }
    setMarkerContentMap(mcMap);

    // EXISTING: derive gender + age
    const info = sections[1] || {};
    const gender = info.clientGender as string || null;   // already derived here
    setGender(gender);                                    // ADD: thread to state
    // ... rest unchanged ...
  };
  loadReport();
}, [assessmentId]);
```

**State additions** (line 126 area):
```typescript
const [markerContentMap, setMarkerContentMap] = useState<Map<string, MarkerContent>>(new Map());
const [gender, setGender] = useState<string | null>(null);
```

**Thread-through to PillarsDisplay** (around line 226):
```typescript
// PillarsDisplay already receives: pillars, markers, insights
// ADD: markerContentMap, gender
<PillarsDisplay
  pillars={pillars}
  markers={markers}
  insights={insights}
  markerContentMap={markerContentMap}   // ADD
  gender={gender}                       // ADD
/>
```

---

### `scripts/seed-marker-content.ts` (utility, batch — idempotent seed script)

**Analog:** `scripts/seed-admin.ts` + seed block in `src/lib/db/index.ts` (lines 274–297 for the inline seed pattern)

**Script structure** (mirrors `scripts/seed-admin.ts` lines 1–33):
```typescript
// Idempotent marker-content seeder.
// Inserts seeded draft content for all ~98 REPORT_MARKERS.
// Re-running does NOT overwrite admin edits (ON CONFLICT DO NOTHING).
//
// Usage:
//   DATABASE_URL=<postgres> npx tsx scripts/seed-marker-content.ts
//   (or runs automatically via runMigrations() if embedded there)

async function main() {
  const { db } = await import('../src/lib/db');
  const { markerContent } = await import('../src/lib/db/schema');
  const { REPORT_MARKERS } = await import('../src/lib/report-markers');

  const now = Date.now();
  // Batch insert — one upsert per marker, skip if already exists
  for (const m of REPORT_MARKERS) {
    await db
      .insert(markerContent)
      .values({
        testKey: m.testKey,
        definition: SEED_CONTENT[m.testKey]?.definition ?? null,
        impact: SEED_CONTENT[m.testKey]?.impact ?? null,
        coachInsights: SEED_CONTENT[m.testKey]?.coachInsights ?? null,
        updatedBy: 'system',
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: markerContent.testKey,
        // DO NOTHING equivalent — only update if updatedBy is still 'system'
        // (i.e., admin has not edited yet). Alternatively use a separate
        // .insert().values().onConflictDoNothing() Drizzle call.
      });
  }
  console.log(`Seeded ${REPORT_MARKERS.length} marker content rows.`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
```

**Seed content shape** (one object per testKey):
```typescript
const SEED_CONTENT: Record<string, {
  definition: string;
  impact: string;
  coachInsights: Record<RatingTier, { male: string; female: string }>;
}> = {
  'cholesterol_total': {
    definition: '...',
    impact: '...',
    coachInsights: {
      poor:     { male: '...', female: '...' },
      cautious: { male: '...', female: '...' },
      normal:   { male: '...', female: '...' },
      great:    { male: '...', female: '...' },
      elite:    { male: '...', female: '...' },
    },
  },
  // ... repeat for all ~98 REPORT_MARKERS ...
};
```

**Delivery decision** — the planner should embed this seed inside `runMigrations()` (follow the Phase 8 inline pattern at lines 274–297 of `src/lib/db/index.ts`), not as a separate script, so it runs automatically on first deploy. The standalone script is an optional convenience for local re-seeding.

---

## Shared Patterns

### Admin Gate (SSR pages)
**Source:** `src/app/portal/admin/pillars/page.tsx` lines 20–23
**Apply to:** `src/app/portal/admin/marker-content/page.tsx`, `src/app/portal/admin/marker-content/[marker]/page.tsx`
```typescript
const rawSession = await auth.api.getSession({ headers: await headers() });
if (!rawSession?.user) redirect('/login');
const session = rawSession as unknown as AuthSession;
if (session.user.role !== 'admin') redirect('/portal');
```

### Admin Gate (API routes)
**Source:** `src/lib/auth-helpers.ts` lines 49–58 (`requireAdmin`)
**Apply to:** all `/api/admin/marker-content/*` routes
```typescript
const [session, errorRes] = await requireAdmin();
if (errorRes) return errorRes;
// session.user.id available for audit logging
```

### Any-Role Authenticated Gate (API routes)
**Source:** `src/lib/auth-helpers.ts` lines 35–43 (`requireSession`)
**Apply to:** `src/app/api/marker-content/route.ts`
```typescript
const [, errorRes] = await requireSession();
if (errorRes) return errorRes;
```

### Audit Event (admin writes)
**Source:** `src/lib/audit.ts` lines 24–49 (`logAuditEvent` + `getRequestContext`)
**Apply to:** PUT handler in `/api/admin/marker-content/[marker]/route.ts`
```typescript
const ctx = await getRequestContext();
await logAuditEvent({
  userId: session.user.id,
  action: 'marker_content.update',
  resourceType: 'marker_content',
  resourceId: marker,
  metadata: { ... },
  ipAddress: ctx.ipAddress,
  userAgent: ctx.userAgent,
});
```

### Error Response Shape
**Source:** All existing API routes
**Apply to:** All new API routes
```typescript
// Success:
return NextResponse.json({ success: true, data: ... });
// Error:
return NextResponse.json({ success: false, error: 'Human-readable message' }, { status: 4xx });
```

### Idempotent Seed (insert-if-absent)
**Source:** `src/lib/db/index.ts` lines 274–297 (Postgres) and lines 511–533 (SQLite)
**Apply to:** `marker_content` table seed in `runMigrations()`
- Postgres: `INSERT INTO ... ON CONFLICT ("test_key") DO NOTHING`
- SQLite: `INSERT OR IGNORE INTO ...`

### Dark-Portal Tailwind Tokens
**Source:** `src/app/globals.css` + `src/components/report/PillarsDisplayModal.tsx`
**Apply to:** All new JSX in `PillarsDisplayModal.tsx`, admin pages
```
bg-bg / bg-bg-2 / bg-bg-3          — surface layers
text-text / text-text-dim / text-text-faint  — typography hierarchy
border-line / border-line-2         — border weights
text-gold-brand / bg-gold-brand     — gold accent
font-mono text-[10px] uppercase tracking-[0.18em]  — mono eyebrow pattern
```

### Tier Color Map
**Source:** `src/components/report/PillarsDisplayModal.tsx` lines 95–134 (`TIER_THEME`)
**Apply to:** `MarkerDetailPanel` sub-component in PillarsDisplayModal
```typescript
// Tier pill background: poor=bg-red-500, cautious=bg-amber-500,
// normal=bg-slate-400, great=bg-blue-500, elite=bg-emerald-500
// Already defined in TIER_THEME at lines 95-134 of PillarsDisplayModal.tsx
```

### `import type` convention
**Source:** All existing files
**Apply to:** All new files — always use `import type { ... }` for interfaces and type-only imports

---

## No Analog Found

All files have close analogs. No entries.

---

## Metadata

**Analog search scope:** `src/app/api/`, `src/app/portal/admin/`, `src/lib/`, `src/components/report/`, `src/components/sections/`, `scripts/`
**Files scanned:** 22
**Pattern extraction date:** 2026-05-26
