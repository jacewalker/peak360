---
phase: 11-report-marker-detail-coach-insights
reviewed: 2026-05-26T00:00:00Z
depth: standard
files_reviewed: 16
files_reviewed_list:
  - src/app/api/admin/marker-content/[marker]/route.ts
  - src/app/api/admin/marker-content/route.ts
  - src/app/api/marker-content/route.ts
  - src/app/portal/admin/marker-content/MarkerContentList.tsx
  - src/app/portal/admin/marker-content/[marker]/page.tsx
  - src/app/portal/admin/marker-content/page.tsx
  - src/app/portal/admin/page.tsx
  - src/components/report/PillarsDisplay.tsx
  - src/components/report/PillarsDisplayModal.tsx
  - src/components/sections/Section11.tsx
  - src/lib/audit.ts
  - src/lib/db/index.ts
  - src/lib/db/schema-sqlite.ts
  - src/lib/db/schema.ts
  - src/lib/marker-content/queries.ts
  - src/lib/marker-content/seed-content.ts
findings:
  critical: 1
  warning: 6
  info: 4
  total: 11
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-05-26T00:00:00Z
**Depth:** standard
**Files Reviewed:** 16
**Status:** issues_found

## Summary

Phase 11 adds an admin-authored marker-content store (definition + impact + a
5-tier × {male,female} coach-insight matrix) surfaced in the report's pillar
modal. The phase brief's headline requirements are met and well-executed:

- **RBAC is correct.** `/api/admin/marker-content/*` (both the list and the
  per-marker GET/PUT) gate through `requireAdmin()` → 403 for non-admins. The
  SSR page `page.tsx` redirects non-admin sessions to `/portal`. The
  client-read `GET /api/marker-content` uses `requireSession()` with no role
  gate, so any authenticated coach/client/admin can read — exactly as specified.
- **No XSS surface.** Definition, impact, and coach insights all render as plain
  React children (`{body}`, `{authored}`) with `whitespace-pre-line`. There is no
  raw-HTML injection API, `innerHTML`, or `eval` in any reviewed file.
- **Audit logging** fires on PUT (`logAuditEvent('marker_content.update')`) with
  IP/UA context, and the action is registered in the `AuditAction` union.
- **D-06 fallback** in `MarkerDetailPanel` is implemented as specified: authored
  `coachInsights[tier][gender]` wins; otherwise `generatePeak360Insights` output
  is shown labelled "Auto-generated · no coach insight authored yet".
- **seed-content.ts** (1980 lines) spot-checks clean: all keys map to real
  `REPORT_MARKERS` testKeys (0 orphans, 0 missing), tone is D-14 compliant (no
  fabricated numeric thresholds, no disease-prevention/longevity guarantees),
  and the `bothGenders()` helper keeps the matrix fully populated honestly.

The defects below are concentrated in **input validation on the write path**
(the PUT accepts and persists an arbitrary unvalidated JSON blob into
`coachInsights`) and **optimistic-concurrency correctness** (the 409 check mixes
client and server clock sources and is not race-safe).

## Critical Issues

### CR-01: PUT persists unvalidated `coachInsights` JSON blob — schema-poisoning / stored-data integrity risk

**File:** `src/app/api/admin/marker-content/[marker]/route.ts:100-145`
**Issue:** The request body is cast (`as { ...; coachInsights?: CoachInsights }`)
but never validated. `body.coachInsights ?? null` is written verbatim into the
JSON column. A malicious or buggy admin client can store any JSON shape —
deeply nested objects, arrays, extra tiers, a string where the matrix is
expected, megabytes of data, etc. The read side
(`PillarsDisplayModal.MarkerDetailPanel`) then does
`content.coachInsights[tier]?.[genderKey]?.trim()`. If a stored cell value is a
non-string (e.g. a number or object because the blob was poisoned), `.trim()` is
not a function and the **report modal throws at render**, taking down the report
for every coach/client viewing that marker — not just the admin who wrote it.
Because the read endpoint is any-role and the data is global, one bad write
corrupts the report for the entire user base (blast radius is global, which is
why this is Critical rather than Warning). The TypeScript cast provides zero
runtime protection.

While the writer is admin-only (lower likelihood), the consequence is a
persistent, globally-visible render crash with no server-side guard. Validate
the shape before persisting.

