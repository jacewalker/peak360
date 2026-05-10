# Phase 8: client-report-design-refresh - Pattern Map

**Mapped:** 2026-05-07
**Files analyzed:** 26 (15 new, 11 modified)
**Analogs found:** 24 / 26 (2 with no clean codebase analog)

This map locks each new/modified file in Phase 8 to a concrete codebase analog with line-numbered excerpts the planner can hand to executors. Sources of truth: `08-CONTEXT.md` decisions D-01..D-30, `08-RESEARCH.md` Component Responsibilities table, `08-UI-SPEC.md` Component Inventory.

---

## File Classification

### New files (created in Phase 8)

| New file | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/pillars/types.ts` | utility (types) | transform | `src/lib/pdf/types.ts` | exact |
| `src/lib/pillars/colors.ts` | utility (constants) | transform | `src/lib/pdf/colors.ts` | exact |
| `src/lib/pillars/mapping.ts` | utility (pure fn) | transform | `src/lib/normative/ratings.ts` | role-match |
| `src/lib/pillars/queries.ts` | service (db reads) | request-response (SSR) | `src/lib/normative/db-ranges.ts` (via `src/app/api/admin/normative/route.ts`) | role-match |
| `src/components/ui/Dialog.tsx` | component (primitive) | event-driven (UI) | `src/components/ui/ConfirmDeleteModal.tsx` | role-match (seed only — no full focus trap) |
| `src/components/report/PillarsGrid.tsx` | component (orchestrator) | request-response | `src/components/sections/Section11.tsx` | role-match |
| `src/components/report/PillarCard.tsx` | component (presentational) | event-driven (click) | `src/lib/pdf/components/TierSummary.tsx` (visual structure) + Section 11 `TierPill` (click semantics) | partial |
| `src/components/report/PillarModal.tsx` | component | event-driven | `src/components/ui/ConfirmDeleteModal.tsx` (open/close) + Section 11 marker grid (per-marker rows) | partial |
| `src/components/report/DetailedMarkerResultsDisclosure.tsx` | component (wrapper) | request-response | `src/components/sections/Section11.tsx` (current marker grid lift-and-wrap) | exact |
| `src/lib/pdf/components/PillarsPage.tsx` | component (react-pdf) | transform (server-render) | `src/lib/pdf/components/TierSummary.tsx` | exact |
| `src/app/portal/admin/pillars/page.tsx` | route (server component) | request-response | `src/app/portal/assessment/[id]/report/page.tsx` (RBAC SSR shape) + `src/app/portal/admin/users/page.tsx` (admin shell) | role-match |
| `src/app/portal/admin/pillars/AdminPillarsForm.tsx` | component (admin form) | CRUD | `src/app/portal/admin/users/page.tsx` (form + Toast pattern) | role-match |
| `src/app/portal/admin/assessments/[id]/prescriptions/page.tsx` | route (server component) | request-response | `src/app/portal/assessment/[id]/report/page.tsx` (per-assessment SSR + ownership) | role-match |
| `src/app/portal/admin/assessments/[id]/prescriptions/AdminPrescriptionsForm.tsx` | component (admin form) | CRUD | `src/app/portal/admin/users/page.tsx` | role-match |
| `src/app/api/admin/pillars/route.ts` | API route | CRUD | `src/app/api/admin/users/[userId]/role/route.ts` | exact |
| `src/app/api/admin/assessments/[id]/prescriptions/route.ts` | API route | CRUD | `src/app/api/admin/users/[userId]/role/route.ts` | exact |

### Modified files (touched in Phase 8)

| Modified file | Role | Change Class | Closest Analog (in-file pattern) | Match Quality |
|---|---|---|---|---|
| `src/lib/db/schema.ts` | model | additive (3 new pgTables) | `auditLogs` table at lines 56–66 | exact |
| `src/lib/db/schema-sqlite.ts` | model | additive (3 new sqliteTables) | `auditLogs` table at lines 54–64 | exact |
| `src/lib/db/index.ts` | migration | additive (CREATE TABLE IF NOT EXISTS + idempotent seed) | `auditLogs` migration block (pg lines 106–118 + sqlite lines 267–279) + seed pattern from `src/lib/seed-admin.ts` | exact |
| `src/lib/audit.ts` | utility | additive (extend AuditAction union) | lines 6–14 | exact |
| `src/lib/pdf/types.ts` | model | additive (extend ReportData) | lines 21–36 | exact |
| `src/lib/pdf/Peak360Report.tsx` | component (PDF) | additive (insert `<PillarsPage>` before `<MarkerTable>`) | lines 64–68 | exact |
| `src/lib/pdf/colors.ts` | model | additive (re-export traffic-light hex from `src/lib/pillars/colors.ts`) | lines 20–26 | exact |
| `src/components/sections/Section11.tsx` | component | replace top half + extract marker grid | self (current 618-line file) | exact |
| `src/app/portal/assessment/[id]/report/page.tsx` | route | additive (extend SSR data load with pillar reads) | lines 37–69 | exact |
| `src/app/api/assessments/[id]/pdf/route.ts` | API route | additive (load definitions/page-copy/prescriptions and add to `ReportData`) | (mirrors report page SSR data load) | exact |
| `tests/security/last-admin-guard.test.ts` (referenced, not edited) | test | new sibling tests | n/a | n/a |

---

## Pattern Assignments

### `src/lib/db/schema-sqlite.ts` (model, additive)

**Analog (in-file):** `auditLogs` definition at lines 54–64.

**Imports pattern** (lines 1):
```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
```

**Existing table shape to copy** (lines 54–64):
```typescript
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id').notNull(),
  metadata: text('metadata', { mode: 'json' }),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull(),
});
```

**FK + cascade delete pattern** (already in this file at lines 21, 31):
```typescript
assessmentId: text('assessment_id').notNull().references(() => assessments.id, { onDelete: 'cascade' }),
```

**JSON-mode column** (already in this file at line 23):
```typescript
data: text('data', { mode: 'json' }),
```

**Composite primary key (NEW pattern — not present in this codebase yet).** Use Drizzle 0.45.1 second-arg table-config:
```typescript
import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

