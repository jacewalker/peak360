---
phase: quick
plan: 260509-ody
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/report/PillarsDisplayModal.tsx
  - src/components/report/PillarsDisplay.tsx
  - src/components/sections/Section11.tsx
autonomous: false
requirements:
  - QUICK-260509-ody
must_haves:
  truths:
    - "Each of the 5 pillars in Section 11's PillarsDisplay is keyboard-focusable and clickable"
    - "Clicking a pillar opens a modal with backdrop blur, focus trap, ESC-to-close, and a mobile bottom-sheet layout (via the existing Dialog primitive)"
    - "The modal shows: pillar name, status badge, score (or em-dash when pending), the pillar's blurb from PILLARS, and the contributing markers grouped by tier (poor → cautious → normal → great → elite)"
    - "Each marker row shows label, value+unit, and a tier pill; markers without a tier (no value or no norms) appear under a separate 'Pending' group"
    - "The modal only shows markers belonging to the clicked pillar (filtered via the same markerToPillar mapping that PillarsDisplay's scores use)"
    - "PillarsDisplay's existing visual design — HUD corner brackets, tick scale, duotone bubble, mono digital readout, status row, name, rated/total fraction — is preserved; the only visible change is hover/focus affordance on the wrapping button"
  artifacts:
    - path: "src/components/report/PillarsDisplayModal.tsx"
      provides: "Section-local modal wrapping the shared Dialog primitive; takes selected PillarScore + pillar's ReportMarker[] subset"
      exports: ["default"]
    - path: "src/components/report/PillarsDisplay.tsx"
      provides: "Updated component: per-pillar wrapper is now a <button>, holds selectedKey state, renders PillarsDisplayModal"
    - path: "src/components/sections/Section11.tsx"
      provides: "Passes markers={markers} prop down to <PillarsDisplay />"
  key_links:
    - from: "src/components/sections/Section11.tsx"
      to: "src/components/report/PillarsDisplay.tsx"
      via: "<PillarsDisplay pillars={pillars} markers={markers} />"
      pattern: "PillarsDisplay\\s+pillars=\\{pillars\\}\\s+markers=\\{markers\\}"
    - from: "src/components/report/PillarsDisplay.tsx"
      to: "src/components/report/PillarsDisplayModal.tsx"
      via: "default import + conditional render gated on selectedKey state"
      pattern: "import\\s+PillarsDisplayModal\\s+from\\s+'@/components/report/PillarsDisplayModal'"
    - from: "src/components/report/PillarsDisplayModal.tsx"
      to: "src/components/ui/Dialog.tsx"
      via: "default import; modal wraps content in <Dialog open onClose mode='auto' ariaLabel={...}>"
      pattern: "import\\s+Dialog\\s+from\\s+'@/components/ui/Dialog'"
    - from: "src/components/report/PillarsDisplayModal.tsx"
      to: "src/lib/pillars/mapping.ts"
      via: "imports PILLARS const + markerToPillar (to filter the markers prop down to the selected pillar's contributing set)"
      pattern: "from\\s+'@/lib/pillars/mapping'"
---

<objective>
Make each of the five pillars in Section 11's `PillarsDisplay` clickable. Clicking a pillar opens a section-local modal showing the pillar's blurb plus the markers that contributed to its score, grouped by tier. Reuse the existing `Dialog` primitive (backdrop blur, focus trap, ESC, mobile bottom-sheet) — do not reuse `PillarModal.tsx`, which is a Phase-8 component requiring DB-loaded `PillarDefinition` / `PillarPrescription` props that Section 11 does not have.

Purpose: Give the in-app Section 11 report explanatory depth on each pillar score without changing how Section 11 sources its data (no DB plumbing). Preserves the existing "Liquid Signal Columns" visual design.

Output: Three files modified — one new modal component, an updated `PillarsDisplay` (button wrapper + state + modal render), and a one-line prop addition in `Section11`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/STATE.md

<!-- Files the executor will modify or directly depend on -->
@src/components/report/PillarsDisplay.tsx
@src/components/sections/Section11.tsx
@src/components/ui/Dialog.tsx
@src/lib/pillars/mapping.ts

<interfaces>
<!-- Key contracts the executor needs. Extracted from the codebase so no exploration is required. -->

