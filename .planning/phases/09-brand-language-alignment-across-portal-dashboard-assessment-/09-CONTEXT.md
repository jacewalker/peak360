# Phase 9: Brand-language alignment across portal, dashboard, assessment, and client surfaces - Context

**Gathered:** 2026-05-12
**Status:** Ready for planning

> Mode: `--auto`. All gray areas auto-selected; recommended options chosen for every decision. Visual contract is locked by `09-UI-SPEC.md` (approved 2026-05-12) — this file captures the orthogonal implementation decisions (how to slice plans, how to migrate tokens, scope guardrails) that downstream planner/executor need.

<domain>
## Phase Boundary

Promote the landing-page brand language (`src/app/landing.css` / `.v2-root` tokens — dark `#0a0a0b` canvas, cream `#ece5d3` text, gold-brand `#c9a24a` accents, Inter Tight + JetBrains Mono) into every authenticated surface of Peak360 — **without re-architecting information, copy, or behaviour**. This is a token-driven, in-place restyle. No new components are introduced; no new npm dependencies; no `npx shadcn` invocations.

**In scope (per `09-UI-SPEC.md`):**
- Add new tokens to `src/app/globals.css` (`--color-bg/-2/-3`, `--color-text/-dim/-faint`, `--color-gold-brand`, `--color-champagne`, `--color-line/-2`, `--color-danger`, `--color-status-good`, `--font-mono`); rebind `--font-sans` to Inter Tight.
- Wire JetBrains Mono + Inter Tight into `src/app/layout.tsx` body className.
- Gate the dark canvas at the **route-segment layout level** (`src/app/portal/layout.tsx`, `src/app/login/layout.tsx`, NEW `src/app/reset-password/layout.tsx`, `src/app/assessment/[id]/layout.tsx`) by wrapping children in a `theme-dark` class. Root `<body>` no longer hard-sets the light background.
- Restyle in place: `Sidebar`, `Header`, `ProgressBar`, `NavigationButtons`, all `src/components/forms/*`, all `src/components/sections/Section{1..11}.tsx`, Phase 8 `Dialog` (token swap only), Toast pattern, `AdminPanel`, Recharts chart styles.
- Apply Phase 9 visual contract to: `/login`, `/reset-password`, `/portal` (dashboard), `/portal/clients`, `/portal/clients/[name]`, `/portal/assessments`, `/portal/admin` and all `/portal/admin/*` sub-pages (pillars, users, invitations, audit-logs, normative, assessments/[id]/prescriptions), and `/assessment/[id]/section/[1..11]`.
- Add the new Phase-9-introduced mono-eyebrow / hero / empty-state / error / loading copy specified in `09-UI-SPEC.md` §Copywriting Contract.

**Out of scope (Phase 9 must NOT touch):**
- `/` (landing page) — already in the target style; do not modify `src/app/landing.css`.
- `/portal/assessment/[id]/report` Phase 8 contract: pillar cards, modal, marker rows, light-surface report shell, `src/components/report/*`. Phase 9 only touches the **frame around** the report (page background outside the printable card + top brand strip), so a user navigating dashboard → report doesn't feel like switching apps.
- `src/lib/pdf/**` (Phase 5 PDF renderer) — untouched.
- Existing copy across login, dashboard, clients, admin, and the 11 assessment sections — preserved verbatim. Only the new Phase-9 mono-eyebrow / hero / status / empty / error strings listed in `09-UI-SPEC.md` §Copywriting Contract are added.
- New functional capabilities (admin reassign, new auth flows, new admin pages). Brand-language alignment is appearance only.

**Roadmap lock (from STATE.md 2026-05-10):** "dark across all surfaces; 2 fat plans (09-01 foundations+auth, 09-02 working surfaces)."

</domain>

<decisions>
## Implementation Decisions

