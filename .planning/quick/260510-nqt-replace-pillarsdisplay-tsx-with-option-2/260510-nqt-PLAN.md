---
quick_id: 260510-nqt
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/report/PillarsDisplay.tsx
  - src/components/report/PillarsDisplayModal.tsx
autonomous: false
requirements:
  - quick-260510-nqt
must_haves:
  truths:
    - "Section 11 renders 5 pillar cards in the Option 2 'rings + contributor chips' style (conic-gradient ring with score in centre, name, status label, top-3 contributor chip list)."
    - "Clicking any pillar card opens a side drawer that slides in from the right on desktop (~480-520px wide) instead of the previous centred modal."
    - "On viewports < 768px the drawer renders as a full-screen overlay (or bottom sheet) instead of a right-side panel."
    - "Drawer closes via overlay click, Escape key, and an explicit close button in the drawer header."
    - "Drawer content reuses the existing data wiring from PillarsDisplayModal: markerToPillar grouping, tier buckets, score-breakdown bar, and per-tier marker rows render unchanged."
    - "Focus is trapped inside the drawer while open and restored to the originating pillar button on close (role='dialog' aria-modal='true' present)."
    - "PDF report (src/lib/pdf/components/PillarsPage.tsx and the rest of src/lib/pdf/*) is NOT modified — this change is portal-only."
  artifacts:
    - path: "src/components/report/PillarsDisplay.tsx"
      provides: "Option 2 ring-gauge pillar grid (replaces 'bubbly capsule' liquid-fill version from commit 0629cc0)"
      contains: "ring-gauge|conic-gradient"
    - path: "src/components/report/PillarsDisplayModal.tsx"
      provides: "Side drawer (right-slide on desktop, full/bottom-sheet on mobile) — file repurposed but keeps export name to avoid touching PillarsDisplay's import path"
      contains: "translate-x-full|translate-x-0"
  key_links:
    - from: "src/components/sections/Section11.tsx"
      to: "src/components/report/PillarsDisplay.tsx"
      via: "import default + props { pillars, markers }"
      pattern: "PillarsDisplay"
    - from: "src/components/report/PillarsDisplay.tsx"
      to: "src/components/report/PillarsDisplayModal.tsx"
      via: "default import — props contract { open, onClose, pillar, markers } MUST be preserved"
      pattern: "PillarsDisplayModal"
---

<objective>
Replace the current "bubbly capsule" PillarsDisplay (commit 0629cc0) with the Option 2 "rings + contributor chips" mockup from `mockups/pillar-options.html` (lines 162–245), and replace PillarsDisplayModal's centred Dialog with a right-side slide-in drawer (mobile = full-screen / bottom-sheet).

Purpose: User picked Option 2 from the side-by-side comparison HTML. Whoop/Oura aesthetic that surfaces top-contributor markers without drilling in, paired with a side drawer for the deep dive (drawer pattern was already locked as a phase-08 decision — modals "compete with the report flow"). This unblocks the rest of the Phase 8 redesign.

Output: The portal report at `/portal/assessment/[id]/report` (Section 11 surface) renders the new ring-gauge pillar cards. Tapping any pillar slides the existing detail content in from the right of the screen instead of opening a centred modal. Data wiring (markerToPillar grouping, tier buckets, marker rows, blurb, status pill, score breakdown bar) is preserved — only the chrome changes.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/STATE.md
@.planning/HANDOFF.json
@mockups/pillar-options.html
@src/components/report/PillarsDisplay.tsx
@src/components/report/PillarsDisplayModal.tsx
@src/lib/pillars/mapping.ts
@src/components/ui/Dialog.tsx

<interfaces>
<!-- Contracts the executor must respect. Pulled from the codebase so no scavenger hunt. -->

From `src/lib/pillars/mapping.ts` (the props PillarsDisplay receives):
```typescript
export interface PillarScore {
  key: PillarKey;          // 'cardiometabolic' | 'bodyComposition' | 'strength' | 'balance' | 'vo2'
  label: string;
  blurb: string;
  rated: number;           // count of markers with a tier
  total: number;           // count of markers in this pillar (rated + unrated)
  score: number | null;    // 0–100 composite, or null when no rated markers
  status: TrafficLight;    // 'green' | 'amber' | 'red' | 'pending'
}

export type TrafficLight = 'green' | 'amber' | 'red' | 'pending';
export type PillarKey = 'cardiometabolic' | 'bodyComposition' | 'strength' | 'balance' | 'vo2';
```