From `src/components/ui/Dialog.tsx` (the primitive to reuse):
```typescript
interface DialogProps {
  open: boolean;
  onClose: () => void;
  mode?: 'centered' | 'bottom-sheet' | 'auto'; // 'auto' = bottom-sheet on mobile, centred from md+
  ariaLabel: string;
  children: React.ReactNode;
}
export default function Dialog(props: DialogProps): JSX.Element | null;
// Notes:
// - Already handles backdrop click → onClose, ESC → onClose, body scroll lock,
//   focus trap with bidirectional Tab cycling, focus restoration on unmount.
// - Add `data-autofocus` on a child to set initial focus (e.g. the Close button).
// - In `auto` mode the panel auto-renders a mobile drag handle.
```

From `src/lib/pillars/mapping.ts`:
```typescript
export interface PillarDef { key: PillarKey; label: string; blurb: string; }
export const PILLARS: PillarDef[]; // 5 entries: cardiometabolic, vo2, bodyComposition, strength, balance

export interface PillarScore {
  key: PillarKey; label: string; blurb: string;
  rated: number; total: number;
  score: number | null;
  status: TrafficLight; // 'green' | 'amber' | 'red' | 'pending'
}

// Classifier — returns the pillar a marker belongs to. Mirrors what
// computeAllPillarScoresLegacy uses internally, so re-running it on the
// same marker rows yields the same per-pillar grouping.
export function markerToPillar(m: {
  category: string; subcategory?: string; testKey?: string; key?: string; label: string;
}): { pillar: PillarKey | null; supporting: boolean };

// Existing palette adapter — already exported and used by PillarsDisplay.
export const TRAFFIC_LIGHT: Record<PillarStatus,
  { fill: string; bg: string; ring: string; text: string; label: string }>;
```

From `src/lib/pillars/types.ts` (re-exported via mapping.ts):
```typescript
export type PillarKey = 'cardiometabolic' | 'vo2' | 'bodyComposition' | 'strength' | 'balance';
export type PillarStatus = 'green' | 'amber' | 'red' | 'pending';
```

From `src/lib/pdf/types.ts`:
```typescript
export interface ReportMarker {
  key: string;            // matches markerToPillar's `key` field
  label: string;
  value: number | null;
  tier: RatingTier | null; // null when no value or no norms
  unit: string;
  category: string;
  subcategory?: string;
  hasNorms: boolean;
  resolvedStandards?: TierRanges | null;
}
```

From `src/types/normative.ts`:
```typescript
export type RatingTier = 'poor' | 'cautious' | 'normal' | 'great' | 'elite';
export const TIER_LABELS: Record<RatingTier, string>;  // 'Poor' | 'Cautious' | ...
export const TIER_COLORS: Record<RatingTier, string>;  // tailwind class strings, e.g. 'text-emerald-700 bg-emerald-100 border-emerald-300'
```

From `src/components/sections/Section11.tsx` (around lines 64, 211–221, 341):
```typescript
import PillarsDisplay from '@/components/report/PillarsDisplay';
// `markers` state already holds ReportMarker[] for all REPORT_MARKERS.
// `pillars` state already holds PillarScore[] (5 entries).
// Caller line 341:  <PillarsDisplay pillars={pillars} />
```
</interfaces>