export const pillarPrescriptions = sqliteTable('pillar_prescriptions', {
  assessmentId: text('assessment_id').notNull().references(() => assessments.id, { onDelete: 'cascade' }),
  pillarKey: text('pillar_key').notNull(),
  // ... other columns
}, (t) => ({
  pk: primaryKey({ columns: [t.assessmentId, t.pillarKey] }),
}));
```

> RESEARCH Pitfall #3 calls out that composite PKs are uncommon in this codebase. Verify generated SQL via `npm run db:generate` before pushing.

---

### `src/lib/db/schema.ts` (model, additive — pg dialect)

**Analog (in-file):** `auditLogs` definition at lines 56–66.

**Imports pattern** (line 1):
```typescript
import { pgTable, text, integer, serial, jsonb } from 'drizzle-orm/pg-core';
```

**Existing table shape to copy** (lines 56–66):
```typescript
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  // ...
  metadata: jsonb('metadata'),  // pg uses jsonb, sqlite uses text(mode:'json')
  createdAt: text('created_at').notNull(),
});
```

> RESEARCH Pitfall #6: every schema change is a paired diff. The planner must task BOTH dialect files in a single action so they cannot diverge. The pg `bullets` column uses `jsonb('bullets')`, the sqlite version uses `text('bullets', { mode: 'json' })`.

---

### `src/lib/db/index.ts` (migration, additive)

**Analog (in-file):** the `auditLogs` `CREATE TABLE IF NOT EXISTS` blocks for each dialect:
- pg: lines 106–118
- sqlite: lines 267–279

**pg pattern to copy** (lines 106–118):
```typescript
await d.execute(sql`
  CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" text PRIMARY KEY NOT NULL,
    "user_id" text NOT NULL,
    "action" text NOT NULL,
    "resource_type" text NOT NULL,
    "resource_id" text NOT NULL,
    "metadata" jsonb,
    "ip_address" text,
    "user_agent" text,
    "created_at" text NOT NULL
  )
`);
```

**sqlite pattern to copy** (lines 267–279):
```typescript
d.run(sql`
  CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" text PRIMARY KEY NOT NULL,
    /* ... */
    "metadata" text,
    /* ... */
  )
`);
```

**Index creation** (already in this file at line 202–204 and 361–363):
```typescript
await d.execute(sql`CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "audit_logs" ("user_id")`);
```

**Idempotent seed insertion** (NEW for this phase — pattern derived from RESEARCH §Pattern 1). Use `ON CONFLICT DO NOTHING` (pg) / `INSERT OR IGNORE` (sqlite):
```typescript
// pg
await d.execute(sql`
  INSERT INTO pillar_definitions (pillar_key, label, short_summary, plain_meaning, sort_order, updated_by, updated_at)
  VALUES ('cardiometabolic', 'Cardiometabolic Health', '...', '...', 0, 'system', ${Date.now()})
  ON CONFLICT (pillar_key) DO NOTHING
`);

// sqlite
d.run(sql`
  INSERT OR IGNORE INTO pillar_definitions (pillar_key, label, short_summary, plain_meaning, sort_order, updated_by, updated_at)
  VALUES ('cardiometabolic', 'Cardiometabolic Health', '...', '...', 0, 'system', ${Date.now()})
`);
```

**Composite PK on `pillar_prescriptions`** (NEW raw-SQL pattern not yet in codebase):
```typescript
// pg
await d.execute(sql`
  CREATE TABLE IF NOT EXISTS "pillar_prescriptions" (
    "assessment_id" text NOT NULL REFERENCES "assessments"("id") ON DELETE CASCADE,
    "pillar_key" text NOT NULL,
    "summary" text NOT NULL,
    "bullets" jsonb,
    "full_plan_href" text,
    "updated_by" text NOT NULL,
    "updated_at" bigint NOT NULL,
    PRIMARY KEY ("assessment_id", "pillar_key")
  )
`);
```

> RESEARCH Pitfall #4: `runMigrations()` is opt-in. Production must run `scripts/db-push.sh` at deploy time. Seed inserts MUST be idempotent so re-runs are safe.

---

### `src/lib/audit.ts` (utility, extend AuditAction union)

**Analog (in-file):** lines 6–14 — `AuditAction` discriminated union.

**Pattern to extend** (lines 6–14):
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
  // Phase 8 additions:
  | 'pillar_definition.update'
  | 'pillar_page_copy.update'
  | 'pillar_prescription.upsert'
  | 'pillar_prescription.delete';
```

**Calling pattern** (lines 25–37 — fire-and-forget):
```typescript
try {
  await db.insert(auditLogs).values({
    id: uuid(),
    userId: params.userId,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    metadata: params.metadata ?? null,
    ipAddress: params.ipAddress ?? null,
    userAgent: params.userAgent ?? null,
    createdAt: new Date().toISOString(),
  });
} catch {
  // Audit logging must NEVER break the main operation (fire-and-forget)
  console.error('[audit] Failed to write audit log');
}
```

**Request context capture** (lines 47–55):
```typescript
const h = await headers();
return {
  ipAddress: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null,
  userAgent: h.get('user-agent') ?? null,
};
```

---

### `src/lib/pillars/types.ts` (utility — types module, NEW)

**Analog:** `src/lib/pdf/types.ts`.

**Imports pattern** (lines 1):
```typescript
import type { RatingTier, TierRanges } from '@/types/normative';
```

**Type-only exports pattern** (lines 3–13, 21–36):
```typescript
export interface ReportMarker {
  key: string;
  label: string;
  value: number | null;
  tier: RatingTier | null;
  /* ... */
}

export interface ReportData {
  assessmentId: string;
  /* ... */
}
```