From `src/lib/pdf/types.ts` via PillarsDisplayModal:
```typescript
export interface ReportMarker {
  key: string;
  label: string;
  value: number | null;
  tier: 'elite' | 'great' | 'normal' | 'cautious' | 'poor' | null;
  unit: string;
  category: string;
  subcategory?: string;
  // ...other fields not needed here
}
```

From `src/components/sections/Section11.tsx` line 341 (the call site — DO NOT change):
```tsx
<PillarsDisplay pillars={pillars} markers={markers} />
```

So `PillarsDisplay` MUST keep its current export shape:
```typescript
interface Props { pillars: PillarScore[]; markers?: ReportMarker[]; }
export default function PillarsDisplay({ pillars, markers }: Props): JSX.Element
```

And the drawer file MUST keep its current props (PillarsDisplay imports the default export and calls it with these props — see line 124 of the current PillarsDisplay):
```typescript
interface Props {
  open: boolean;
  onClose: () => void;
  pillar: PillarScore;
  markers: ReportMarker[];
}
export default function PillarsDisplayModal(props: Props): JSX.Element
```

(The filename stays `PillarsDisplayModal.tsx` to avoid touching the import path — the file's _contents_ become a side drawer instead of a centred modal. We are NOT renaming the file in this task.)
</interfaces>

<reference_mockup>
The Option 2 ring-gauge card markup is in `mockups/pillar-options.html` lines 175–187 (Cardiometabolic example):

```html
<button class="js-open group bg-white rounded-2xl border border-slate-200 p-5
               hover:border-gold-dark/50 hover:shadow-md transition-all
               flex flex-col items-center text-center">
  <p class="mono text-[10px] font-semibold uppercase tracking-wider text-slate-500 self-start">P · 01</p>
  <div class="ring-gauge size-28 rounded-full grid place-items-center my-3"
       style="--accent:#10b981;--pct:73;">
    <div class="size-[88px] rounded-full bg-white grid place-items-center">
      <span class="mono text-2xl font-bold tabular-nums text-navy">73</span>
    </div>
  </div>
  <h3 class="text-sm font-semibold text-navy">Cardiometabolic</h3>
  <span class="mt-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Strong</span>
  <div class="mt-3 w-full space-y-1.5 text-left">
    <div class="flex items-center gap-2 text-[11px]">
      <span class="size-1.5 rounded-full bg-emerald-500"></span>
      <span class="flex-1 text-slate-700">HDL</span>
      <span class="mono text-slate-500">elite</span>
    </div>
    <!-- 2 more rows … -->
  </div>
</button>
```

The ring-gauge CSS (lines 31–33 of the mockup):
```css
.ring-gauge {
  background: conic-gradient(var(--accent) calc(var(--pct) * 1%), #e2e8f0 0);
}
```

Translate this to the project's Tailwind setup using **inline style** (`style={{ background: 'conic-gradient(...)' }}`) — no new global CSS class. Use `tabular-nums` and `font-mono` Tailwind utilities directly (already used in the current file).

The shared side-drawer markup is in `mockups/pillar-options.html` lines 320–449 (the `<aside id="drawer">` element + its hero + score-breakdown + contributing markers sections). Translate the structure 1:1 but feed it from the existing `PillarsDisplayModal.tsx` data wiring (markerToPillar, grouped, tierCounts, GROUP_ORDER) which is correct as-is.
</reference_mockup>

<contributor_chips_derivation>
Each Option-2 card needs the **top 3 contributing markers** rendered as chip rows. Derive these inside `PillarsDisplay.tsx` (the parent — it already receives `markers` and `pillars`):

1. For each `pillar: PillarScore`, filter `markers` to those whose `markerToPillar(m).pillar === pillar.key` AND `markerToPillar(m).supporting === false` (D-09 — supporting cardio markers are surfaced in the drawer but excluded from the score AND the contributor chip preview).
2. Sort by tier severity (worst-first is most informative in a longevity report, matches the mockup which shows `poor` then `cautious` rows for Balance):
   - Order: `poor` < `cautious` < `normal` < `great` < `elite` < `null` (untiered last)
3. Take the first 3.
4. If the pillar has < 3 contributing markers, just show what's there. If 0 (pending), render a single muted line: `Awaiting data`.

Map tier → dot colour using the existing palette already wired in `PillarsDisplayModal` `TIER_THEME[tier].dot`:
- poor → `bg-red-500`
- cautious → `bg-amber-500`
- normal → `bg-slate-400`
- great → `bg-blue-500`
- elite → `bg-emerald-500`
- null → `bg-slate-300`

Tier label text on the right side of each chip uses lower-case `m.tier ?? 'pending'` (matches the mockup's `mono text-slate-500` styling).
</contributor_chips_derivation>

<ring_colour_logic>
The conic-gradient `--accent` MUST reflect the pillar's traffic-light status, not its tier:

| status | hex |
|---|---|
| green | `#10b981` |
| amber | `#f59e0b` |
| red | `#ef4444` |
| pending | `#cbd5e1` (slate-300; the gauge looks empty against `#e2e8f0` track) |

For `pending` pillars (`score === null`), render the score numeral as `—` (em-dash) and use `0` for `--pct` so the ring shows the empty track.

The status label text (the small uppercase row under the ring) uses the existing `STATUS_LABEL` map already in `PillarsDisplay.tsx`:
- green → `Strong` (text-emerald-700)
- amber → `Needs focus` (text-amber-700)
- red → `Priority` (text-red-700)
- pending → `Awaiting data` (text-slate-500)
</ring_colour_logic>

<drawer_contract>
Replace the centred `<Dialog mode="auto">` chrome in `PillarsDisplayModal.tsx` with a side-drawer chrome. The drawer mounts to `document.body` via `createPortal` (use `react-dom`'s `createPortal` — already available in React 19, no new dep).

**Layout (Tailwind classes):**

Backdrop:
```tsx
<div
  className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm
              motion-safe:transition-opacity duration-200
              ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
  onClick={onClose}
  aria-hidden
/>
```

Drawer panel:
```tsx
<aside
  ref={panelRef}
  role="dialog"
  aria-modal="true"
  aria-label={`${pillar.label} pillar details`}
  className={`fixed top-0 right-0 z-50 h-full w-full md:w-[520px]
              bg-white shadow-2xl overflow-y-auto
              motion-safe:transition-transform duration-300 ease-out
              ${open ? 'translate-x-0' : 'translate-x-full'}`}
  tabIndex={-1}
>
  {/* hero (already-styled — corner brackets, eyebrow, big score, status pill, blurb) */}
  {/* score breakdown bar (already wired) */}
  {/* contributing markers grouped by tier (already wired) */}
</aside>
```

**Mobile contract:** `w-full` on < 768px gives a full-screen overlay. That satisfies the constraint ("desktop = right-side ~480px, mobile = bottom-sheet OR full-screen overlay"). We pick full-screen overlay on mobile because it's simpler than a draggable bottom sheet and matches the mockup behavior.

**Behavioural contract (re-implement — Dialog primitive is no longer used):**

1. **Body scroll lock** while `open` — set `document.body.style.overflow = 'hidden'` in a useEffect, restore on close (mirror `Dialog.tsx` lines 58–84).
2. **Escape key closes** the drawer — addEventListener('keydown') in a useEffect (mirror `Dialog.tsx` lines 86–124).
3. **Backdrop click closes** the drawer — see `onClick={onClose}` on the backdrop above.
4. **Focus trap** while open — bidirectional Tab cycling, wrap from last → first and shift+Tab from first → last. Lift the helper `getTabbables()` and the keydown branch from `Dialog.tsx` lines 31–39 + 96–119 verbatim (point it at `panelRef`).
5. **Initial focus** — query `[data-autofocus]` first, fall back to first tabbable, fall back to the panel itself. Apply this to the close button (mark with `data-autofocus`).
6. **Focus restoration on close** — capture `document.activeElement` when `open` flips to true, call `.focus()` on it when component unmounts/closes. Mirrors `Dialog.tsx` lines 49–56 + 78–83.
7. **Portal to `document.body`** via `createPortal(<>{backdrop}{panel}</>, document.body)`. Guard SSR by checking `typeof document !== 'undefined'` (the existing module is already `'use client';`, but createPortal must not run during SSR).
8. **Mount/unmount on `open`:** keep the component mounted but toggle the `translate-x-full` / `translate-x-0` classes for the slide animation. Caller (`PillarsDisplay`) currently conditionally renders the modal only when `selected !== null` — we need to keep mounting it (so the slide-in animation plays) OR drop the conditional and pass `open={selectedKey !== null}`. **Choose the latter** — simpler, lets CSS transition handle entry/exit. PillarsDisplay must therefore always render `<PillarsDisplayModal open={selectedKey !== null} pillar={selected ?? lastSelectedRef.current} ... />` — which means we need `pillar` to be non-null even after close. Two options:
   - **Option A (chosen for simplicity):** keep the existing conditional render. The slide-IN animation plays on mount because `translate-x-full` is the initial state and `useEffect` with `requestAnimationFrame` flips it to `translate-x-0`. The slide-OUT animation is sacrificed (component unmounts immediately on close). This is acceptable for a quick task — drawer-out animation is polish.
   - **Option B (deferred):** persist `lastSelected` to keep content during slide-out. Skip — adds complexity for marginal polish.

   Implement Option A. The drawer slides IN smoothly; closing is an instant unmount. If the user complains, we add Option B later.

**Reused content blocks (DO NOT change):**

The existing PillarsDisplayModal already renders these correctly — keep them verbatim, just unwrap them from the `<Dialog>` wrapper and place inside the new `<aside>`:
- Hero block (lines 188–252 of current `PillarsDisplayModal.tsx`): corner brackets, eyebrow, close button, title, blurb, big score, status pill.
- Score breakdown bar (lines 254–292): tier-rail flex bar + legend.
- Contributing markers grouped by tier (lines 294–363): `GROUP_ORDER.map(...)` with the `TIER_THEME` rails and pill chips.

The hero `-mx-6 -mt-6 md:-mx-8 md:-mt-8 px-6 md:px-8 pt-7 pb-6` negative-margin trick was needed to escape the centred Dialog's `p-6 md:p-8` padding. **Remove** these negative margins — the drawer no longer wraps the children in padding. Replace with `px-6 pt-6 pb-5 border-b border-slate-200` to match the mockup's drawer hero (lines 322 of the mockup).

The body sections currently rely on the Dialog's outer padding too. Wrap each post-hero section in `px-6 py-5 border-b border-slate-200` (last section drops the border) — see mockup lines 343–448.
</drawer_contract>

</context>

<tasks>

<task type="auto">
  <name>Task 1: Rewrite PillarsDisplay.tsx as Option 2 (rings + contributor chips)</name>
  <files>src/components/report/PillarsDisplay.tsx</files>
  <action>
  Replace the entire current "bubbly capsule" implementation with the Option 2 ring-gauge layout from `mockups/pillar-options.html` lines 162–245.

  **Keep unchanged:**
  - File header (`'use client'` + imports of `useState`, `PillarScore`, `PillarKey`, `PillarStatus`, `ReportMarker`, `PillarsDisplayModal`).
  - The `Props` interface: `{ pillars: PillarScore[]; markers?: ReportMarker[] }`.
  - The default export name `PillarsDisplay` and call-site contract (Section11.tsx imports it as default).
  - The `<header>` block at lines 99–114 (gold mono eyebrow "05 · Peak Living" + "The five pillars" h2 + intro paragraph). Keep the existing copy — DO NOT rewrite the eyebrow text or heading. The card grid below is what changes.
  - The `selectedKey` / `setSelectedKey` state machinery and the `<PillarsDisplayModal open onClose={() => setSelectedKey(null)} pillar={selected} markers={markers ?? []} />` render at lines 123–130.

  **Replace:**
  - The `STATUS` `Record<PillarStatus, StatusClasses>` constant (lines 33–82) — keep `STATUS_LABEL` (lines 84–89) since the new layout still uses it. Delete the unused `StatusClasses` type and `STATUS` map; the new `<Pillar>` sub-component derives all colours from a smaller `STATUS_RING_HEX` map and a `STATUS_LABEL_TEXT` Tailwind class map.
  - The `<Pillar>` sub-component (lines 135–239) entirely. New shape below.

  **New `Pillar` sub-component:**

  ```tsx
  const STATUS_RING_HEX: Record<PillarStatus, string> = {
    green: '#10b981',
    amber: '#f59e0b',
    red: '#ef4444',
    pending: '#cbd5e1',
  };

  const STATUS_LABEL_TEXT: Record<PillarStatus, string> = {
    green: 'text-emerald-700',
    amber: 'text-amber-700',
    red: 'text-red-700',
    pending: 'text-slate-500',
  };

  const TIER_DOT: Record<RatingTier | 'null', string> = {
    poor: 'bg-red-500',
    cautious: 'bg-amber-500',
    normal: 'bg-slate-400',
    great: 'bg-blue-500',
    elite: 'bg-emerald-500',
    null: 'bg-slate-300',
  };

  const TIER_RANK: Record<RatingTier, number> = {
    poor: 0, cautious: 1, normal: 2, great: 3, elite: 4,
  };

  function getTopContributors(
    pillarKey: PillarKey,
    markers: ReportMarker[] | undefined,
  ): ReportMarker[] {
    if (!markers) return [];
    return markers
      .filter((m) => {
        const cls = markerToPillar(m);
        return cls.pillar === pillarKey && !cls.supporting;
      })
      .sort((a, b) => {
        const ra = a.tier ? TIER_RANK[a.tier] : 99;
        const rb = b.tier ? TIER_RANK[b.tier] : 99;
        return ra - rb;
      })
      .slice(0, 3);
  }
  ```

  Pillar render (the entire `<button>`):

  ```tsx
  function Pillar({ pillar, markers, onSelect, index }: {
    pillar: PillarScore;
    markers: ReportMarker[] | undefined;
    onSelect: () => void;
    index: number;
  }) {
    const accent = STATUS_RING_HEX[pillar.status];
    const pct = pillar.score ?? 0;
    const isPending = pillar.status === 'pending';
    const labelClass = STATUS_LABEL_TEXT[pillar.status];
    const top = getTopContributors(pillar.key, markers);
    const eyebrow = `P · ${String(index + 1).padStart(2, '0')}`;

    return (
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Open ${pillar.label} pillar details`}
        className="group flex w-full flex-col items-center text-center
                   bg-white rounded-2xl border border-slate-200 p-5
                   hover:border-gold-dark/50 hover:shadow-md
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-dark/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white
                   motion-safe:transition-all duration-200 cursor-pointer"
      >
        <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-500 self-start">
          {eyebrow}
        </p>

        {/* Ring gauge */}
        <div
          className="size-28 rounded-full grid place-items-center my-3 motion-safe:transition-[background] duration-500"
          style={{
            background: `conic-gradient(${accent} ${pct}%, #e2e8f0 0)`,
          }}
          aria-hidden
        >
          <div className="size-[88px] rounded-full bg-white grid place-items-center">
            <span className="font-mono text-2xl font-bold tabular-nums text-navy">
              {isPending || pillar.score == null ? '—' : pillar.score}
            </span>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-navy">{pillar.label}</h3>
        <span className={`mt-1 text-[10px] font-semibold uppercase tracking-wider ${labelClass}`}>
          {STATUS_LABEL[pillar.status]}
        </span>

        {/* Top contributor chips */}
        <div className="mt-3 w-full space-y-1.5 text-left">
          {top.length === 0 ? (
            <div className="flex items-center gap-2 text-[11px]">
              <span className="size-1.5 rounded-full bg-slate-300" aria-hidden />
              <span className="flex-1 text-slate-500">Awaiting data</span>
            </div>
          ) : (
            top.map((m) => (
              <div key={m.key} className="flex items-center gap-2 text-[11px]">
                <span
                  className={`size-1.5 rounded-full ${TIER_DOT[(m.tier ?? 'null') as keyof typeof TIER_DOT]}`}
                  aria-hidden
                />
                <span className="flex-1 text-slate-700 truncate">{m.label}</span>
                <span className="font-mono text-slate-500">
                  {m.tier ?? 'pending'}
                </span>
              </div>
            ))
          )}
        </div>
      </button>
    );
  }
  ```

  Wire it from the parent grid:

  ```tsx
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 px-2 sm:px-4 pb-10">
    {pillars.map((p, i) => (
      <Pillar
        key={p.key}
        pillar={p}
        markers={markers}
        onSelect={() => setSelectedKey(p.key)}
        index={i}
      />
    ))}
  </div>
  ```

  **Imports to add at the top of the file:**
  ```typescript
  import { markerToPillar } from '@/lib/pillars/mapping';
  import type { RatingTier } from '@/types/normative';
  ```

  **Why `gold-dark` and not raw hex:** the project's globals.css defines a `--color-gold-dark` token and the existing PillarsDisplay already uses `text-gold-dark` and `bg-gold-dark/40` (line 102, 105). Use `border-gold-dark/50` directly — same convention as the mockup which uses `--gold-dark: #c9a24a`.

  **Do not** add new global CSS, `@theme` tokens, or modify `globals.css`. The conic-gradient lives in `style={{ background: ... }}` inline — the mockup's `.ring-gauge` CSS class is intentionally NOT translated to a global rule. This keeps the change scoped to one file.

  **Do not** modify `src/components/report/pdf/*` — explicit constraint. PDF stays as-is.

  **Do not** touch the import path or props interface for `PillarsDisplayModal` — Task 2 changes that file's contents but keeps its public API identical.
  </action>
  <verify>
    <automated>cd /Users/jace/Code/peak360 &amp;&amp; npx tsc --noEmit -p tsconfig.json 2>&amp;1 | grep -E "PillarsDisplay\.tsx" ; echo "---"; npm run lint -- --quiet src/components/report/PillarsDisplay.tsx 2>&amp;1 | tail -20</automated>
  </verify>
  <done>
    - `npx tsc --noEmit` reports zero errors in `PillarsDisplay.tsx`.
    - `npm run lint` is clean for `PillarsDisplay.tsx` (zero errors; warnings tolerated only if pre-existing in the codebase).
    - File contains `conic-gradient(` and a `getTopContributors` helper.
    - `STATUS` Record (the StatusClasses one with `ring/bg/border/fill/halo/sheen/pill/label/shadow`) is removed.
    - `PillarsDisplayModal` import + render call site is unchanged (still default-imports from `@/components/report/PillarsDisplayModal` and renders with `{ open, onClose, pillar, markers }`).
    - Section11 still type-checks (no callers broken).
  </done>
