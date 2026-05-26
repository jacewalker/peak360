---
status: partial
phase: 11-report-marker-detail-coach-insights
source: [11-VERIFICATION.md]
started: 2026-05-26T07:05:00Z
updated: 2026-05-26T07:05:00Z
---

## Current Test

[awaiting human testing — female-client coach-insight render]

## Tests

### 1. Female Coach Insight render (live)
expected: Open a completed report for a **female** client, open a pillar modal, click a marker. The Coach Insight card badge reads "Female · [Tier]" and shows the female-authored text (distinct from the male text).
result: [pending] — could not be exercised in dev: no completed assessment with `client_gender = 'female'` exists. Verified by composition instead: female authored content confirmed present and distinct in the admin editor (11-03), and the modal resolver (`normalizeGender(gender)` → `coachInsights[tier]['female']`) is identical to the male path, which was confirmed live (male client → "Male · Attention" testosterone insight).

### 2. D-06 Auto-Generated fallback (live)
expected: For a marker with no authored coach insight for (tier, gender), the detail panel shows `generatePeak360Insights` output labelled "Auto-generated · no coach insight authored yet".
result: PASSED — verified live by the orchestrator. Temporarily cleared the hs-CRP male/Cautious cell, viewed Robert Holland's report (hs-CRP = cautious): the detail showed the generated inflammation guidance with the "Auto-generated · no coach insight authored yet" note. Cell restored afterward (DB back to 97 fully-seeded rows).

## Summary

total: 2
passed: 1
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
