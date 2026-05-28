# Phase 12 - Human UAT Checklist

> Run this end-to-end pass before signing Phase 12 complete. The four prior
> plans each verify their own layer; this script confirms the seams hold
> together when an admin actually uses the feature.
>
> **Test marker:** Apolipoprotein B (a real biomarker that does NOT exist in
> the seed REPORT_MARKERS list, so it exercises the full "add via admin UI"
> path with no fallback to seed coverage).
>
> **Environment:**
> - Dev server: `npm run dev` on port `8080` (BETTER_AUTH_URL must be `http://localhost:8080`)
> - Admin login: `admin@admin.com` / `password123`
> - DB: Postgres at `Jaces-Mac-mini.local:5432/peak360_dev`
>
> **Total time estimate:** ~21 minutes for the 7 happy-path steps + ~10 minutes for the 5 negative tests.

---

## Happy Path

### Step 1 - Admin add (5 minutes)

Sign in as admin and create the marker.

- [ ] Open http://localhost:8080/login, sign in as `admin@admin.com` / `password123`
- [ ] Navigate to http://localhost:8080/portal/admin/markers/new
- [ ] Fill the form with these EXACT values:
  - **Label:** `Apolipoprotein B`
  - **Test key** (auto-derived): `apolipoprotein_b` (confirm the preview field shows this; if the auto-deriver produces a different snake-case form, leave it as-is)
  - **Data key** (auto-derived): `apolipoproteinB` (confirm the preview field shows this)
  - **Section:** `5 - Blood Tests & Biomarkers`
  - **Pillar:** `cardiometabolic`
  - **Category:** `Blood Tests & Biomarkers`
  - **Subcategory:** `apo` (or `Lipid Panel` if the form requires a subcategory from a fixed list)
  - **Fallback unit:** `mg/dL`
  - **Has norms:** ON (toggle to enabled - this exposes the inline tier-range editor)
  - **Tier ranges** (5 rows; unisex):
    - poor:     min 130, max blank
    - cautious: min 100, max 130
    - normal:   min 80,  max 100
    - great:    min 60,  max 80
    - elite:    min blank, max 60
  - **AI aliases:** `apolipoprotein b, apo b, apob`
  - **Severity weight:** `7`
- [ ] Click **Save**
- [ ] Confirm the page redirects to `http://localhost:8080/portal/admin/marker-content/apolipoprotein_b`
- [ ] Confirm the marker-content editor loads (NOT a 404 - this is the Plan 04 wiring fix; if 404, return to planner)

### Step 2 - Author content (5 minutes, optional but recommended)

Validate the cross-plan flow with Phase 11.

- [ ] On the marker-content editor at `/portal/admin/marker-content/apolipoprotein_b`:
  - [ ] Write a short **Definition** (e.g., `Apolipoprotein B is the primary structural protein on all atherogenic lipoproteins. Each LDL, VLDL, and Lp(a) particle carries exactly one apoB - so apoB count is a direct measure of atherogenic particle count.`)
  - [ ] Write a short **Impact** (e.g., `apoB is a stronger predictor of cardiovascular risk than LDL-C in many studies. Lower apoB = fewer atherogenic particles in circulation.`)
  - [ ] Fill at least one Coach Insight cell (e.g., the `male / cautious` cell with something like `apoB in the 100-130 range warrants attention; consider tightening diet, increasing aerobic load, and rechecking in 12 weeks.`)
- [ ] Click **Save**
- [ ] Confirm a green "Saved" toast appears and the dirty indicator clears
- [ ] (Optional) Sign back in another tab and confirm `/portal/admin/audit` shows a `marker_content.update` event

### Step 3 - Coach enters value (3 minutes)

Validate the CustomMarkersBlock surface in Section 5.

- [ ] Open http://localhost:8080/portal (admin dashboard or coach dashboard; admin acts as coach here)
- [ ] Open an existing in-progress assessment (or create a new one for a test client)
- [ ] Navigate to **Section 5: Blood Tests & Biomarkers**
- [ ] Scroll to the bottom of the section form
- [ ] Confirm a **Custom markers** card appears with the heading `Custom markers - Blood Tests & Biomarkers` (or similar)
- [ ] Inside the card, confirm a numeric input labelled `Apolipoprotein B (mg/dL)` is rendered
- [ ] Enter the value `85` in that input
- [ ] Open the browser Network tab and confirm a `PUT /api/assessments/{id}/sections/5` fires within ~1 second of the input losing focus (the Zustand auto-save debounce)
- [ ] Confirm the request returns HTTP 200 (auto-save success)
- [ ] Refresh the page and confirm the value `85` persists (DB round-trip OK)