**Phase 8 types to add (locked by CONTEXT D-13/D-14/D-17):**
```typescript
export type PillarKey = 'cardiometabolic' | 'bodyComposition' | 'strength' | 'balance' | 'vo2';
export type PillarStatus = 'red' | 'amber' | 'green' | 'pending';

export interface PillarDefinition {
  pillarKey: PillarKey;
  label: string;
  shortSummary: string;
  plainMeaning: string;
  sortOrder: number;
  updatedBy: string;
  updatedAt: number;
}

export interface PillarPageCopy {
  heading: string;
  intro: string;
  updatedBy: string;
  updatedAt: number;
}

export interface PillarPrescription {
  pillarKey: PillarKey;
  summary: string;
  bullets?: string[];
  fullPlanHref?: string;
  updatedBy?: { id: string; name?: string };
  updatedAt?: number;
}
```

> CLAUDE.md §Conventions mandates `import type { ... }` for all consumers.

---

### `src/lib/pillars/colors.ts` (utility — single source of truth, NEW)

**Analog:** `src/lib/pdf/colors.ts` (named-export hex map).

**Imports pattern** (line 1):
```typescript
import type { RatingTier } from '@/types/normative';
```

**Existing pattern to mirror** (lines 20–26 of `src/lib/pdf/colors.ts`):
```typescript
export const TIER_COLORS_PDF: Record<RatingTier, string> = {
  elite: '#10b981',
  great: '#3b82f6',
  normal: '#6b7280',
  cautious: '#f59e0b',
  poor: '#ef4444',
};
```

**Phase 8 export shape (UI-SPEC §Color):**
```typescript
import type { PillarStatus } from '@/lib/pillars/types';

export const TRAFFIC_LIGHT_HEX: Record<PillarStatus, string> = {
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  pending: '#e2e8f0', // border colour; text uses '#64748b'
};

export const TRAFFIC_LIGHT_TEXT: Record<PillarStatus, string> = {
  green: '#ffffff',
  amber: '#1a202c',
  red: '#ffffff',
  pending: '#64748b',
};

// Score thresholds (D-10 — locked, hardcoded for v1)
export const PILLAR_THRESHOLDS = { red: 39, amber: 69 } as const;
```

> D-28 single-source-of-truth: `src/lib/pdf/colors.ts` MUST `export { TRAFFIC_LIGHT_HEX } from '@/lib/pillars/colors'` (not duplicate). RESEARCH Pitfall #5 documents the drift risk if hex codes are inlined inside `PillarsPage.tsx`.

---

### `src/lib/pillars/mapping.ts` (utility — pure fn, NEW)

**Analog:** `src/lib/normative/ratings.ts` (pure-function rating resolver consumed by both portal and PDF).

**Pure-function shape pattern (no I/O, fully testable).** RESEARCH §Code Examples gives the canonical implementation:

**Tier-rollup pattern (D-08):**
```typescript
import type { ReportMarker } from '@/lib/pdf/types';
import type { PillarKey, PillarStatus } from '@/lib/pillars/types';
import { PILLAR_THRESHOLDS } from '@/lib/pillars/colors';

const TIER_VALUE: Record<NonNullable<ReportMarker['tier']>, number> = {
  elite: 100, great: 80, normal: 60, cautious: 40, poor: 20,
};

export function computePillarScore(markers: ReportMarker[]): {
  score: number | null;
  status: PillarStatus;
  contributingCount: number;
} {
  const rated = markers.filter((m) => m.tier !== null);
  if (rated.length === 0) return { score: null, status: 'pending', contributingCount: 0 };
  const sum = rated.reduce((a, m) => a + TIER_VALUE[m.tier as keyof typeof TIER_VALUE], 0);
  const score = Math.round(sum / rated.length);
  const status: PillarStatus =
    score >= 70 ? 'green' :
    score >= 40 ? 'amber' :
    'red';
  return { score, status, contributingCount: rated.length };
}
```

**Marker → pillar classifier (D-05/D-06):** RESEARCH §Code Examples gives the full implementation. Pillar names follow camelCase per CLAUDE.md §Key Patterns: `cardiometabolic`, `bodyComposition`, `strength`, `balance`, `vo2`.

> RESEARCH Pitfall #1: D-05 Balance mapping must walk BOTH `'Mobility & Flexibility'` AND `'Strength Testing'` categories looking for `/balance|sway|stability/i`, otherwise the Balance pillar always renders "Data pending". Surface this back to the user during planning before silently re-interpreting the locked decision.

---

### `src/lib/pillars/queries.ts` (service — Drizzle reads, NEW)

**Analog:** `src/app/api/admin/normative/route.ts` (lines 5–10) for the read-shape; `src/app/portal/assessment/[id]/report/page.tsx` lines 53–57 for SSR-side Drizzle usage.

**Imports pattern (typical Drizzle SSR query):**
```typescript
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { pillarDefinitions, pillarPageCopy, pillarPrescriptions } from '@/lib/db/schema';
```

**Drizzle pattern from report page** (lines 53–57):
```typescript
const [row] = await db
  .select()
  .from(assessments)
  .where(eq(assessments.id, id));
```

**Phase 8 queries shape (server-only — used by SSR pages and `/api/.../pdf` route):**
```typescript
export async function getPillarDefinitions(): Promise<PillarDefinition[]> {
  return db.select().from(pillarDefinitions).orderBy(pillarDefinitions.sortOrder);
}

export async function getPillarPageCopy(): Promise<PillarPageCopy | null> {
  const [row] = await db.select().from(pillarPageCopy).limit(1);
  return row ?? null;
}

export async function getPillarPrescriptions(assessmentId: string): Promise<PillarPrescription[]> {
  return db.select().from(pillarPrescriptions).where(eq(pillarPrescriptions.assessmentId, assessmentId));
}
```

---

### `src/components/ui/Dialog.tsx` (component — primitive, NEW)

**Analog (seed only):** `src/components/ui/ConfirmDeleteModal.tsx` — has ESC handler, click-outside-to-close, body styling. **Lacks** focus trap, body-scroll lock, `mode='auto'` breakpoint switch, `prefers-reduced-motion`, drag handle. Planner extends it.

**Imports pattern** (lines 1–3):
```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
```

**ESC handler pattern** (lines 36–44):
```typescript
useEffect(() => {
  if (!isOpen) return;
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [isOpen, onCancel]);
```

