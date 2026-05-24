# Quick Task 260524-gre: New-assessment client gate + assign unassigned - Context

**Gathered:** 2026-05-24
**Status:** Ready for planning

<domain>
## Task Boundary

When starting a new assessment, the first prompt must be "Which client is this for?" / "Is this for a new client?" If it's a new client, ask for their name. All assessments must be stored against a client. For unassigned (existing/legacy) assessments, add the ability to assign them to a client.

</domain>

<decisions>
## Implementation Decisions (LOCKED — do not revisit)

### Client model — NAME-BASED
- A "client" is identified by `assessments.clientName` (the Section 1 client name). This matches the existing `/portal/clients` page, which groups assessments by `clientName`.
- Do NOT create or require a registered `user` account (role=client) / `clientId` for this feature. No email, no invite, no login provisioning.
- "Unassigned" = an assessment whose `clientName` is empty/null.

### New-assessment flow (the gate)
- Replace the current one-click `createAssessment` (which immediately POSTs `{}` and navigates to section 1) with a first prompt/modal that asks **which client** before the assessment is created (or before navigating into it).
- The prompt offers two paths:
  - **Existing client:** choose from the distinct `clientName` values already visible to the current user (coach sees their own; admin sees all). Selecting one seeds the new assessment's `clientName` (and may prefill known email/dob/gender for that name).
  - **New client:** the coach types a name. That name is stored on the new assessment's `clientName`.
- A client name is REQUIRED to start an assessment — no assessment may be created without one (enforces "all assessments must be stored against a client" for new assessments going forward).
- Apply the gate to ALL "Start new assessment" entry points (portal dashboard `src/app/portal/page.tsx`, assessments list `src/app/portal/assessments/page.tsx`, and any others) for consistency.

### Assign unassigned assessments — ASSESSMENTS LIST
- Surface an "Assign" action per-row on `/portal/assessments` for assessments with no `clientName`.
- Assigning sets `assessments.clientName` (and persists via the existing assessment update path). Allow choosing an existing client name or typing a new one — same picker used by the new-assessment gate.
- Backwards compatibility: existing/legacy assessments with null `clientName` continue to work; they simply show as unassigned until assigned.

</decisions>

<specifics>
## Specific Ideas / Integration Points

- Creation today: `createAssessment()` in `src/app/portal/page.tsx` and `src/app/portal/assessments/page.tsx` POST `{}` to `/api/assessments`, then `router.push('/portal/assessment/{id}/section/1')`.
- `POST /api/assessments` already accepts `clientName` in the body and writes it; it sets `coachId = session.user.id`. Clients (role=client) are blocked from creating.
- Section 1 (`clientName`) also writes back to the assessment record via section save — keep the gate's `clientName` consistent with Section 1 so they don't fight. Seeding Section 1 with the chosen name is desirable.
- Existing-client name list can be derived from `GET /api/assessments` (already returns `clientName` per row, scoped by role) — the clients page already builds this distinct-name map.
- Update assessment: `PATCH/PUT /api/assessments/[id]` (see `src/app/api/assessments/[id]/route.ts`) for the assign action; reuse its auth (coach owns assessment / admin).

</specifics>

<canonical_refs>
## Canonical References

No external specs — requirements fully captured in decisions above. Honor `CLAUDE.md` conventions (camelCase fields, `@/` imports, SectionProps patterns, navy/gold tokens).

</canonical_refs>