### Step 4 - Section 11 interactive report (3 minutes)

Validate the report-side pillar grouping and modal.

- [ ] Navigate to **Section 11** of the same assessment
- [ ] Wait for the report to fully load (loading spinners cleared)
- [ ] Scroll to the **Cardiometabolic Health** pillar
- [ ] Confirm `Apolipoprotein B` appears in that pillar's marker list
- [ ] Confirm the marker row shows:
  - the value `85`
  - the unit `mg/dL`
  - a tier pill matching the entered value against your tier ranges (with the ranges above, 85 falls in `normal` so expect a "Normal" / green pill)
  - a horizontal range bar with a needle indicator
- [ ] Click on the `Apolipoprotein B` row to open the **PillarsDisplayModal**
- [ ] In the modal:
  - [ ] Confirm the marker detail panel opens (master/detail layout on desktop, drill-in on mobile)
  - [ ] Confirm the **Definition** and **Impact** content from Step 2 renders (if Step 2 was skipped, expect the generated fallback with "Auto-generated - no coach insight authored yet" badge per Phase 11 D-06)
  - [ ] Confirm the Coach Insight matches the (tier, gender) of the test client - for a male client at `normal`, expect either the cell you authored or the generated fallback

### Step 5 - PDF export (3 minutes)

Validate the PDF pipeline.

- [ ] On the Section 11 report, click the **Export PDF** button (top-right of the report)
- [ ] Wait for the PDF to download (typical: 2-5 seconds)
- [ ] Open the downloaded PDF
- [ ] Scroll to the **Cardiometabolic Health** pillar page (or wherever non-normal markers land per recent Phase 11 commits)
- [ ] Confirm `Apolipoprotein B` is listed in that pillar with:
  - the value `85`
  - the unit `mg/dL`
  - the same tier pill as in Step 4
  - the same range bar layout as seeded markers
- [ ] Confirm NO special "custom" / "DB" badge differentiates Apolipoprotein B from seeded markers (D-11 locked: "same rendering, no custom badge")

### Step 6 - Audit log (1 minute)

Validate the admin audit trail.

- [ ] Navigate to http://localhost:8080/portal/admin/audit
- [ ] Filter to today (or scroll to the top of the most-recent list)
- [ ] Confirm a `marker.create` event appears for the Apolipoprotein B creation (resource_id `apolipoprotein_b`, actor `admin@admin.com`)
- [ ] If Step 2 was completed, confirm a `marker_content.update` event also appears
- [ ] Confirm the event metadata includes `pillar: cardiometabolic` and `section: 5` (or equivalent payload structure)

### Step 7 - Cleanup (1 minute)

Remove the test marker and confirm the cascade.

- [ ] Navigate back to http://localhost:8080/portal/admin/markers
- [ ] Find `Apolipoprotein B` in the section-5 group
- [ ] Click **Edit** (or the row), then click **Delete**
- [ ] Confirm the two-click cascade confirm dialog appears explaining that marker_content + normative_ranges will also be cleared
- [ ] Confirm the deletion
- [ ] Confirm `Apolipoprotein B` is no longer in the markers list
- [ ] Reload an assessment's Section 5 and confirm the Custom markers card no longer shows the Apolipoprotein B input (or the card self-hides entirely if no other DB markers exist)
- [ ] Reload Section 11 and confirm `Apolipoprotein B` is no longer in the cardiometabolic pillar
- [ ] (Optional, DB confirm) From the dev DB:
  ```bash
  PGPASSWORD=postgres psql -h Jaces-Mac-mini.local -U postgres -d peak360_dev -c \
    "SELECT count(*) FROM markers WHERE test_key='apolipoprotein_b';
     SELECT count(*) FROM marker_content WHERE test_key='apolipoprotein_b';
     SELECT count(*) FROM normative_ranges WHERE test_key='apolipoprotein_b';"
  ```
  - [ ] All three counts return `0`

---

## Negative Tests

Run these after the happy path is green. Each one isolates a specific guard
the per-plan acceptance criteria assert but only an end-to-end test can
exercise visually.

### N1 - testKey collision with seeded marker (returns 409)

- [ ] Navigate to http://localhost:8080/portal/admin/markers/new
- [ ] Try to submit a new marker with **Test key** = `hdl` (a seeded marker testKey from REPORT_MARKERS)
- [ ] Confirm the server rejects with **409 Conflict** and an error message like `testKey conflicts with a seeded marker`
- [ ] Confirm no row is written to the `markers` table (no orphan)