**Backdrop + click-outside pattern** (lines 82–90):
```typescript
return (
  <div
    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
    onClick={onCancel}
  >
    <div
      className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
      onClick={(e) => e.stopPropagation()}
    >
      {/* content */}
    </div>
  </div>
);
```

**Body-scroll lock pattern (NEW — UI-SPEC mandates):** RESEARCH §Pattern 4:
```typescript
useEffect(() => {
  if (!open) return;
  const prev = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  return () => { document.body.style.overflow = prev; };
}, [open]);
```

**Mode='auto' breakpoint switch:** UI-SPEC §Layout & Responsive Contract requires bottom-sheet < 768px, centred dialog ≥ 768px. Implement via Tailwind classes; do NOT match-media in JS.

> RESEARCH Pitfall #7: `Shift+Tab` at the first tabbable node must wrap to the last; closing must restore focus to the originating element. UI-SPEC §Focus & keyboard contract is explicit. Save `document.activeElement` on open; call `.focus()` on close.

---

### `src/components/report/PillarsGrid.tsx` (component — orchestrator, NEW)

**Analog:** `src/components/sections/Section11.tsx` (the only component the report page currently imports for the body). New `PillarsGrid` is the sole import for the pillar surface (RESEARCH §Component Responsibilities).

**'use client' directive pattern** (line 1 of Section 11):
```typescript
'use client';
```

**Hooks pattern from Section 11** (lines 3, 30–60):
```typescript
import { useEffect, useState, useCallback } from 'react';
// Tier colour maps inlined as Record<RatingTier, string>
```

**Phase 8 props (locked by RESEARCH §Component Responsibilities):**
```typescript
interface PillarsGridProps {
  definitions: PillarDefinition[];
  prescriptions: PillarPrescription[];
  markers: ReportMarker[];  // server-resolved
}
```

**Modal-open state ownership** (this component owns it):
```typescript
const [openPillar, setOpenPillar] = useState<PillarKey | null>(null);
```

> RESEARCH Pitfall #8: `markers` MUST come pre-computed from the server (via the report `page.tsx` SSR data load). Do NOT recompute via `getPeak360Rating()` client-side in this component — the portal and PDF must derive identical scores from the same path.

---

### `src/components/report/PillarCard.tsx` (component — presentational, NEW)

**Analog (visual structure):** `src/lib/pdf/components/TierSummary.tsx` lines 32–119 — per-tier card with top-coloured bar, label, count, percentage. Same shape (1 of 5 cards in a row, status colour at the top).

**Visual structure pattern (TierSummary lines 34–46):**
```tsx
<View
  style={{
    flex: 1,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    padding: '6 8',
    alignItems: 'center',
  }}
>
  {/* Top colored bar */}
  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: color }} />
  {/* Label, count, percentage stacked vertically */}
</View>
```

**Click semantics (Section 11 pattern):** Section 11 uses `<button>` for interactive elements with `text-navy hover:text-gold transition-colors`. PillarCard wraps the entire card in a button so the whole card is the click target (UI-SPEC §Layout: 96px min-height tappable on mobile).

**Phase 8 props (locked):**
```typescript
interface PillarCardProps {
  pillar: PillarDefinition;
  score: number | null;
  status: PillarStatus;
  onOpen: () => void;
}
```

**Tailwind v4 token usage (CLAUDE.md §Key Patterns):** use `text-navy`, `text-gold`, `bg-surface`, `border-border` for the chrome; ad-hoc hex codes only via the `TRAFFIC_LIGHT_HEX` import from `src/lib/pillars/colors.ts`.

---

### `src/components/report/PillarModal.tsx` (component, NEW)

**Analog (open/close):** `src/components/ui/ConfirmDeleteModal.tsx` (now wrapped in the new `Dialog` primitive).

**Analog (per-marker rows):** `src/components/sections/Section11.tsx` — already renders each marker with its tier pill. The new modal's "Score breakdown" subsection lifts this row pattern.

**Tier colour maps from Section 11** (lines 30–60) — reuse for the per-marker rows inside the modal (CONTEXT D-11):
```typescript
const TIER_DOT: Record<RatingTier, string> = {
  elite: '#10b981', great: '#3b82f6', normal: '#6b7280', cautious: '#f59e0b', poor: '#ef4444',
};
const TIER_ROW_BG: Record<RatingTier, string> = {
  elite: 'bg-emerald-50/80', great: 'bg-blue-50/80', /* ... */
};
```

**TierPill component pattern** (Section 11 lines 73–86):
```tsx
function TierPill({ tier }: { tier: RatingTier }) {
  const bg: Record<RatingTier, string> = {
    elite: 'bg-emerald-600', great: 'bg-blue-600', normal: 'bg-gray-500',
    cautious: 'bg-amber-500', poor: 'bg-red-600',
  };
  return (
    <span className={`report-tier-pill inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase text-white ${bg[tier]}`}>
      {TIER_LABELS[tier]}
    </span>
  );
}
```

**7 modal sections (UI-SPEC §Copywriting Contract — modal sections):** label copy is hardcoded (e.g., `"What this pillar means"`); body comes from data. The "Recommended plan" subsection has explicit empty-state copy `"Your coach hasn't written a recommendation for this pillar yet. Check back soon."` — render when `prescription === null`.

> CONTEXT D-11 anti-pattern: do NOT reuse `TIER_COLORS` for the pillar status pill at the top of the modal — those are the 5-tier marker colours. The pillar status uses `TRAFFIC_LIGHT_HEX` (3-state).

---

### `src/components/report/DetailedMarkerResultsDisclosure.tsx` (component, NEW wrapper)

**Analog:** lift the existing dense category-grouped marker grid out of `src/components/sections/Section11.tsx` (current 618-line component) and wrap it in a `<details>` element.

**`<details>` accessible disclosure pattern (HTML5 native — no JS focus management needed):**
```tsx
<details className="mt-12 group">
  <summary className="text-base font-semibold text-navy cursor-pointer">
    Detailed marker results
    <span className="block text-sm text-muted font-normal">
      For coaches and curious clients — every rated marker with raw values and ranges.
    </span>
  </summary>
  <div className="mt-6">{children}</div>
</details>
```