### Plan Slicing
- **D-01:** Honor the roadmap lock — **two fat plans only**, not micro-sliced per surface.
  - `09-01-PLAN.md` — **Foundations + auth surfaces.** Token additions in `globals.css`, font wiring in root `layout.tsx`, route-segment theme gating (portal/login/reset-password/assessment layouts), restyle `Sidebar` + `Header` + `ProgressBar` + `NavigationButtons` (shared layout chrome), and ship the two centred hero surfaces: `/login` and `/reset-password` (incl. NEW `src/app/reset-password/layout.tsx`).
  - `09-02-PLAN.md` — **Working surfaces.** Restyle every page that consumes the now-themed shell: dashboard hero + counter strip, `/portal/clients` + `/portal/clients/[name]`, `/portal/assessments`, every `/portal/admin/*` page, and all 11 `Section{N}.tsx` form sections (token swap on form components + section heading mono eyebrow). Includes Recharts axis/grid restyle, Toast restyle, `Dialog` token swap, `AdminPanel` restyle, and the minimal Phase 8 report-frame update (outer page background + top brand strip only).
  - **Why two plans, not more:** The change is overwhelmingly token-driven. Once globals.css + segment layouts land in 09-01, the visual delta on every working surface is small (utility-class swaps, mono eyebrows on heroes). Splitting per-page would create busywork commits without de-risking anything. The roadmap was explicit; honor it.

### Token Migration Strategy
- **D-02:** **Additive token migration only.** Every existing `--color-*` token in `globals.css` (notably `--color-navy`, `--color-gold`, `--color-navy-light`, `--color-gold-light`, `--color-gold-dark`, `--color-navy-950`, gradient tokens) keeps its current value verbatim. The new Phase-9 tokens are added alongside under fresh names. Phase 8 (`/portal/assessment/[id]/report`) and Phase 5 (PDF) routes continue to resolve the legacy tokens unchanged.
- **D-03:** `--font-sans` is **rebound** (not replaced) — keep the variable name; point its value at `"Inter Tight", system-ui, -apple-system, sans-serif`. This is the one exception to "no existing token gets a new value," and it's safe because the Phase 8 report + PDF both declare their own typography contracts and do not depend on the runtime resolution of `--font-sans`.
- **D-04:** **Promote, do not consume.** Do not import from `landing.css` or use `.v2-root` selectors outside the landing route. Copy the hex values (already enumerated in `09-UI-SPEC.md` §Token-Naming Map) into `globals.css` under the stable `--color-*` / `--font-*` names. The rest of the app uses Tailwind utilities driven by `@theme inline`, never `.v2-root`-scoped classes.

### Theme Gating Boundary
- **D-05:** Body background gating lives at the **route-segment layout** layer, not the root layout. Each of `src/app/portal/layout.tsx`, `src/app/login/layout.tsx`, `src/app/reset-password/layout.tsx` (NEW), and `src/app/assessment/[id]/layout.tsx` wraps its children in `<div className="theme-dark">`. The root `<body>` becomes theme-neutral (no hard-coded light background). This isolates the Phase 8 report route (`/portal/assessment/[id]/report`) which keeps its own light wrapper inside the portal segment — the report's page-level component sets its own light frame inside the dark portal wrapper.
- **D-06:** The new `src/app/reset-password/layout.tsx` is the only NEW file in the layout boundary. Pattern-match it against `src/app/login/layout.tsx` so the two centred-hero surfaces share the same hero scaffold (mono eyebrow + 40px display title + 360px-max card).

### Sequencing Within 09-01 (Foundations)
- **D-07:** Inside 09-01, land the foundations in this order so each step compiles cleanly against the prior:
  1. Add new tokens to `globals.css` + rebind `--font-sans` + add `theme-dark` utility class.
  2. Wire fonts in `src/app/layout.tsx` body className (Inter Tight + JetBrains Mono variables).
  3. Add `theme-dark` wrappers to the four segment layouts + create `reset-password/layout.tsx`.
  4. Restyle shared chrome (`Sidebar` → `Header` → `ProgressBar` → `NavigationButtons`).
  5. Restyle `/login` page + `/reset-password` page (centred hero variant + new mono eyebrow copy).

### Sequencing Within 09-02 (Working Surfaces)
- **D-08:** Inside 09-02, restyle in this order so visual regressions on a heavily-used surface surface quickly:
  1. Form components (`src/components/forms/*`) — restyled centrally; assessment Section 1–11 inherit automatically.
  2. Section heading mono eyebrow injection (one small change per `Section{N}.tsx` — only the heading wrapper, no internal field changes).
  3. `Dialog` token swap (Phase 8 keeps its light scope inside the report route).
  4. Toast restyle + auto-save indicator copy.
  5. Dashboard hero + counter strip + recent-assessments table.
  6. `/portal/clients` (grid) + `/portal/clients/[name]` (detail + Recharts).
  7. `/portal/assessments` (full-width table).
  8. `/portal/admin` landing + all admin sub-pages (pillars, users, invitations, audit-logs, normative, assessments/[id]/prescriptions).
  9. Phase 8 report-frame minimal update: outer page background + top brand strip only. **Do NOT touch** `src/components/report/*`, pillar cards, modal, marker rows, or `src/lib/pdf/**`.