### N2 - testKey collision with another DB marker (returns 409)

- [ ] Re-add the Apolipoprotein B marker from Happy Path Step 1 (skip the optional content authoring)
- [ ] Without deleting it, navigate to `/portal/admin/markers/new` in a new tab
- [ ] Try to submit a second marker with the same **Test key** = `apolipoprotein_b`
- [ ] Confirm the server rejects with **409 Conflict** and an error message like `testKey already in use`
- [ ] Clean up: delete the Apolipoprotein B marker before continuing

### N3 - dataKey change blocked on PUT (returns 400)

- [ ] Re-add the Apolipoprotein B marker
- [ ] Navigate to its edit page at `/portal/admin/markers/apolipoprotein_b`
- [ ] Confirm the **Data key** input is disabled (greyed out, non-focusable)
- [ ] Hover the disabled input and confirm a tooltip explains `Locked after creation - changing this would orphan existing assessment data`
- [ ] (Optional, API-level) From a terminal, manually issue a PUT with a changed dataKey:
  ```bash
  curl -i -X PUT http://localhost:8080/api/admin/markers/apolipoprotein_b \
    -H "Content-Type: application/json" \
    --cookie "$(cat /tmp/admin-cookie.txt)" \
    -d '{"dataKey":"apolipoproteinBChanged","updatedAt":<current-timestamp>,"updatedBy":"admin@admin.com"}'
  ```
  - [ ] Confirm the response is **400 Bad Request** with an error like `dataKey is immutable after creation`
- [ ] Clean up: delete the Apolipoprotein B marker

### N4 - Optimistic concurrency conflict (returns 409 + Reload button)

- [ ] Re-add the Apolipoprotein B marker
- [ ] Open the edit page at `/portal/admin/markers/apolipoprotein_b` in **two browser tabs**
- [ ] In Tab 1, change the **Severity weight** to `8` and click **Save** - confirm success
- [ ] In Tab 2 (still showing the original `updatedAt`), change the **Severity weight** to `9` and click **Save**
- [ ] Confirm Tab 2 shows a **409 Conflict** error with a **Reload** button (per Plan 03 optimistic-concurrency UI)
- [ ] Click **Reload** in Tab 2 and confirm the form re-fetches and now shows `severityWeight: 8`
- [ ] Clean up: delete the Apolipoprotein B marker

### N5 - CustomMarkersBlock self-hides when no DB markers exist for the section

- [ ] Ensure no DB markers exist for **Section 2** (Daily Readiness) - check `/portal/admin/markers` and confirm the Section 2 group is empty or only shows seeded markers (which are excluded from `CustomMarkersBlock` per Plan 04: filter is `source==='db' && section===N`)
- [ ] Open an assessment and navigate to **Section 2: Daily Readiness**
- [ ] Scroll to the bottom of the form
- [ ] Confirm NO empty "Custom markers" card is rendered (the block self-hides per D-08 + Plan 04 acceptance criterion)
- [ ] Confirm no orphan empty heading like `Custom markers -` with no inputs underneath

---

## Sign-off

- [ ] All 7 happy-path steps completed without defects
- [ ] All 5 negative tests behaved as documented
- [ ] No orphan rows left in `markers`, `marker_content`, or `normative_ranges`
- [ ] Audit log shows clean create/delete trail

**Tester:** ___________________________
**Date:** _____________________________
**Outcome:** [ ] PASS &nbsp;&nbsp; [ ] PASS-WITH-NOTES &nbsp;&nbsp; [ ] FAIL (file gap-closure plan)

If any step fails, note which step + which plan owns the failing layer:
- Step 1 form / 409 / redirect → Plan 02 (POST handler) or Plan 03 (admin UI)
- Step 2 marker-content editor 404 → Plan 04 (D-06 wiring fix)
- Step 3 CustomMarkersBlock missing → Plan 04 (mechanical Sections 1-10 mount)
- Step 4 Section 11 pillar grouping wrong → Plan 01 (markerToPillar D-07) or Plan 04 (Section11 merged-registry fetch)
- Step 5 PDF missing the marker → Plan 04 (load-report-data merged-registry migration)
- Step 6 audit event missing → Plan 02 (audit emission on POST/PUT/DELETE)
- Step 7 cascade leftover → Plan 02 (deleteMarker cascade) or Plan 01 (queries.ts deleteMarker)

Then return to the planner via `/gsd:plan-phase 12 --gaps` or open a gap-closure plan manually.