> CONTEXT D-03: collapsed by default. UI-SPEC §Copywriting Contract gives the verbatim summary + helper copy.

---

### `src/lib/pdf/components/PillarsPage.tsx` (component — react-pdf, NEW)

**Analog:** `src/lib/pdf/components/TierSummary.tsx` — exact same shape (5 cards in a row, status colour at the top, big numeral, label).

**Imports pattern** (TierSummary lines 1–6):
```typescript
import { View, Text } from '@react-pdf/renderer';
import { COLORS } from '@/lib/pdf/colors';
import { FONT } from '@/lib/pdf/fonts';
import { styles } from '@/lib/pdf/styles';
```

**Section heading pattern** (TierSummary lines 17–26):
```tsx
<View style={styles.sectionHeading}>
  <View style={styles.sectionHeadingBar} />
  <Text style={styles.sectionHeadingText}>Results Overview</Text>
</View>
```

**Card grid pattern** (TierSummary lines 28–119) — single row, `flexDirection: 'row', gap: 6`. For Phase 8 with 5 cards in a 3+2 layout, use two `<View>` rows per CONTEXT D-22.

**Score numeral pattern** (TierSummary lines 76–84 — fontSize 22, FONT.bold, COLORS.navy, lineHeight 1):
```tsx
<Text style={{ fontSize: 22, fontFamily: FONT.bold, color: COLORS.navy, lineHeight: 1 }}>
  {tierCounts[tier]}
</Text>
```

**Status colour usage:** import `TRAFFIC_LIGHT_HEX` from `src/lib/pillars/colors.ts` (D-28 single-source-of-truth). Do NOT inline hex codes.

**Insertion point:** `src/lib/pdf/Peak360Report.tsx` line 64 (before `<TierSummary>`/`<MarkerTable>`):
```tsx
{/* Phase 8 — Peak Living pillars page (inserted ahead of existing PDF blocks) */}
<PillarsPage definitions={data.definitions} prescriptions={data.prescriptions} markers={data.markers} />

{/* Tier Summary */}
<TierSummary tierCounts={data.tierCounts} totalRated={data.totalRated} />
```

> RESEARCH Pitfall #5: do NOT re-declare hex codes inline. Re-export from `src/lib/pillars/colors.ts` via `src/lib/pdf/colors.ts`.

---

### `src/lib/pdf/types.ts` (model, additive)

**Analog (in-file):** `ReportData` interface at lines 21–36.

**Existing shape to extend** (lines 21–36):
```typescript
export interface ReportData {
  assessmentId: string;
  /* ... existing fields ... */
  markers: ReportMarker[];
  insights: Insight[];
  tierCounts: Record<RatingTier, number>;
  totalRated: number;
  // Phase 8 additions:
  definitions: PillarDefinition[];
  pageCopy: PillarPageCopy;
  prescriptions: PillarPrescription[];
}
```

---

### `src/lib/pdf/Peak360Report.tsx` (component, additive)

**Analog (in-file):** lines 64–68 — current `<TierSummary>` + `<MarkerTable>` rendering site.

**Existing pattern to insert before** (lines 64–68):
```tsx
{/* Tier Summary */}
<TierSummary tierCounts={data.tierCounts} totalRated={data.totalRated} />

{/* Detailed Marker Results */}
<MarkerTable markers={data.markers} />
```

**Phase 8 insertion (D-27):**
```tsx
{/* Peak Living pillars page (D-26) */}
<PillarsPage definitions={data.definitions} pageCopy={data.pageCopy} prescriptions={data.prescriptions} markers={data.markers} />

{/* Existing tier summary + marker table on subsequent pages (D-27) */}
<TierSummary tierCounts={data.tierCounts} totalRated={data.totalRated} />
<MarkerTable markers={data.markers} />
```

---

### `src/app/portal/admin/pillars/page.tsx` (route — server component, NEW)

**Analog (RBAC SSR shape):** `src/app/portal/assessment/[id]/report/page.tsx` lines 37–69. Mirror the auth + redirect contract. Skip the per-row `hasAccess` check (admin pages just gate on role).

**SSR auth + redirect pattern** (lines 44–48):
```typescript
const rawSession = await auth.api.getSession({ headers: await headers() });
if (!rawSession?.user) {
  redirect('/login');
}
const session = rawSession as unknown as AuthSession;
```

**Admin-only gate (Phase 8 add — defence-in-depth, server-side):**
```typescript
if (session.user.role !== 'admin') {
  redirect('/portal');
}
```

**Page chrome (analog: `src/app/portal/admin/users/page.tsx` lines 107–149):**
```tsx
<div className="min-h-screen bg-background">
  {/* Hero header — UI-SPEC §Layout admin shell pattern */}
  <div className="relative overflow-hidden" style={{ backgroundColor: '#0f2440', /* ... */ }}>
    {/* breadcrumb + title + description */}
  </div>
  {/* gold accent line */}
  <div className="h-px w-full bg-gradient-to-r from-gold/60 via-gold/20 to-transparent" />
  {/* Body */}
  <div className="px-8 py-10 max-w-6xl">
    <AdminPillarsForm definitions={definitions} pageCopy={pageCopy} />
  </div>
</div>
```

> Server component owns the data load + RBAC check. Client child (`AdminPillarsForm`) handles the form and POSTs to `/api/admin/pillars`.

---

### `src/app/portal/admin/assessments/[id]/prescriptions/page.tsx` (route — server component, NEW)

**Analog:** same as above + `src/app/portal/assessment/[id]/report/page.tsx` for the per-assessment SSR shape.

**Dynamic-route params pattern** (lines 37–43 of report page):
```typescript
export default async function PrescriptionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  /* ... auth + admin-only gate ... */
}
```

**Per-assessment data load:**
```typescript
const [assessment] = await db.select().from(assessments).where(eq(assessments.id, id));
if (!assessment) notFound();

const [definitions, prescriptions] = await Promise.all([
  getPillarDefinitions(),
  getPillarPrescriptions(id),
]);
```