**Fix:**
```ts
const TIERS = ['poor','cautious','normal','great','elite'] as const;

function sanitizeCoachInsights(raw: unknown): CoachInsights {
  if (raw == null || typeof raw !== 'object') return null;
  const out = {} as NonNullable<CoachInsights>;
  for (const tier of TIERS) {
    const cell = (raw as Record<string, unknown>)[tier];
    const male = cell && typeof cell === 'object'
      ? (cell as Record<string, unknown>).male : null;
    const female = cell && typeof cell === 'object'
      ? (cell as Record<string, unknown>).female : null;
    out[tier] = {
      male: typeof male === 'string' ? male.slice(0, 5000) : null,
      female: typeof female === 'string' ? female.slice(0, 5000) : null,
    };
  }
  return out;
}

// in PUT, before insert:
const definition = typeof body.definition === 'string' ? body.definition.slice(0, 10000) : null;
const impact = typeof body.impact === 'string' ? body.impact.slice(0, 10000) : null;
const coachInsights = sanitizeCoachInsights(body.coachInsights);
// ...persist definition / impact / coachInsights (the sanitized values)
```
Additionally harden the read side so a legacy/poisoned cell can never crash:
`const cell = content?.coachInsights?.[tier]?.[genderKey]; const authored = typeof cell === 'string' ? cell.trim() || null : null;`

## Warnings

### WR-01: Optimistic-concurrency check mixes server and client clocks — silently defeats the 409 guard

**File:** `src/app/api/admin/marker-content/[marker]/route.ts:108-123` and `src/app/portal/admin/marker-content/[marker]/page.tsx:132`
**Issue:** On a successful save the editor sets
`setServerUpdatedAt(Date.now())` using the **browser** clock, but the server
stored `now = Date.now()` from the **server** clock. The next PUT sends the
browser timestamp, and the server compares `current.updatedAt > body.updatedAt`.
If the client clock is ahead of the server clock (common — clock skew of seconds
to minutes is normal), `body.updatedAt` will be larger than the stored value, so
`current.updatedAt > body.updatedAt` is false and the 409 guard never fires even
when another admin wrote in between. Conversely, if the client clock lags, the
admin gets spurious 409s on their own back-to-back saves. The two timestamps are
never guaranteed to be on the same clock.
**Fix:** Return the authoritative `updatedAt` from the PUT response and have the
client adopt it, rather than fabricating one:
```ts
// server PUT: return NextResponse.json({ success: true, data: { updated: 1, updatedAt: now } });
// client: setServerUpdatedAt(json.data?.updatedAt ?? Date.now());
```

### WR-02: 409 concurrency check is not atomic — last-writer-still-wins under a real race

**File:** `src/app/api/admin/marker-content/[marker]/route.ts:108-145`
**Issue:** The staleness SELECT (lines 109-112) and the upsert (lines 126-145)
are two separate statements with no transaction or conditional WHERE. Two admins
who both pass the SELECT check before either writes will both proceed to
`onConflictDoUpdate`, and the second silently overwrites the first — the exact
lost-update the 409 is meant to prevent. The check only catches the case where
the conflicting write already committed before the SELECT ran.
**Fix:** Make the update conditional on the timestamp so the DB enforces it
atomically, e.g. add `.where(eq(markerContent.updatedAt, body.updatedAt))` to a
dedicated UPDATE path and treat a 0-row result as the 409, or wrap select+upsert
in a transaction. At minimum, document that the guard is advisory.

### WR-03: `getAllMarkerContent` / `getMarkerContentByKey` type `updatedBy` as non-null `string` but the value can be null at runtime

**File:** `src/lib/marker-content/queries.ts:21,34-35,54-55`
**Issue:** `MarkerContent.updatedBy` is declared `string` (non-null) and the
mapper does `updatedBy: r.updatedBy as string`. The DB column is `NOT NULL` for
new rows, but the cast is unchecked — and the single-marker admin GET
(`[marker]/route.ts:56`) returns `updatedBy: null` for the not-yet-authored
empty-form case, which contradicts the `MarkerContent` interface those consumers
share. The type lies, and any consumer that does `content.updatedBy.length` or
similar would NPE. Minor today because no consumer dereferences it, but it is a
latent footgun.
**Fix:** Type `updatedBy: string | null` in the `MarkerContent` interface and
coerce: `updatedBy: (r.updatedBy as string | null) ?? null`.

### WR-04: `authoredKeys` filter relies on truthiness of a JSON column that may be a non-empty empty-matrix object