</task>

<task type="auto">
  <name>Task 2: Rewrite PillarsDisplayModal.tsx as a side drawer (right-slide on desktop, full-screen on mobile)</name>
  <files>src/components/report/PillarsDisplayModal.tsx</files>
  <action>
  Repurpose the file: remove the `<Dialog>` wrapper, mount via `createPortal`, render a right-slide `<aside>` with its own focus trap, scroll lock, ESC handler, and animated transform. Keep the `Props` interface and default export name unchanged so `PillarsDisplay.tsx` still works without modification.

  **Imports to update:**

  Remove:
  ```typescript
  import Dialog from '@/components/ui/Dialog';
  ```

  Add:
  ```typescript
  import { useEffect, useRef } from 'react';
  import { createPortal } from 'react-dom';
  ```

  Keep all other imports as-is (`PILLARS`, `markerToPillar`, `PillarStatus`, `ReportMarker`, `TIER_LABELS`, `RatingTier`).

  **New component skeleton:**

  ```tsx
  const TABBABLE_SELECTOR =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function getTabbables(root: HTMLElement | null): HTMLElement[] {
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR))
      .filter((el) => el.offsetParent !== null);
  }

  export default function PillarsDisplayModal({
    open,
    onClose,
    pillar,
    markers,
  }: Props) {
    const panelRef = useRef<HTMLElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    // Body scroll lock + initial focus + focus restoration
    useEffect(() => {
      if (!open) return;
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const panel = panelRef.current;
      if (panel) {
        const autofocusTarget = panel.querySelector<HTMLElement>('[data-autofocus]');
        if (autofocusTarget) autofocusTarget.focus();
        else {
          const tabbables = getTabbables(panel);
          if (tabbables.length > 0) tabbables[0].focus();
          else panel.focus();
        }
      }

      return () => {
        document.body.style.overflow = previousOverflow;
        previousFocusRef.current?.focus();
      };
    }, [open]);

    // Escape + Tab focus trap
    useEffect(() => {
      if (!open) return;
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
          return;
        }
        if (e.key === 'Tab') {
          const tabbables = getTabbables(panelRef.current);
          if (tabbables.length === 0) {
            e.preventDefault();
            panelRef.current?.focus();
            return;
          }
          const first = tabbables[0];
          const last = tabbables[tabbables.length - 1];
          const active = document.activeElement as HTMLElement | null;
          if (e.shiftKey) {
            if (active === first || !panelRef.current?.contains(active)) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (active === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, onClose]);

    if (!open) return null;
    if (typeof document === 'undefined') return null; // SSR guard

    // ... (existing data computation: def, blurb, theme, isPending, pillarMarkers, grouped, tierCounts — keep verbatim)

    const drawer = (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm motion-safe:transition-opacity duration-200"
          onClick={onClose}
          aria-hidden
        />

        {/* Drawer panel */}
        <aside
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={`${pillar.label} pillar details`}
          tabIndex={-1}
          className="fixed top-0 right-0 z-50 h-full w-full md:w-[520px] bg-white shadow-2xl
                     overflow-y-auto outline-none
                     motion-safe:transition-transform duration-300 ease-out
                     translate-x-0"
        >
          {/* HERO — adapted from existing JSX, NO negative margins */}
          <div className={`relative px-6 pt-6 pb-5 border-b border-slate-200 ${theme.heroBg}`}>
            <CornerBrackets />
            {/* tinted radial accent — keep existing */}
            {/* top row: eyebrow + close button (close button keeps data-autofocus) */}
            {/* h2, blurb, big score + status pill — keep existing classes */}
          </div>

          {/* Score breakdown bar (only when !isPending && pillarMarkers.length > 0) */}
          {!isPending && pillarMarkers.length > 0 && (
            <div className="px-6 py-5 border-b border-slate-200">
              {/* existing bar + legend JSX, unchanged */}
            </div>
          )}

          {/* Contributing markers — grouped by tier */}
          <div className="px-6 py-5">
            <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted mb-3">
              Contributing markers
            </h3>
            {/* existing GROUP_ORDER.map(...) JSX, unchanged */}
          </div>
        </aside>
      </>
    );

    return createPortal(drawer, document.body);
  }
  ```

  **Concretely, the diff against the current file:**

  1. Delete the `<Dialog open={open} onClose={onClose} mode="auto" ariaLabel={...}>` opening tag and its closing tag (lines 182–187 + 364).
  2. Wrap the children in the new `<>{backdrop}{aside}</>` portal scaffold above.
  3. Remove the hero's negative-margin classes `-mx-6 -mt-6 md:-mx-8 md:-mt-8 px-6 md:px-8 pt-7 pb-6` (line 189) — replace with `px-6 pt-6 pb-5 border-b border-slate-200`.
  4. Wrap the score-breakdown block (currently `<div className="mt-6">` at line 256) in `<div className="px-6 py-5 border-b border-slate-200">` instead of `<div className="mt-6">`.
  5. Wrap the contributing-markers block (currently `<div className="mt-6">` at line 295) in `<div className="px-6 py-5">` instead of `<div className="mt-6">`.
  6. Add the `useEffect`s, refs, helpers, and SSR guard described above.
  7. Keep `<CornerBrackets />`, `STATUS_THEME`, `STATUS_LABEL`, `TIER_THEME`, `GROUP_ORDER`, `GroupKey` type — all reused as-is.
  8. The close button at line 206 — keep `data-autofocus` (already present), no changes.

  **Important:** the body of the function does the data work (`pillarMarkers`, `grouped`, `tierCounts`, etc.) BEFORE `if (!open) return null` early-exit-friendly. You MUST move the early-return AFTER the destructuring of `pillar`/`markers` props but BEFORE the data computation, OR keep the data computation and then do `if (!open) return null;` later. Either is fine — pick whichever passes TypeScript without complaints. (The `useEffect`s already early-return when `!open`, so they handle the no-op case correctly.)

  **Mobile responsiveness:** the `w-full md:w-[520px]` Tailwind classes give a full-screen overlay below 768px and a 520px right-side panel from 768px and up. No JS match-media required. This satisfies the constraint.

  **Do not** modify `src/components/ui/Dialog.tsx` — it stays untouched and remains used by `ConfirmDeleteModal.tsx`. We're just no longer using it from this file.

  **Do not** rename the file or change its export — `PillarsDisplay.tsx` (Task 1's caller) imports the default export and that contract is the integration seam.
  </action>
  <verify>
    <automated>cd /Users/jace/Code/peak360 &amp;&amp; npx tsc --noEmit -p tsconfig.json 2>&amp;1 | grep -E "PillarsDisplayModal\.tsx|PillarsDisplay\.tsx" ; echo "---"; npm run lint -- --quiet src/components/report/PillarsDisplayModal.tsx 2>&amp;1 | tail -20</automated>
  </verify>
  <done>
    - `npx tsc --noEmit` reports zero errors in `PillarsDisplayModal.tsx` and zero new errors elsewhere.
    - `npm run lint` is clean for the file.
    - File contains `createPortal(` and `role="dialog"` and `translate-x-0` (or `right-0`) and does NOT import `Dialog`.
    - File still default-exports a component accepting `{ open, onClose, pillar, markers }` (props interface unchanged).
    - `Section11.tsx` and `PillarsDisplay.tsx` still type-check without modification.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
  Tasks 1 + 2 land:
  - `src/components/report/PillarsDisplay.tsx` is now Option 2 (ring gauges + top-3 contributor chips).
  - `src/components/report/PillarsDisplayModal.tsx` is now a right-slide side drawer (full-screen on mobile, 520px on desktop) with focus trap, scroll lock, ESC + backdrop close, portaled to `document.body`.
  - PDF report and all server/data wiring untouched.
  </what-built>
  <how-to-verify>
  Background dev server is already running at `http://localhost:8080` per HANDOFF.json. If not, start it: `PORT=8080 npm run dev`.

  Visit any in-progress assessment's portal report:
  `http://localhost:8080/portal/assessment/{any-existing-assessment-id}/report`

  (Find an assessment ID via the dashboard at `http://localhost:8080/portal` after logging in as `admin@admin.com` / password `password123` — credentials are in `.env.local` UAT_PASSWORD).

  Scroll to the "05 · Peak Living — The five pillars" section.

  **Visual checks:**
  1. Five pillar cards render in a row (md+) — each with a circular ring gauge filled to its score percentage, the score numeral inside the ring, the pillar name below, a small uppercase status label (Strong/Needs focus/Priority/Awaiting data), and 3 contributor rows (dot + marker name + tier).
  2. Ring fill colour matches status: green = Strong, amber = Needs focus, red = Priority, slate = Awaiting data.
  3. Hover any card — gold-dark border tint + slight shadow rise.
  4. Focus a card with Tab — gold-dark ring outline appears.

  **Drawer checks (click any pillar):**
  5. Drawer slides in from the right side of the screen (desktop) — backdrop dims behind it.
  6. Drawer width is ~520px on desktop, full-screen on mobile (resize the browser to verify, or open DevTools mobile emulator).
  7. Drawer hero shows: gold mono "Pillar · Detail" eyebrow, close button (×) with corner-bracket frame, pillar name, blurb, big score numeral, status pill.
  8. Below the hero: "Score breakdown" section with a multi-tier coloured bar + legend.
  9. Below that: "Contributing markers" section with markers grouped by tier (Poor → Cautious → Normal → Great → Elite → Pending), each row showing the marker name, value + unit, and tier pill.
  10. Press Escape — drawer closes.
  11. Click the dim backdrop — drawer closes.
  12. Click the × button — drawer closes.
  13. Tab through the drawer — focus is trapped inside (does not jump to the page behind).
  14. After closing, the originating pillar card is re-focused (Tab focus restored).

  **Regression checks:**
  15. Opening a pillar with `pending` status (no data) shows "Awaiting data" in the contributor preview AND the drawer's marker grouping shows "No markers classified into this pillar" (existing copy preserved).
  16. The PDF report is NOT broken: `curl -s -o /tmp/report.pdf -w "%{http_code}\n" "http://localhost:8080/api/assessments/{id}/pdf" -H "Cookie: ..."` returns 200 and produces a non-empty PDF (or at minimum, the existing PDF page still references `src/lib/pdf/components/PillarsPage.tsx` unchanged — `git diff src/lib/pdf/` should be empty).

  **Optional polish you might flag:**
  - Drawer slide-OUT animation is sacrificed in this task (instant unmount). If this feels jarring, request a follow-up to persist the closing pillar via a `lastSelected` ref so the component stays mounted for the exit transition.
  - Mobile bottom-sheet variant (vs full-screen) was deferred — the constraint accepts either; full-screen is what's shipping. If you'd prefer a draggable bottom-sheet, request it as a separate task.
  </how-to-verify>
  <resume-signal>Reply "approved" once the visual + drawer + regression checks all pass, or describe specific issues (e.g., "ring colour wrong for amber pillar", "drawer doesn't trap focus on Shift+Tab from first element").</resume-signal>
</task>

</tasks>

<verification>
- TypeScript: `npx tsc --noEmit` produces no new errors anywhere in the repo.
- Lint: `npm run lint` is clean for both modified files (warnings tolerated only if they were already present in the codebase prior to this task — confirm via `git stash && npm run lint && git stash pop`).
- No `src/lib/pdf/*` files are modified — `git diff --stat src/lib/pdf/` returns empty.
- No new files are created — `git status --short` shows ONLY modifications to the two files listed in `files_modified`.
- The integration seam is preserved:
  - `Section11.tsx` line 64 still imports `PillarsDisplay` from `@/components/report/PillarsDisplay`.
  - `Section11.tsx` line 341 still calls `<PillarsDisplay pillars={pillars} markers={markers} />`.
  - `PillarsDisplay.tsx` still imports `PillarsDisplayModal` from `@/components/report/PillarsDisplayModal` and renders it with the same props.
- Manual UAT: the human-verify checkpoint above passes all 16 checks.
</verification>

<success_criteria>
- Portal `/portal/assessment/{id}/report` Section 11 renders Option 2 ring-gauge pillar cards (mockup parity, lines 162–245 of `mockups/pillar-options.html`).
- Clicking any pillar opens a right-side drawer (mobile = full-screen) — NOT a centred modal.
- Drawer reuses the existing data wiring (markerToPillar, tier buckets, score-breakdown bar, marker rows) without functional change.
- Accessibility intact: role="dialog" aria-modal="true", focus trap, scroll lock, focus restoration, ESC closes, backdrop click closes, explicit close button.
- Tailwind v4 conventions followed (no new global CSS, no @theme tokens added, conic-gradient inline-styled).
- PDF report layer untouched — `git diff src/lib/pdf/` is empty.
- TypeScript clean, lint clean.
- User approves the visual + drawer behaviour at the human-verify checkpoint.
</success_criteria>

<output>
After completion, the orchestrator will write a SUMMARY at `.planning/quick/260510-nqt-replace-pillarsdisplay-tsx-with-option-2/260510-nqt-SUMMARY.md`.
</output>