> Read access is admin-only here (writes are admin-only too). Client + coach READ the same data via the report page — those reads happen via the regular SSR-gated `/portal/assessment/[id]/report/page.tsx` path, not this admin route.

---

### `src/app/portal/admin/pillars/AdminPillarsForm.tsx` (component — admin form, NEW)

**Analog:** `src/app/portal/admin/users/page.tsx` (full file is a Phase 7 admin client component with form UI + Toast pattern).

**'use client' + Toast import pattern** (lines 1–8):
```typescript
'use client';

import { Fragment, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import Toast, { type ToastVariant } from '@/components/ui/Toast';
```

**Toast state pattern** (lines 26, 35, 84):
```typescript
type ToastState = { variant: ToastVariant; message: string } | null;
const [toast, setToast] = useState<ToastState>(null);
// ... on success:
setToast({ variant: 'success', message: 'Pillar definitions saved.' });
// ... on error:
setToast({ variant: 'error', message: data?.error || "Couldn't save. Try again." });
```

**Fetch + error handling pattern** (lines 72–104):
```typescript
const handleSave = async (pillarKey: PillarKey, payload: Partial<PillarDefinition>) => {
  try {
    const res = await fetch(`/api/admin/pillars`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pillarKey, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setToast({ variant: 'success', message: 'Pillar definitions saved.' });
    } else {
      setToast({ variant: 'error', message: data?.error || "Couldn't save. Try again." });
    }
  } catch {
    setToast({ variant: 'error', message: "Couldn't save. Try again." });
  }
};
```

**Toast render pattern** (lines 325–331):
```tsx
{toast ? (
  <Toast variant={toast.variant} message={toast.message} onDismiss={() => setToast(null)} />
) : null}
```

**Form input styling (CLAUDE.md §Code Style — observed in `src/components/ui/ConfirmDeleteModal.tsx` line 115):**
```tsx
className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/10 transition-all disabled:opacity-50"
```

---

### `src/app/portal/admin/assessments/[id]/prescriptions/AdminPrescriptionsForm.tsx` (component, NEW)

**Analog:** same as AdminPillarsForm — extend with the destructive "Clear plan" pattern.

**Destructive confirm pattern (UI-SPEC §Destructive actions):** open a `Dialog` (centred mode) with copy from UI-SPEC §Copywriting Contract `Delete confirmation copy`. POST DELETE to `/api/admin/assessments/[id]/prescriptions?pillarKey=...`.

**Per-pillar save loop:** 5 forms, one per pillar. UI-SPEC delegates "save-each vs save-all" to the planner; RESEARCH §Alternatives Considered recommends per-pillar saves with optimistic UI.

**Optimistic update pattern (already used in `src/app/portal/admin/users/page.tsx` lines 80–83):**
```typescript
setUsers((u) => u.map((x) => (x.id === userId ? { ...x, role: newRole } : x)));
```

---

### `src/app/api/admin/pillars/route.ts` (API route, NEW)

**Analog:** `src/app/api/admin/users/[userId]/role/route.ts` lines 19–107 — the verified Phase 7 admin-route pattern (`requireAdmin` + transaction + audit log).

**Imports pattern** (lines 1–8):
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eq, and, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth-helpers';
import { logAuditEvent, getRequestContext } from '@/lib/audit';
```

**RBAC gate pattern** (lines 23–25):
```typescript
const [session, errorRes] = await requireAdmin();
if (errorRes) return errorRes;
```

**Body validation pattern** (lines 28–32):
```typescript
const body = await request.json().catch(() => null);
if (!body?.pillarKey || !body?.label) {
  return NextResponse.json({ error: 'Missing pillarKey or label' }, { status: 400 });
}
```

**Transactional upsert pattern** (lines 53–69 — adapted, NO `auth.api.setRole` call per RESEARCH Pitfall #2):
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
await db.transaction(async (tx: any) => {
  await tx.insert(pillarDefinitions).values({
    pillarKey: body.pillarKey,
    label: body.label,
    /* ... */
    updatedBy: session.user.id,
    updatedAt: Date.now(),
  }).onConflictDoUpdate({
    target: pillarDefinitions.pillarKey,
    set: {
      label: body.label,
      /* ... */
      updatedBy: session.user.id,
      updatedAt: Date.now(),
    },
  });
});
```

**Audit log pattern** (lines 95–104):
```typescript
const ctx = await getRequestContext();
await logAuditEvent({
  userId: session.user.id,
  action: 'pillar_definition.update',
  resourceType: 'pillar_definition',
  resourceId: body.pillarKey,
  metadata: { from: oldLabel, to: body.label },
  ipAddress: ctx.ipAddress,
  userAgent: ctx.userAgent,
});

return NextResponse.json({ success: true });
```

> RESEARCH Pitfall #2: do NOT copy the `auth.api.setRole(...)` call from the Phase 7 reference (lines 84–92). That solves session invalidation for role changes — irrelevant here.

---

### `src/app/api/admin/assessments/[id]/prescriptions/route.ts` (API route, NEW)

**Analog:** identical pattern to the `pillars` route above, with these additions per CONTEXT D-13/D-16:

**Composite-key read for audit hash** (RESEARCH §Code Examples):
```typescript
const [prev] = await db.select().from(pillarPrescriptions).where(
  and(
    eq(pillarPrescriptions.assessmentId, assessmentId),
    eq(pillarPrescriptions.pillarKey, body.pillarKey)
  )
);
const beforeHash = prev?.summary
  ? createHash('sha256').update(prev.summary).digest('hex').slice(0, 12)
  : null;
const afterHash = createHash('sha256').update(body.summary).digest('hex').slice(0, 12);
```

**Composite-key onConflictDoUpdate target:**
```typescript
await tx.insert(pillarPrescriptions).values({ /* ... */ }).onConflictDoUpdate({
  target: [pillarPrescriptions.assessmentId, pillarPrescriptions.pillarKey],
  set: { /* ... */ },
});
```

