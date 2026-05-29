---
slug: 260529-mwp-admin-markers-redesign-stats-modals
type: quick
status: complete
date: 2026-05-29
branch: quick/260529-mwp-admin-markers-redesign
head_commit: 8daa055
---

# Admin Markers Redesign: Stats Bar + Collapsed Accordions + In-Page Modals

Redesigned /portal/admin/markers into a single-page marker workbench: at-a-glance registry analytics, collapsed-by-default section accordions, and inline centered modals for editing both normative ranges and marker content - eliminating the navigate-edit-back loop. The two legacy admin nav cards (Normative Ranges, Marker Content) were consolidated under the Markers card while their routes stay live for back-compat.

## What Shipped

- **Stats bar** (MarkersStatsBar.tsx + pure stats.ts engine): chunky metric tiles (Total, Sources seed/DB, With norms, With content) plus a per-section breakdown row (sections 1..10). The computeMarkerStats engine is unit-tested (5 cases, all green). GET /api/markers gained an admin-gated ?include=stats param returning normsKeys + contentKeys so the page computes stats in one round trip; base response shape unchanged for existing consumers.
- **Collapsed accordions** (MarkersList.tsx): all sections collapsed on first paint, large click-anywhere headers (chunky touch targets) with a rotating chevron, hidden-based panels (no render jank), and search auto-expand of matching sections. SECTION_LABELS lifted into stats.ts as the single source of truth.
- **In-page Ranges modal** (RangesEditModal.tsx): 5-tier editor cloned from NormativeEditPanel into a centered Dialog, preserving the 409 optimistic-concurrency Reload path, reset-to-defaults flow, dirty-discard prompt, and auto-close + parent reload on save.
- **In-page Content modal** (ContentEditModal.tsx): definition + impact + 10-cell coach-insights matrix (5 tiers x 2 genders via tabs) cloned from the marker-content page into a centered Dialog, 409 path preserved, auto-close + parent reload on save.
- **Consolidated nav** (portal/admin/page.tsx): the Normative Ranges and Marker Content cards are hidden (commented, not deleted) behind a HIDDEN 2026-05-29 block; the Markers card copy refreshed to reflect the consolidated scope.

## Commits (branch since main @ b9a4ddc)

| Hash | Subject |
|------|---------|
| bc730ea | feat(admin/markers): stats engine + StatsBar component |
| 56c4a70 | feat(admin/markers): collapsed-by-default section accordions + stats bar |
| 28a04e9 | feat(admin/markers): inline ranges-edit modal |
| 1f0d241 | feat(admin/markers): inline content-edit modal |
| 8daa055 | feat(admin): consolidate Normative + Marker Content under Markers nav card |

## Verification

- npm run build - exits clean (exit 0). The repeated BetterAuthError: default secret lines during "Collecting page data" are pre-existing build-time warnings (no BETTER_AUTH_SECRET set in the local build env) and do not fail the build; all 40 static pages generate and the route table prints normally.
- npx vitest run src/lib/markers/stats.test.ts - 5/5 tests pass.

## Deviations

- **Task 5 (smoke/lint/build) produced no commit.** The plan stated the final chore(admin/markers): smoke pass + lint + build commit should be skipped if no source fixes were needed. Build was clean and tests green with no fixes required, so no Task-5 commit exists. This is the planned no-op path, not a gap. Net result: 5 atomic commits rather than 6.

## Back-Compat

The /portal/admin/normative + /portal/admin/normative/[marker] and /portal/admin/marker-content + /portal/admin/marker-content/[marker] routes remain mounted and reachable (confirmed present in the build route table). Only the dashboard discovery cards were hidden; deep links into the legacy per-marker editors still render.
