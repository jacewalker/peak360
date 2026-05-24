---
phase: quick-260524-gre
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/portal/ClientPickerDialog.tsx
  - src/app/portal/page.tsx
  - src/app/portal/assessments/page.tsx
autonomous: false
requirements:
  - GRE-01  # New-assessment gate: ask which client before creating/entering an assessment
  - GRE-02  # Assign unassigned (null clientName) assessments from the assessments list

must_haves:
  truths:
    - "Clicking any 'Start new assessment' button opens a client picker before an assessment is created"
    - "Picking an existing client name or typing a new name is required — the assessment cannot be created without a name"
    - "The created assessment carries the chosen clientName, and Section 1 renders pre-filled with that name (no auto-save conflict)"
    - "Assessments with empty/null clientName show an 'Assign' action on /portal/assessments"
    - "Assigning sets clientName via the existing assessment update path and the row refreshes to show the name"
  artifacts:
    - path: "src/components/portal/ClientPickerDialog.tsx"
      provides: "Reusable client-name picker (existing list + new name) on top of Dialog"
      min_lines: 60
    - path: "src/app/portal/page.tsx"
      provides: "Dashboard entry points gated by the picker"
      contains: "ClientPickerDialog"
    - path: "src/app/portal/assessments/page.tsx"
      provides: "Gated create + per-row Assign action for unassigned assessments"
      contains: "ClientPickerDialog"
  key_links:
    - from: "src/components/portal/ClientPickerDialog.tsx"
      to: "Dialog"
      via: "wraps the existing ui/Dialog primitive"
      pattern: "import Dialog"
    - from: "src/app/portal/page.tsx"
      to: "POST /api/assessments + PUT /sections/1"
      via: "createAssessment seeds clientName then section-1 blob"
      pattern: "sections/1"
    - from: "src/app/portal/assessments/page.tsx"
      to: "PUT /api/assessments/[id]"
      via: "assign action persists clientName"
      pattern: "method: 'PUT'"
---

<objective>
Add a client gate to every "Start new assessment" entry point and let coaches assign unassigned (legacy) assessments to a client from the assessments list.

Purpose: Enforce "all assessments must be stored against a client" (name-based, no account) and clean up legacy null-name assessments.
Output: One reusable `ClientPickerDialog`, wired into the dashboard and assessments-list create buttons, plus a per-row Assign action on the assessments list.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/260524-gre-when-starting-a-new-assessment-the-first/260524-gre-CONTEXT.md
@./CLAUDE.md

<interfaces>
<!-- Executor: use these directly. No further codebase exploration needed. -->

Dialog primitive — src/components/ui/Dialog.tsx (default export):
```typescript
interface DialogProps {
  open: boolean;
  onClose: () => void;
  mode?: 'centered' | 'bottom-sheet' | 'auto';
  ariaLabel: string;          // required
  children: React.ReactNode;
}
// A child carrying data-autofocus receives initial focus. Escape + backdrop click both call onClose.
```

Assessment list fetch — GET /api/assessments returns `{ success, data: Assessment[] }`.
Each row includes `clientName: string | null`, `coachName`, `currentSection`, `status`, `id`.
Scoping is server-side by role (coach sees own, admin sees all) — the existing-client name list is derived client-side from this same payload (mirror the dedup in src/app/portal/clients/page.tsx).

Create — POST /api/assessments accepts body `{ clientName?, clientEmail?, clientDob?, clientGender?, assessmentDate? }`,
sets coachId from session, returns `{ data: { id } }` (201). Clients (role=client) are 403.

Seed Section 1 blob — PUT /api/assessments/{id}/sections/1 with body `{ data: { clientName, ... } }`.
The section page loads Section 1 from THIS blob (not the assessments record), and section-1 PUT also mirrors
clientName/email/dob/gender/assessmentDate back onto the assessments record. Seeding the blob is what makes
Section 1 render pre-filled and prevents the auto-save from overwriting the chosen name with an empty value.

Assign / update — PUT /api/assessments/{id} accepts a partial body merged onto the row (e.g. `{ clientName }`),
auth = coach owns assessment / admin. Clients are 403.