### Phase 8 Report-Frame Edge
- **D-09:** The "frame" Phase 9 may touch on `/portal/assessment/[id]/report` is precisely:
  - The page background **outside** the printable report card (the area the report sits on within the portal shell).
  - The top brand strip / portal header above the report card, if any (i.e., the part rendered by the portal segment layout, not the report page itself).
  - **Nothing else.** Specifically: pillar cards, `PillarsGrid`, `PillarModal`, `PillarCard`, `DetailedMarkerResultsDisclosure`, the printable report card surface (light cream/white), navy + bright-gold inside the report card, the rating-tier 5-colour palette inside marker rows, and every component under `src/components/report/*` are sovereign-Phase-8 and untouched.

### Section 1–11 Sweep Strategy
- **D-10:** Restyle the 11 form sections as a **single sweep** at the form-component level (D-08 step 1–2). Because every section consumes `FormField` / `SelectField` / `RadioGroup` / `SliderField` / `SignaturePad` / `FileUploadZone` from `src/components/forms/`, the visual delta inside each `Section{N}.tsx` body is near-zero. The only per-section change is wrapping the existing section heading in a mono-eyebrow + sans Heading (20px) pair — a mechanical edit. Do NOT re-author field labels, helper text, or section copy.

### Verification Strategy
- **D-11:** Acceptance is governed by `09-UI-SPEC.md` §Acceptance Heuristics (the 10-item checklist used by `gsd-ui-checker` / `gsd-ui-auditor`). Each plan must, before commit, run a manual visual review on its surfaces against the 10 heuristics:
  1. Background resolves to `--color-bg/-2/-3` (no `#fff` / `#f8fafc` / legacy surface tokens outside the report route).
  2. Default text resolves to `--color-text` (cream).
  3. Mono eyebrow appears above each hero on dashboard / clients / assessments / admin/* / section-{1..11}.
  4. Primary CTA is gold-brand fill, ink text, sentence case.
  5. No `--color-navy` or legacy `--color-gold` outside the report route.
  6. Focus ring resolves to gold-brand @ 45%.
  7. Body resolves to Inter Tight; mono elements resolve to JetBrains Mono.
  8. Typography scale audit: only `11/13/20/40` (mobile downscales: `32` for Display) on rendered Phase-9 surfaces.
  9. Spacing scale audit: only `4/8/16/24/32/48/64` as tokens (plus the single `96px` hero top-padding inline dimension).
  10. Every icon-only interactive element carries an `aria-label`.
- **D-12:** Run a build (`npm run build`) at the end of each plan to catch token-resolution issues at compile time. UI-checker pass is required before commit; failures route into the same plan, not a new one.

### Anti-Patterns to Prevent
- **D-13:** Do NOT introduce a light/dark theme toggle. The dark surfaces are not theme-switchable. Theme is selected by route, not user preference.
- **D-14:** Do NOT use the bright legacy `--color-gold` (`#F5A623`) on Phase 9 surfaces. It vibrates against `#0a0a0b`. Always use `--color-gold-brand` (`#c9a24a`).
- **D-15:** Do NOT promote cream (`#ece5d3`) to a card surface. Cream is text-only. Cards stay `--color-bg-3` (`#131316`).
- **D-16:** Do NOT use `--color-status-good` or `--color-danger` as decoration colours. They are reserved for status / destructive states only.
- **D-17:** Do NOT add new spacing values outside `{4, 8, 16, 24, 32, 48, 64}`. The single hero-margin `96px` is an inline layout dimension, not a token.
- **D-18:** Do NOT add new font sizes outside `{11, 13, 20, 40}` (mobile downscale 32 for Display). Helper / error text re-uses the 13px Label size and is distinguished by colour only.

### Folded Todos
None. The two todos surfaced by `gsd-sdk todo.match-phase 9` are functional auth/admin features (password reset wiring, admin reassign clients between coaches) and do not belong in a brand-language alignment phase. See "Reviewed Todos" below.

### Claude's Discretion
- Exact tailwind utility names for the new tokens (`text-bg`, `bg-bg-3`, etc.) — planner picks names consistent with `@theme inline` convention.
- Whether to express the focus ring in `globals.css` as a custom utility or as inline `style={{ boxShadow }}` on focused inputs — planner picks based on what fits the existing form-component API.
- Mono-eyebrow component vs inline span — planner picks based on repetition count; if used in >3 places, lift to a small `<MonoEyebrow>` primitive in `src/components/ui/` (allowed: it's a presentation primitive, not a registry block, and doesn't add dependencies).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 9 visual contract (sovereign)
- `.planning/phases/09-brand-language-alignment-across-portal-dashboard-assessment-/09-UI-SPEC.md` — **The locked visual contract.** Tokens, typography (4 sizes: 11/13/20/40, 2 weights), spacing scale ({4, 8, 16, 24, 32, 48, 64}), colour roles, copywriting contract (mono eyebrows + empty/error/loading copy), layout & responsive contract, component inventory, token-naming map, and the 10-item acceptance heuristic checklist. Approved 2026-05-12.

### Source of brand language (read-only, do not modify)
- `src/app/landing.css` — The `.v2-root`-scoped landing page CSS. The Phase-9 hex values are copied from here into `globals.css` under stable token names. Do NOT modify this file; do NOT extend `.v2-root` scope outside the landing route.

### Prior-phase contracts that Phase 9 must NOT violate
- `.planning/phases/08-client-report-design-refresh/08-CONTEXT.md` — Phase 8 pillar contract (D-01..D-30). The report route (`/portal/assessment/[id]/report`) and `src/components/report/*` are sovereign Phase 8. Phase 9 may touch only the **frame around** the report (D-09 above).
- `.planning/phases/08-client-report-design-refresh/08-UI-SPEC.md` (if present) — Phase 8 visual contract for the pillar report.
- Phase 5 PDF contract — `src/lib/pdf/**`. Untouched by Phase 9.
- `.planning/phases/07-multi-tenant-auth-ux/07-CONTEXT.md` — Phase 7 BL-05 ownership gate on the report route. Phase 9 does not change auth or routing, only visuals.

### Project-level
- `.planning/STATE.md` — Phase 9 lock-in line (2026-05-10): "dark across all surfaces; 2 fat plans (09-01 foundations+auth, 09-02 working surfaces)."
- `.planning/ROADMAP.md` §Phase 9 — Phase entry.
- `.planning/codebase/STRUCTURE.md` — Directory map (auth lives at `src/app/login/`, `src/app/reset-password/`; portal at `src/app/portal/`; assessment at `src/app/assessment/[id]/`).
- `.planning/codebase/CONVENTIONS.md` — Naming, Tailwind, Zustand patterns.

### Existing implementation files Phase 9 will edit
- `src/app/globals.css` — Token additions.
- `src/app/layout.tsx` — Font wiring.
- `src/app/portal/layout.tsx`, `src/app/login/layout.tsx`, `src/app/assessment/[id]/layout.tsx` — Add `theme-dark` wrapper.
- `src/app/reset-password/layout.tsx` — NEW (pattern-match `src/app/login/layout.tsx`).
- `src/components/layout/Sidebar.tsx`, `Header.tsx`, `ProgressBar.tsx`, `NavigationButtons.tsx`, `AdminPanel.tsx`, `AppShell.tsx` — Restyle in place.
- `src/components/forms/*` — Restyle in place (centralised; sections inherit).
- `src/components/sections/Section{1..11}.tsx` — Mono-eyebrow injection per section heading.
- `src/components/ui/Dialog.tsx` — Token swap only.
- Portal pages: `src/app/portal/page.tsx`, `src/app/portal/clients/page.tsx`, `src/app/portal/clients/[name]/page.tsx`, `src/app/portal/assessments/page.tsx`.
- Admin pages: `src/app/portal/admin/page.tsx`, `src/app/portal/admin/pillars/`, `users/`, `invitations/`, `audit-logs/`, `normative/`, `assessments/[id]/prescriptions/`.
- Auth pages: `src/app/login/page.tsx`, `src/app/reset-password/page.tsx`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/app/landing.css` token values** — Already the desired hex values (`#0a0a0b`, `#ece5d3`, `#c9a24a`, `#e8d6a8`, alpha-based line tokens). Copy values into `globals.css`; do not import or extend `.v2-root` scope.
- **Phase 8 `Dialog` primitive** (`src/components/ui/Dialog.tsx`) — Already hand-rolled, no third-party dialog dependency. Phase 9 needs only a token swap (panel bg + scrim bg + close `aria-label`).
- **Form components** (`src/components/forms/*`) — Already centralised. Restyling them once propagates to all 11 assessment sections; per-section work is heading-only.
- **Google Fonts wiring** — Inter Tight and JetBrains Mono are already linked in `src/app/layout.tsx` for the landing page. Phase 9 promotes them to `--font-sans` (rebind) and `--font-mono` (new) globally — no new font fetches.
- **Sidebar / Header / ProgressBar / NavigationButtons** — Already in the right layout slot with stable APIs. Phase 9 changes only their visual surface; no prop changes.

### Established Patterns
- **`@theme inline` token model** — Tailwind v4 with custom `--color-*` tokens. Phase 9 follows the existing pattern; no Tailwind config rewrite.
- **Route-segment layouts** — Pattern already exists at `src/app/portal/layout.tsx`, `src/app/login/layout.tsx`, `src/app/assessment/[id]/layout.tsx`. Phase 9 adds one new layout (`src/app/reset-password/layout.tsx`) and wraps all four in `theme-dark`.
- **No npm dialog/dropdown library** — Project hand-rolls primitives. Phase 9 honors this: no `shadcn add`, no new dependencies.
- **Zustand auto-save indicator** — Already in place; Phase 9 only restyles its visual representation (mono pill + gold pulse dot) and adds the three copy variants (`SAVED · {time}` / `SAVING…` / `UNSAVED CHANGES`).

### Integration Points
- **Phase 8 report route boundary** — `/portal/assessment/[id]/report` lives inside the `theme-dark`-wrapped `src/app/portal/layout.tsx`. The report page itself must apply its own light wrapper inside that dark wrapper (the planner will mirror Phase 8's existing report shell pattern — page-level light surface inside the portal shell).
- **Print stylesheet** — Existing `globals.css` print block stays untouched. Phase 9 surfaces use `display: none` on sidebar + nav when printing; report PDF pipeline is `src/lib/pdf/**` and is unchanged.
- **Recharts (`src/components/charts/*`)** — Already imported in `/portal/clients/[name]`. Phase 9 restyles axis text + grid lines + series colours via tokens; no chart-library swap.

</code_context>

<specifics>
## Specific Ideas

- **The 96px hero top-padding** is the one inline layout dimension that is NOT in the spacing token scale. It appears on hero wrappers only (login, reset-password, dashboard hero, admin landing). Applied as `pt-24` on the hero wrapper, not promoted to a token.
- **One mono-eyebrow component, two visual modes** — The 11px size is shared between gold-brand uppercase 0.18em (above hero titles) and `--color-text-faint` uppercase 0.16em (role chips, meta labels). They share the role; colour and letter-spacing distinguish them visually. The planner may build a single `<MonoEyebrow variant="hero" | "meta">` primitive or two inline classes — Claude's discretion (D-claude-1).
- **Body running text density** — 13px Inter Tight at 400/1.55 on cream against `#131316` is the explicit reading-density target. Don't bump to 14px or 15px to "match" the legacy 15px body — the dark canvas reads denser.
- **Status colours stay status-only** — sage (`--color-status-good`) and coral (`--color-danger`) are NOT decorative. They appear only in toasts, save indicators, and destructive confirmations.

</specifics>

<deferred>
## Deferred Ideas

- **Light/dark theme switch** — Explicitly NOT introduced (D-13). If a future phase needs a light mode for a specific accessibility user, design it as a system-preference reader on a per-route basis, not a runtime toggle.
- **Landing-page redesign feedback** — If anything about the landing page's design feels off during this phase's QA, capture for a separate phase. Phase 9 propagates the existing landing language; it does not iterate on it.
- **Recommendation template library** — Phase 8 deferred this; still deferred. Phase 9 does not touch admin authoring text.
- **Mobile-only redesigns** — Phase 9 honors the responsive contract in `09-UI-SPEC.md` §Layout but does not introduce mobile-only behaviours beyond what's specified there.

### Reviewed Todos (not folded)
- **"Admin reassign clients/assessments between coaches"** (`2026-05-07-admin-reassign-clients-and-assessments-between-coaches.md`, todo-match score 0.4) — Functional feature (new admin capability + new API + new UI behaviour). Belongs in a future auth/admin phase, not in a brand-language alignment phase. Keyword match was incidental ("portal", "client").
- **"Add password reset, account management, and admin invitations"** (`2026-05-07-add-password-reset-account-management-and-admin-invitations.md`, todo-match score 0.2) — Password reset is already implemented in Phase 7 (the `/reset-password` route exists and is restyled by this phase). Account management / additional admin invitations belong in a future auth phase.

</deferred>

---

*Phase: 09-brand-language-alignment-across-portal-dashboard-assessment-*
*Context gathered: 2026-05-12*