**DELETE branch** (CONTEXT D-16):
```typescript
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const [session, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;
  const { id: assessmentId } = await params;
  const url = new URL(request.url);
  const pillarKey = url.searchParams.get('pillarKey');
  if (!pillarKey) return NextResponse.json({ error: 'Missing pillarKey' }, { status: 400 });

  // ... lookup prev for audit hash ...
  // ... delete with composite key ...
  // ... audit with action: 'pillar_prescription.delete' ...
}
```

**Audit action:** `pillar_prescription.upsert` for PATCH, `pillar_prescription.delete` for DELETE. Both extend the `AuditAction` union in `src/lib/audit.ts`.

---

### `src/components/sections/Section11.tsx` (component, REPLACE top half)

**Action class:** REPLACE — current 618-line component becomes a thin `<ReportShell>` that renders `<PillarsGrid>` first and the existing dense marker grid wrapped in `<DetailedMarkerResultsDisclosure>` second.

**Existing internals to preserve and lift unchanged:**
- Lines 30–60 — `TIER_DOT`, `TIER_ROW_BG`, `TIER_ROW_BORDER`, `TIER_TEXT` colour maps (consumed inside the new modal's per-marker rows AND the disclosure).
- Lines 73–86 — `TierPill` component.
- The category-grouped marker grid below the hero — moved verbatim into `DetailedMarkerResultsDisclosure`.

**New props (D-21):** Section 11 (or its replacement `<ReportShell>`) receives server-resolved props from `report/page.tsx`:
```typescript
interface ReportShellProps {
  assessmentId: string;
  definitions: PillarDefinition[];
  pageCopy: PillarPageCopy;
  prescriptions: PillarPrescription[];
  markers: ReportMarker[];   // server-pre-computed (Pitfall #8)
}
```

> The current `Section11Props = { assessmentId: string }` (line 26–28) is too narrow — the planner extends it OR introduces a new `<ReportShell>` and deprecates `<Section11>`. RESEARCH §Component Responsibilities recommends the latter.

---

### `src/app/portal/assessment/[id]/report/page.tsx` (route, additive)

**Existing pattern (lines 37–69) — KEEP UNCHANGED** (Phase 7 BL-05 lock):
```typescript
const rawSession = await auth.api.getSession({ headers: await headers() });
if (!rawSession?.user) redirect('/login');
const session = rawSession as unknown as AuthSession;

const [row] = await db.select().from(assessments).where(eq(assessments.id, id));
if (!row) notFound();
if (!hasAccess(session.user.role, session.user.id, row)) redirect('/portal');
```

**Phase 8 extension (after line 69, before the `return` at line 80):**
```typescript
// Phase 8 — load pillar data + pre-compute markers server-side
const [definitions, pageCopy, prescriptions] = await Promise.all([
  getPillarDefinitions(),
  getPillarPageCopy(),
  getPillarPrescriptions(id),
]);

// Pre-compute markers + ratings server-side (Pitfall #8)
const markers = await computeMarkersForAssessment(id, row);
```

**Pass-through to ReportShell (line 94):**
```tsx
<ReportShell
  assessmentId={id}
  definitions={definitions}
  pageCopy={pageCopy}
  prescriptions={prescriptions}
  markers={markers}
/>
```

> Markers must be computed server-side here (and shared with the PDF route) to avoid the score-drift bug RESEARCH Pitfall #8 documents.

---

### `src/app/api/assessments/[id]/pdf/route.ts` (API route, additive)

**Action:** load `definitions`, `pageCopy`, `prescriptions` and inject into `ReportData` (mirrors the report-page extension above). Same `hasAccess` ownership check (Phase 7 BL-05). Pre-compute markers using the same shared utility.

---

## Shared Patterns

### Authentication / Authorization (admin write paths)

**Source:** `src/lib/auth-helpers.ts` lines 49–58 (`requireAdmin`) + `src/app/api/admin/users/[userId]/role/route.ts` lines 19–25 (call site).
**Apply to:** every Phase 8 API route under `/api/admin/`.

```typescript
// API route entry — first 3 lines after async function POST/PATCH/DELETE(...)
const [session, errorRes] = await requireAdmin();
if (errorRes) return errorRes;
```

For server-component pages under `/portal/admin/`, the equivalent is:
```typescript
const rawSession = await auth.api.getSession({ headers: await headers() });
if (!rawSession?.user) redirect('/login');
const session = rawSession as unknown as AuthSession;
if (session.user.role !== 'admin') redirect('/portal');
```

---

### Authentication / Authorization (read paths — assessment-scoped)

**Source:** `src/app/portal/assessment/[id]/report/page.tsx` lines 26–69.
**Apply to:** every SSR page that renders per-assessment data (the report page extension; the PDF API route).

```typescript
function hasAccess(role: string, userId: string, row: { coachId: string | null; clientId: string | null }): boolean {
  if (role === 'admin') return true;
  if (role === 'coach') return row.coachId === userId;
  if (role === 'client') return row.clientId === userId;
  return false;
}

// Then inside the handler:
const [row] = await db.select().from(assessments).where(eq(assessments.id, id));
if (!row) notFound();
if (!hasAccess(session.user.role, session.user.id, row)) redirect('/portal');
```

> Phase 7 BL-05 lock: this gate runs BEFORE any HTML/data is rendered. Phase 8 extends data load AFTER this check, never before.

---

### Audit Logging

**Source:** `src/lib/audit.ts` lines 16–41 (helper) + `src/app/api/admin/users/[userId]/role/route.ts` lines 95–104 (call site).
**Apply to:** every Phase 8 admin write route after a successful DB write.

```typescript
const ctx = await getRequestContext();
await logAuditEvent({
  userId: session.user.id,
  action: 'pillar_prescription.upsert',  // or one of the other 3 new actions
  resourceType: 'pillar_prescription',
  resourceId: `${assessmentId}:${pillarKey}`,  // composite resource id
  metadata: { /* before/after hashes per D-16 */ },
  ipAddress: ctx.ipAddress,
  userAgent: ctx.userAgent,
});
```

The `AuditAction` union in `src/lib/audit.ts` lines 6–14 must be extended with the 4 Phase 8 actions FIRST (else TypeScript rejects the `action` arg).

---

### Toast notifications (admin form feedback)

**Source:** `src/components/ui/Toast.tsx` (full file) + `src/app/portal/admin/users/page.tsx` lines 26, 35, 84–104, 325–331.
**Apply to:** `AdminPillarsForm`, `AdminPrescriptionsForm`.

```typescript
type ToastState = { variant: ToastVariant; message: string } | null;
const [toast, setToast] = useState<ToastState>(null);

// On success:  setToast({ variant: 'success', message: 'Pillar definitions saved.' });
// On error:    setToast({ variant: 'error',   message: data?.error || "Couldn't save. Try again." });

// Render at end of component tree:
{toast ? <Toast variant={toast.variant} message={toast.message} onDismiss={() => setToast(null)} /> : null}
```

---

### Form input styling (admin surfaces)

**Source:** `src/components/ui/ConfirmDeleteModal.tsx` line 115 (input class).
**Apply to:** every `<input>`, `<textarea>`, `<select>` on the new admin pages.

```tsx
className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/10 transition-all disabled:opacity-50"
```

---

### Tailwind v4 token usage (CLAUDE.md §Key Patterns)

**Source:** `src/app/globals.css` `@theme inline` declarations.
**Apply to:** every new component.

- `text-navy`, `bg-navy` → `--color-navy: #1a365d`
- `text-gold`, `bg-gold` → `--color-gold: #F5A623`
- `bg-surface`, `border-border`, `text-muted` → standard surface tokens
- Ad-hoc hex codes ONLY in `src/lib/pillars/colors.ts` (single source of truth per D-28).

---

### Import conventions (CLAUDE.md §Conventions)

- `@/*` alias maps to `./src/*` — never relative paths
- `import type { ... }` for all type-only imports
- camelCase for functions, variables, fields; PascalCase for components and types
- Pillar keys: `cardiometabolic`, `bodyComposition`, `strength`, `balance`, `vo2`

---

### Server-component → client-component island

**Source:** `src/app/portal/assessment/[id]/report/page.tsx` (server) renders `<Section11 />` (client, line 1: `'use client'`).
**Apply to:** every new admin page (server component for RBAC + data load) renders a client component (`AdminPillarsForm`, `AdminPrescriptionsForm`) for interactivity.

The boundary is implicit — a server component imports a `'use client'`-marked module and React handles the serialisation. Every Phase 8 form component starts with `'use client';` on line 1.

---

### Drizzle query usage (SSR, no I/O wrapping)

**Source:** `src/app/portal/assessment/[id]/report/page.tsx` lines 53–57; `src/lib/normative/db-ranges.ts` (pattern).
**Apply to:** `src/lib/pillars/queries.ts`.

```typescript
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';

const [row] = await db.select().from(table).where(eq(table.id, id));
const rows  = await db.select().from(table).where(eq(table.fk, fkValue));
```

> `db` is exported as `Proxy<any>` from `src/lib/db/index.ts` line 35 — TypeScript inference is loose; explicit `import type` for return shapes.

---

### Composite primary key (NEW — first usage in this codebase)

**Source:** none in repo; pattern from Drizzle 0.45.1 docs.
**Apply to:** `pillarPrescriptions` table in both schema files; matching raw SQL in `runMigrations()`.

Drizzle definition:
```typescript
import { primaryKey } from 'drizzle-orm/sqlite-core';  // or pg-core

export const pillarPrescriptions = sqliteTable('pillar_prescriptions', {
  assessmentId: text('assessment_id').notNull().references(() => assessments.id, { onDelete: 'cascade' }),
  pillarKey: text('pillar_key').notNull(),
  // ... non-key columns
}, (t) => ({
  pk: primaryKey({ columns: [t.assessmentId, t.pillarKey] }),
}));
```

Raw SQL (in `runMigrations`):
```sql
CREATE TABLE IF NOT EXISTS "pillar_prescriptions" (
  "assessment_id" text NOT NULL REFERENCES "assessments"("id") ON DELETE CASCADE,
  "pillar_key" text NOT NULL,
  /* ... */
  PRIMARY KEY ("assessment_id", "pillar_key")
)
```

> RESEARCH Pitfall #3: verify with `npm run db:generate` BEFORE `db:push`; test on local sqlite first.

---

## No Analog Found

Files with no close codebase match (planner falls back to UI-SPEC + RESEARCH `[CITED]` references):

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/components/ui/Dialog.tsx` (focus trap + bottom-sheet variants) | component (primitive) | event-driven | `ConfirmDeleteModal.tsx` is the closest seed but is missing focus trap, body-scroll lock, mode='auto', drag handle, `prefers-reduced-motion`. No existing component covers all five. UI-SPEC §Design System gives the explicit contract; RESEARCH §Pattern 4 + §Pitfall #7 give the implementation skeleton. WAI-ARIA Authoring Practices Modal Dialog pattern is the cited authority. |
| Composite-PK table (`pillar_prescriptions`) | model | CRUD | First composite PK in this codebase; pattern is from Drizzle 0.45.1 docs (RESEARCH §Pitfall #3 cites `https://orm.drizzle.team/docs/indexes-constraints#primary-key`), not from a sibling table. |

---

## Metadata

**Analog search scope:** `src/app/api/admin/`, `src/app/portal/admin/`, `src/components/ui/`, `src/components/sections/`, `src/components/admin/`, `src/components/report/`, `src/lib/pdf/`, `src/lib/db/`, `src/lib/normative/`, `src/lib/audit.ts`, `src/lib/auth-helpers.ts`.

**Files scanned:** 22 (full read), plus targeted greps for `requireAdmin`, `logAuditEvent`, `auth.api.getSession`, `Toast`, `'use client'`.

**Pattern extraction date:** 2026-05-07.

**Confidence:** HIGH — every cross-cutting concern (auth, audit, toasts, RBAC, dialogs, PDF, Drizzle dual-dialect) has a verified Phase 7-or-earlier shipped pattern. The only novel territory is the composite primary key on `pillar_prescriptions` (first in this codebase) and the focus-trap-equipped `Dialog` primitive (extends `ConfirmDeleteModal`).