Current create flow (to be replaced in BOTH pages):
```typescript
const createAssessment = async () => {
  const res = await fetch('/api/assessments', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const { data } = await res.json();
  router.push(`/portal/assessment/${data.id}/section/1`);
};
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Build the reusable ClientPickerDialog</name>
  <files>src/components/portal/ClientPickerDialog.tsx</files>
  <behavior>
    - Two paths in one dialog: pick from an existing-client name list, or type a new name (GRE-01 / D: name-based client model).
    - Confirm is DISABLED until a non-empty name is chosen/typed (a name is REQUIRED — locked decision).
    - Trims whitespace; treats a name that already exists (case-insensitive match) the same as picking it from the list.
    - Calls onConfirm(chosenName) and does not close itself on confirm failure (parent controls open state).
  </behavior>
  <action>
Create a `'use client'` component `ClientPickerDialog` (default export) that wraps `@/components/ui/Dialog`.
Props: `{ open: boolean; onClose: () => void; existingNames: string[]; onConfirm: (name: string) => void | Promise<void>; title?: string; confirmLabel?: string; busy?: boolean }`.
Render inside Dialog (mode default 'auto', `ariaLabel="Choose client"`):
  - A `MonoEyebrow variant="meta"` heading using `title` (default "WHICH CLIENT?").
  - A text input with `data-autofocus`, placeholder "Client name", bound to local `name` state. Use the navy/gold token classes already used on these pages (`bg-bg-3 border border-line rounded-md text-[13px] text-text placeholder:text-text-faint focus:border-gold-brand`).
  - When `existingNames` is non-empty, render a scrollable list of buttons (one per name, sorted, deduped case-insensitively). Filter the list by the current `name` input value (case-insensitive substring) so it doubles as a typeahead. Clicking a name sets `name` to it.
  - A confirm button (label = `confirmLabel` default "Start assessment") that is `disabled` when `name.trim()` is empty OR `busy`, and a Cancel button calling `onClose`.
Confirm handler: `await onConfirm(name.trim())`. Reset local `name` to '' whenever `open` transitions to true (useEffect on `open`).
Import `import Dialog from '@/components/ui/Dialog'` and `import MonoEyebrow from '@/components/ui/MonoEyebrow'`. Use `import type` for any types. Use `@/` imports only.
Do NOT create a clients DB table or any clientId concept — names only.
  </action>
  <verify>
    <automated>cd /Users/jace/Code/peak360 && npx tsc --noEmit 2>&1 | grep -i "ClientPickerDialog" | grep -v "^#" | wc -l | grep -q "^0$" && echo "no type errors in ClientPickerDialog"</automated>
  </verify>
  <done>ClientPickerDialog.tsx exists, exports a default component wrapping Dialog, confirm disabled when name empty, no TypeScript errors referencing the file.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Gate all create entry points + seed Section 1</name>
  <files>src/app/portal/page.tsx, src/app/portal/assessments/page.tsx</files>
  <behavior>
    - Every "Start new assessment" button (dashboard hero, dashboard empty-states, admin recent-empty, assessments-list hero, assessments-list empty-state) opens the picker instead of creating immediately (GRE-01).
    - On confirm: POST /api/assessments with `{ clientName }`, then PUT /api/assessments/{id}/sections/1 with `{ data: { clientName } }` to seed Section 1, then router.push to section 1.
    - The chosen name appears in Section 1's Full Name field on arrival (seeded blob), so auto-save persists it rather than blanking it.
  </behavior>
  <action>
In BOTH `src/app/portal/page.tsx` and `src/app/portal/assessments/page.tsx`:
  - Add `import ClientPickerDialog from '@/components/portal/ClientPickerDialog'` and add `const [pickerOpen, setPickerOpen] = useState(false)` and `const [creating, setCreating] = useState(false)`.
  - Compute `existingNames` from the already-loaded `assessments` state: distinct non-empty `clientName` values, deduped, sorted (mirror the dedup logic in src/app/portal/clients/page.tsx). In page.tsx a `clientNames` Set already exists — reuse it via `Array.from(clientNames).sort()`.
  - Change EVERY "Start new assessment" button's onClick from `createAssessment` to `() => setPickerOpen(true)`. In page.tsx that is: the hero button, the `isEmptyCoach` empty-state button, and the admin/coach `Start new assessment` text buttons inside the Recent-Assessments empty block. In assessments/page.tsx that is: the hero button and the empty-state button.
  - Replace the body of `createAssessment` with a `handleCreateForClient(name: string)` that: sets `creating` true; POSTs `/api/assessments` with `body: JSON.stringify({ clientName: name })`; reads `{ data }`; then PUTs `/api/assessments/${data.id}/sections/1` with `{ data: { clientName: name } }` (Content-Type application/json) to seed Section 1; then `router.push(\`/portal/assessment/${data.id}/section/1\`)`. Wrap in try/finally to always clear `creating`.
  - Render `<ClientPickerDialog open={pickerOpen} onClose={() => setPickerOpen(false)} existingNames={existingNames} onConfirm={handleCreateForClient} busy={creating} />` once near the end of each page's JSX (alongside the existing ConfirmDeleteModal on the assessments page).
  - Remove the now-unused `createAssessment` definition if nothing else references it (search the file first).
Keep all existing styling/tokens unchanged. `import type` for types. `@/` imports only.
  </action>
  <verify>
    <automated>cd /Users/jace/Code/peak360 && npx tsc --noEmit 2>&1 | grep -v "^#" | grep -Ei "portal/page|assessments/page|ClientPickerDialog" | wc -l | grep -q "^0$" && grep -q "ClientPickerDialog" src/app/portal/page.tsx && grep -q "sections/1" src/app/portal/assessments/page.tsx && echo "gate wired in both pages"</automated>
  </verify>
  <done>Both pages import and render ClientPickerDialog; no create button POSTs an empty body; handleCreateForClient seeds the section-1 blob; tsc clean for both files.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Per-row Assign action for unassigned assessments</name>
  <files>src/app/portal/assessments/page.tsx</files>
  <behavior>
    - Rows whose clientName is empty/null show an "Assign" button (next to Delete) and render as "Unassigned" rather than "Unnamed Client" for the affordance.
    - Clicking Assign opens the SAME ClientPickerDialog (reused) seeded with the existing-name list and a confirm label of "Assign".
    - Confirming PUTs /api/assessments/{id} with `{ clientName }`, then refreshes the list (fetchAssessments) so the row shows the assigned name and the Assign button disappears.
    - Row navigation (click-to-open) is not triggered by the Assign button (stopPropagation), matching the existing Delete button.
  </behavior>
  <action>
In `src/app/portal/assessments/page.tsx`:
  - Add state `const [assignTarget, setAssignTarget] = useState<string | null>(null)` (holds the assessment id being assigned) and `const [assigning, setAssigning] = useState(false)`.
  - In the list row, for assessments where `!a.clientName` (empty or null = unassigned per locked decision), add an "Assign" button beside the existing Delete button. Use the same row-action styling as Delete but neutral/gold accent (e.g. `text-text-dim hover:text-gold-brand hover:bg-gold-brand/10`), with `onClick={(e) => { e.stopPropagation(); setAssignTarget(a.id); }}` and `aria-label={\`Assign assessment ${a.id} to a client\`}`. Keep it always visible (not opacity-0) so the unassigned affordance is obvious.
  - Add `handleAssign = async (name: string) => { ... }`: set `assigning` true; PUT `/api/assessments/${assignTarget}` with `body: JSON.stringify({ clientName: name })` and Content-Type application/json; on success `setAssignTarget(null)` and `await fetchAssessments()`; try/finally clears `assigning`.
  - Render a SECOND `ClientPickerDialog` instance for assignment: `open={assignTarget !== null} onClose={() => setAssignTarget(null)} existingNames={existingNames} onConfirm={handleAssign} title="ASSIGN TO CLIENT" confirmLabel="Assign" busy={assigning}`. (The create picker from Task 2 stays separate so the two flows don't collide.)
  - Reuse the same `existingNames` computed in Task 2.
Do not change the assessment update API — `PUT /api/assessments/[id]` already merges the partial body. `@/` imports, `import type` for types, navy/gold tokens only.
  </action>
  <verify>
    <automated>cd /Users/jace/Code/peak360 && npx tsc --noEmit 2>&1 | grep -v "^#" | grep -i "assessments/page" | wc -l | grep -q "^0$" && grep -q "assignTarget" src/app/portal/assessments/page.tsx && grep -q "confirmLabel=\"Assign\"" src/app/portal/assessments/page.tsx && echo "assign action wired"</automated>
  </verify>
  <done>Unassigned rows show an Assign button that opens the picker; confirming PUTs clientName and refreshes the list; tsc clean for the file.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>A client gate on every "Start new assessment" button (dashboard + assessments list) and a per-row Assign action for unassigned assessments on /portal/assessments.</what-built>
  <how-to-verify>
    1. Run `npm run dev` and log in as a coach.
    2. On /portal dashboard click "Start new assessment" — a dialog must appear asking which client BEFORE any assessment is created. Confirm is disabled until a name is entered.
    3. Type a new name and confirm — you land on Section 1 with the Full Name field already filled with that name. Reload Section 1; the name persists (no blanking).
    4. Start another assessment and pick an EXISTING name from the list — same pre-fill behavior.
    5. Repeat the gate check from the /portal/assessments hero button and from the empty-state button.
    6. On /portal/assessments, find an unassigned assessment (empty/legacy name, shows "Unassigned"). Click "Assign", choose/type a client name, confirm — the row refreshes to show the name and the Assign button disappears.
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` is clean across the three modified/added files.
- `npm run lint` passes (no unused `createAssessment`, no relative imports).
- No new npm dependency added; Dialog primitive reused.
- No DB schema change; POST/PUT contracts unchanged.
</verification>

<success_criteria>
- Every "Start new assessment" entry point requires a client name before an assessment exists (GRE-01).
- New assessments are created with `clientName` and Section 1 renders pre-filled with it, with no auto-save conflict.
- Unassigned assessments on /portal/assessments can be assigned via a per-row action that persists `clientName` (GRE-02).
- Existing/legacy null-name assessments continue to load and display until assigned (backwards compatible).
</success_criteria>

<output>
Create `.planning/quick/260524-gre-when-starting-a-new-assessment-the-first/260524-gre-SUMMARY.md` when done.
</output>