<rules-from-claude-md>
- 'use client' directive at the top of any client component (required for React 19 + Next.js App Router).
- Always import types with `import type { ... }`.
- Use `@/` path alias (never relative `../../`).
- camelCase for variables/handlers, PascalCase for components/types.
- Tailwind classes; reuse the existing color tokens (`text-navy`, etc.) where it fits, but inline-style hex/RGBA is acceptable here for parity with `PillarsDisplay.tsx`.
</rules-from-claude-md>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Build PillarsDisplayModal</name>
  <files>src/components/report/PillarsDisplayModal.tsx</files>
  <behavior>
    - Renders only when `open === true` (Dialog handles the actual mount).
    - Shows pillar name (from `pillar.label`), status badge (from `TRAFFIC_LIGHT[pillar.status].label` with the matching `.fill`/`.text` colors), score (`pillar.score` or `'—'` when status is 'pending'), and pillar blurb (from `PILLARS.find(p => p.key === pillar.key)?.blurb`, fallback to `pillar.blurb`).
    - Filters the `markers` prop to those belonging to the selected pillar by calling `markerToPillar(m)` and keeping rows where `pillar === selected.key` (include both primary and supporting — modal is informational, not score-strict).
    - Groups the filtered markers by `tier` in the order: poor → cautious → normal → great → elite, then a final 'Pending' group for `tier === null`.
    - Each marker row shows: `m.label` (left), `m.value != null ? \`${m.value} ${m.unit}\` : 'No data'` (centre/right), tier pill using `TIER_COLORS[tier]` + `TIER_LABELS[tier]` (or a neutral grey 'Pending' pill).
    - Empty groups are not rendered.
    - Has a Close button (top-right, with `data-autofocus` attribute) that calls `onClose`.
    - Wraps content in `<Dialog open={open} onClose={onClose} mode="auto" ariaLabel={\`${pillar.label} pillar details\`}>`.
  </behavior>
  <action>
    Create `src/components/report/PillarsDisplayModal.tsx`. Mark it `'use client'`.

    Props interface (export as named type if useful):
    ```typescript
    interface Props {
      open: boolean;
      onClose: () => void;
      pillar: PillarScore;        // from '@/lib/pillars/mapping'
      markers: ReportMarker[];    // from '@/lib/pdf/types' — caller passes the FULL marker array; modal filters
    }
    ```

    Imports:
    - `Dialog` (default) from `@/components/ui/Dialog`
    - `PILLARS, TRAFFIC_LIGHT, markerToPillar`, type `PillarScore` from `@/lib/pillars/mapping`
    - type `ReportMarker` from `@/lib/pdf/types`
    - `TIER_LABELS, TIER_COLORS`, type `RatingTier` from `@/types/normative`

    Implementation outline:
    1. Look up the matching `PillarDef` via `PILLARS.find(p => p.key === pillar.key)` for the blurb (fallback to `pillar.blurb`).
    2. Compute `tone = TRAFFIC_LIGHT[pillar.status]` for badge colours.
    3. Build `pillarMarkers = markers.filter(m => markerToPillar(m).pillar === pillar.key)`. (Do NOT exclude `supporting` — modal lists everything classified into the pillar so the user sees all relevant markers.)
    4. Group into a `Record<RatingTier | 'pending', ReportMarker[]>`. Use a fixed display order array: `['poor', 'cautious', 'normal', 'great', 'elite', 'pending'] as const`.
    5. Render structure inside the Dialog:
       - Header row: pillar name (h2, navy, font-semibold, text-xl) on the left; Close button (×) on the right with `data-autofocus`, `aria-label="Close"`, `type="button"`. Add `onClick={onClose}`.
       - Score + status row: large mono score (`text-4xl font-bold tabular-nums`) using `tone.text`, em-dash when pending; status badge to the right using `tone.bg` background + `tone.text` color + small uppercase label.
       - Blurb paragraph: `text-sm text-[#475569] mt-2`.
       - Section heading: "Markers" with subtitle showing count (e.g. "8 contributing").
       - For each non-empty tier group: a small uppercase header (e.g. `<h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#64748b] mt-4 mb-2">{TIER_LABELS[tier]}</h3>`), then a list of marker rows. Each row: flex justify-between items-center, py-1.5 border-b border-[#f1f5f9]; left = `<span className="text-sm text-[#1a365d]">{m.label}</span>`; right cluster = value+unit (or `<span className="text-xs text-[#94a3b8]">No data</span>`) + tier pill (`TIER_COLORS[tier]` classes wrapped in `inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase border`).
       - When `pillarMarkers.length === 0`: render `<p className="text-sm text-[#94a3b8] mt-4">No markers classified into this pillar.</p>`.

    Use inline-style hexes only where Tailwind tokens are inadequate (matches the style of PillarsDisplay.tsx).

    Per the Dialog primitive contract, do NOT add your own ESC handler, focus trap, or backdrop — Dialog already provides them.

    Do not introduce new dependencies.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&amp;1 | grep -E "(PillarsDisplayModal|error)" | head -20</automated>
    <automated>grep -c "import Dialog from '@/components/ui/Dialog'" src/components/report/PillarsDisplayModal.tsx</automated>
    <automated>grep -c "markerToPillar" src/components/report/PillarsDisplayModal.tsx</automated>
    <automated>grep -c "data-autofocus" src/components/report/PillarsDisplayModal.tsx</automated>
  </verify>
  <done>
    File exists, compiles without new TS errors, imports Dialog (no re-implementation of focus trap/ESC), filters markers via `markerToPillar`, has a Close button with `data-autofocus`.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Wire PillarsDisplay buttons + selection state, and pass markers from Section11</name>
  <files>src/components/report/PillarsDisplay.tsx, src/components/sections/Section11.tsx</files>
  <behavior>
    - `PillarsDisplay` accepts a new optional prop: `markers?: ReportMarker[]` (optional so the component degrades gracefully if ever rendered without it — modal simply opens with an empty marker list).
    - The component holds local state `const [selectedKey, setSelectedKey] = useState<PillarKey | null>(null)`.
    - Each pillar is wrapped in a `<button type="button">` (the existing inner `<article>` content stays inside the button, OR the outer wrapper changes from `<article>` to `<button>` — implementor's choice — visual layout, classes, glow halo, and tick scale must be unchanged).
    - The button has: `onClick={() => setSelectedKey(pillar.key)}`, `aria-label={\`Open ${pillar.label} pillar details\`}`, focus ring on `:focus-visible` (use Tailwind `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24a]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-[36px]`), and a subtle hover affordance (`hover:-translate-y-0.5 motion-safe:transition-transform`).
    - Below the row, render `<PillarsDisplayModal open={selectedKey !== null} onClose={() => setSelectedKey(null)} pillar={selected} markers={markers ?? []} />` where `selected = pillars.find(p => p.key === selectedKey)` — only render when `selected` is truthy (guard the lookup).
    - In `Section11.tsx`, the call site at line ~341 changes from `<PillarsDisplay pillars={pillars} />` to `<PillarsDisplay pillars={pillars} markers={markers} />`. No other Section 11 changes.
  </behavior>
  <action>
    **Edit 1 — `src/components/report/PillarsDisplay.tsx`:**

    1. Add `useState` import from React: `import { useState } from 'react';` at the top (the file already has `'use client'`).
    2. Add type imports: `import type { PillarKey } from '@/lib/pillars/types';` (or via `@/lib/pillars/mapping` which re-exports it), and `import type { ReportMarker } from '@/lib/pdf/types';`.
    3. Add default import: `import PillarsDisplayModal from '@/components/report/PillarsDisplayModal';`.
    4. Update the `Props` interface:
       ```typescript
       interface Props {
         pillars: PillarScore[];
         markers?: ReportMarker[];
       }
       ```
    5. Update the component signature: `export default function PillarsDisplay({ pillars, markers }: Props)`.
    6. Inside the component (top of body), add state:
       ```typescript
       const [selectedKey, setSelectedKey] = useState<PillarKey | null>(null);
       const selected = selectedKey ? pillars.find((p) => p.key === selectedKey) ?? null : null;
       ```
    7. Pass an `onSelect` callback into `<Pillar>`:
       ```tsx
       {pillars.map((p, idx) => (
         <Pillar key={p.key} pillar={p} index={idx} onSelect={() => setSelectedKey(p.key)} />
       ))}
       ```
    8. Update the `Pillar` function signature to accept `onSelect: () => void`. Change the OUTERMOST element from `<article className="group relative flex flex-col items-center text-center">` to:
       ```tsx
       <button
         type="button"
         onClick={onSelect}
         aria-label={`Open ${pillar.label} pillar details`}
         className="group relative flex flex-col items-center text-center cursor-pointer rounded-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a24a]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white motion-safe:transition-transform hover:-translate-y-0.5"
       >
         {/* ...existing children unchanged... */}
       </button>
       ```
       (All inner JSX — channel label, glow, capsule, status row, name, fraction — stays IDENTICAL. Visual design must not change.)
    9. After the closing `</div>` of the pillars grid (still inside the `<section>`), render the modal:
       ```tsx
       {selected && (
         <PillarsDisplayModal
           open={selected !== null}
           onClose={() => setSelectedKey(null)}
           pillar={selected}
           markers={markers ?? []}
         />
       )}
       ```

    **Edit 2 — `src/components/sections/Section11.tsx` (line ~341):**

    Change `<PillarsDisplay pillars={pillars} />` to `<PillarsDisplay pillars={pillars} markers={markers} />`. The `markers` state variable is already in scope (set on line 208).

    No other changes anywhere — do not touch the `Pillar` inner JSX, do not move the glow halo, do not refactor the capsule.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&amp;1 | grep -E "(PillarsDisplay|Section11|error TS)" | head -20</automated>
    <automated>grep -c 'PillarsDisplay pillars={pillars} markers={markers}' src/components/sections/Section11.tsx</automated>
    <automated>grep -c "PillarsDisplayModal" src/components/report/PillarsDisplay.tsx</automated>
    <automated>grep -c "useState" src/components/report/PillarsDisplay.tsx</automated>
    <automated>grep -E "type=\"button\"|onClick=\{onSelect\}" src/components/report/PillarsDisplay.tsx | head -5</automated>
    <automated>grep -c "aria-label={`Open " src/components/report/PillarsDisplay.tsx</automated>
    <!-- Sanity check: existing visual elements still present -->
    <automated>grep -c "CornerBrackets" src/components/report/PillarsDisplay.tsx</automated>
    <automated>grep -c "tabular-nums" src/components/report/PillarsDisplay.tsx</automated>
  </verify>
  <done>
    Both files compile, Section 11 passes the `markers` prop, each pillar in the row is a `<button type="button">` with an `onClick` handler and ARIA label, and the modal renders conditionally on `selectedKey`. The HUD brackets, tick scale, duotone bubble, and mono score readout are still present in the source.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Visual + interaction verification</name>
  <what-built>
    A new `PillarsDisplayModal` component, an updated `PillarsDisplay` whose pillars are now buttons that open the modal, and a one-line prop addition in `Section11` so the modal receives the marker list.
  </what-built>
  <how-to-verify>
    1. Run `npm run dev` and navigate to any in-progress assessment, then go to Section 11 (`/assessment/{id}/section/11`).
    2. Visually confirm the five-pillar row LOOKS IDENTICAL to before: HUD corner brackets at each capsule corner, vertical tick scale on the right edge, gold radial backdrop, duotone bubble fill, mono score readout in the centre, status row, pillar name, and `NN / NN` rated/total fraction.
    3. Hover one of the pillars — it should subtly lift (translate-y) and the cursor should be a pointer.
    4. Tab from the page top — focus should land on each pillar button in turn with a visible gold focus ring.
    5. Click the **Cardiometabolic** pillar. A modal should open with: pillar name header, score (or em-dash), green/amber/red status badge, blurb ("Lipids, glucose, inflammation"), a "Markers" heading, and marker rows grouped by tier (Poor → Cautious → Normal → Great → Elite, then optionally Pending). On mobile width (DevTools < 768 px) the modal should appear as a bottom-sheet with a drag handle; on desktop it should be a centred dialog.
    6. Press **ESC** → modal closes. Click the **backdrop** → modal closes. Click the **× Close** button → modal closes. After close, focus returns to the pillar button you originally clicked.
    7. Open another pillar (e.g. **Strength**) and confirm only Strength markers are shown (grip strength L/R, push-ups, plank hold, sit-to-stand, single-leg-hop L/R; no blood markers).
    8. Open **Balance** — should show single-leg balance L/R only.
    9. Open a pillar with no rated markers (if any are pending) — should show "No markers classified into this pillar." or a Pending group only.
    10. Confirm no console errors.
  </how-to-verify>
  <resume-signal>Type "approved" or describe any visual/interaction regressions.</resume-signal>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` passes without new errors in the three touched files.
- The five pillar capsules render with the SAME visual chrome as before the change (HUD brackets, tick scale, duotone bubble, mono readout, status row, name, fraction).
- Each pillar is a `<button type="button">` with an `aria-label`, an `onClick`, and a visible focus ring.
- Clicking a pillar opens the Dialog-backed modal; ESC, backdrop click, and the Close button all close it; focus returns to the trigger button.
- The modal lists only the markers belonging to the clicked pillar (verified via `markerToPillar`), grouped by tier in poor → elite order.
- On viewport widths below `md`, the modal is a bottom-sheet with a drag handle; from `md` up it is a centred dialog.
</verification>

<success_criteria>
- Three files modified: `PillarsDisplayModal.tsx` (new), `PillarsDisplay.tsx` (button wrapper + state + modal render), `Section11.tsx` (one-prop addition on the call site).
- Existing PillarsDisplay visual design is byte-for-byte preserved aside from the wrapping button (focus ring + hover lift are additive).
- No reuse of `src/components/report/PillarModal.tsx` (which requires DB-loaded Phase 8 props Section 11 cannot supply).
- No new npm dependencies; the Dialog primitive provides backdrop blur, focus trap, ESC, scroll lock, and bottom-sheet layout.
</success_criteria>

<output>
After completion, no SUMMARY file is required for quick-mode plans. Update `.planning/STATE.md` Quick Tasks Completed table with this entry once the human-verify checkpoint is approved.
</output>