**File:** `src/app/api/admin/marker-content/route.ts:20-22`
**Issue:** `.filter((r) => r.definition || r.impact || r.coachInsights)` treats
any non-null `coachInsights` value as "authored". The editor's `normalizeMatrix`
/ `emptyMatrix` produces a full object with all-empty strings, and a save of an
otherwise-untouched marker persists that object (not null). So a marker an admin
opened and saved with no actual content is flagged "Authored", misleading the
list's status pill. Truthiness of an object is always `true` regardless of
emptiness.
**Fix:** Check for real content, e.g. treat `coachInsights` as authored only if
some tier/gender string is non-empty after trimming; mirror the same trim-based
test the modal uses.

### WR-05: Editor's `handleSave` does not refetch on 409 nor block the dirty-guard, leaving the user able to re-save stale data

**File:** `src/app/portal/admin/marker-content/[marker]/page.tsx:122-134`
**Issue:** On 409 the code sets an error string but leaves `isDirty` true and
`serverUpdatedAt` unchanged. The admin can immediately click Save again; the PUT
re-sends the same stale `updatedAt` and (depending on timing/WR-01) may now
succeed, clobbering the other admin's change — the very outcome the 409 exists to
prevent. The error message says "Reload to see their changes" but nothing
enforces it.
**Fix:** On 409, disable the Save button (or force a reload of server content)
until the user explicitly reloads, so a stale resubmit cannot succeed.

### WR-06: `beforeunload` dirty guard calls `e.preventDefault()` without `e.returnValue` — unreliable across browsers

**File:** `src/app/portal/admin/marker-content/[marker]/page.tsx:95-101`
**Issue:** Several browsers (notably older Chrome/Edge variants and some mobile
browsers) only show the unsaved-changes prompt when `e.returnValue` is set, not
on `preventDefault()` alone. As written the guard may silently no-op, letting an
admin navigate away and lose authored copy without warning — a real data-loss
path for a content-authoring tool.
**Fix:**
```ts
const handler = (e: BeforeUnloadEvent) => {
  if (!isDirty) return;
  e.preventDefault();
  e.returnValue = '';
};
```

## Info

### IN-01: Empty-style error swallowing hides root cause in the read paths

**File:** `src/app/api/marker-content/route.ts:21-26`, `src/components/sections/Section11.tsx:194-196`
**Issue:** Catch blocks discard the error entirely (`catch { return 500 }` /
`catch { setMarkerContentMap(new Map()) }`). The report fetch silently degrades
to the auto-generated fallback on any error with no diagnostic. This matches the
project's "audit logging must never break the main operation" convention for the
write path, but on reads it makes production debugging hard.
**Fix:** Log the error server-side (`console.error('[marker-content] read failed', err)`)
before returning the generic message.

### IN-02: `console.error` calls in PDF export, audit, and seed-admin paths

**File:** `src/components/sections/Section11.tsx:162`, `src/lib/audit.ts:49`, `src/lib/db/index.ts:625`
**Issue:** Several `console.error` calls remain. These are intentional
operational logging (consistent with the codebase's minimal-logging convention),
not stray debug statements — noted for completeness, not action.
**Fix:** None required; consider routing through a structured logger if one is
adopted later.

### IN-03: SQLite/Postgres seed-loop is duplicated verbatim between the two branches

**File:** `src/lib/db/index.ts:311-327` (PG) and `:578-592` (SQLite)
**Issue:** The Phase 11 marker-content seed loop is copy-pasted with only the
JSON-cast / `INSERT OR IGNORE` vs `ON CONFLICT DO NOTHING` differing. Future
edits must be kept in sync by hand (the comment already drifts: PG says "One
INSERT per marker"). This mirrors the Phase 8 duplication, so it is consistent
with the existing pattern, but it is a maintenance hazard.
**Fix:** Extract a shared `seedMarkerContent(db, dialect)` helper. Low priority.

### IN-04: Editor sends full empty-string matrix on save rather than nulls

**File:** `src/app/portal/admin/marker-content/[marker]/page.tsx:31-47,118`
**Issue:** `normalizeMatrix` defensively coerces nulls to `''`, which is good,
but on save the editor sends the full `coachInsights` matrix with empty strings
for untouched cells (feeding WR-04). Consider sending `null` for cells the admin
left blank so "authored" detection stays meaningful. Cosmetic/data-hygiene.
**Fix:** Map empty-string cells to `null` before `JSON.stringify` in `handleSave`.

---

_Reviewed: 2026-05-26T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
