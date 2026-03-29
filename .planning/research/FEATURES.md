# Feature Landscape

**Domain:** Health/longevity assessment platform for coaches and clients
**Researched:** 2026-03-29

## Table Stakes

Features users expect. Missing = product feels incomplete or clinically inaccurate.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Gender-specific blood marker ranges | Unisex ranges produce clinically wrong ratings for hemoglobin, ferritin, testosterone, iron, RBC count, creatinine. Every lab report distinguishes male/female. A platform that doesn't is less accurate than a $15 blood test printout. | Medium | Type system already supports `GenderedMarker` and `GenderedAgeMarker`. Approximately 15-20 blood markers need gender splits. Clinical reference data is well-established (WHO, pathology standards). |
| Horizontal range bar visualization | Every clinical lab report shows where a value falls on a reference range bar. InsideTracker, Rupa Health, Heads Up Health, and standard pathology reports all use this pattern. Users have been trained to expect it. | Medium | Horizontal bar with 5 colored segments (poor through elite), marker dot showing actual value position. Include numeric value alongside. Research shows bar graphs reduce interpretation time by ~20% vs tables (PMC2995657). |
| Role-based authentication (coach/client) | Multi-user health platforms universally separate practitioner and client access. Coaches see all clients; clients see only their own data. Sharing results via PDF-only is a dealbreaker for longitudinal tracking. | High | Requires users table, session management, middleware route protection, invitation flow. This is the highest-effort table-stakes feature. |
| Client read-only portal | Clients expect to log in and view their own assessments. Every competitor (InsideTracker, Heads Up Health, Rupa Health) offers this. Without it, the coach must manually share results every time. | High | Depends on auth system. Client dashboard showing their assessments with date-ordered list. Read-only access to Section 11 report. |
| Encryption at rest for sensitive fields | Blood results and medical history are health data. Application-level AES-256 encryption for sensitive JSON blobs is the minimum bar. Not legally required everywhere (HIPAA is US-specific), but ethically necessary and increasingly expected. | Medium | Encrypt `assessment_sections` data for sections 3 (medical screening), 5 (blood tests), 6 (body comp). Use AES-256-GCM with separate key management. Do NOT encrypt everything -- only sensitive fields. |
| Actionable recommendations per marker | A tier badge alone ("cautious") is useless without context. Coaches need specific next steps to discuss with clients: supplementation suggestions, lifestyle changes, referral triggers. Rupa Health and InsideTracker both provide per-marker guidance. | Medium | Extend existing `insights.ts` playbook. Cover all markers, not just lipids. Include disclaimer that recommendations are guidance, not medical advice. Evidence-based suggestions with dosage ranges where appropriate. |
| Referral flags for critical values | When a marker is dangerously out of range (e.g., fasting glucose > 11 mmol/L, hemoglobin < 80 g/L), the report must flag "refer to GP immediately." This is a duty-of-care expectation for any health assessment tool. | Low | Simple threshold check on top of existing rating. Red banner/icon on critical markers. Small set of critical thresholds (~10 markers). |
| Medical disclaimer on reports | Any platform providing supplementation or health recommendations must include a disclaimer. Standard practice across all health assessment tools. | Low | Static text block on Section 11 report and PDF export. "This report is for informational purposes only and does not constitute medical advice." |

## Differentiators

Features that set the product apart. Not expected, but valued by coaches.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Admin panel for normative range management | Most platforms hardcode ranges or only allow range customization at enterprise tier. Letting coaches/admins edit thresholds, add new markers, and flag "red flag" indicators without a developer is a genuine differentiator for a coach-facing tool. | High | New `/admin` route. DB-backed `normative_ranges` table with fallback to hardcoded defaults. CRUD UI for tier ranges grouped by category. Preview panel showing how edits affect a sample reading. |
| Red flag marker weighting | Beyond just rating a marker, allowing admins to flag certain markers as "red flags" with configurable severity creates weighted alerts in reports. Few platforms expose this level of configuration. | Medium | Extends admin panel. Adds a severity/weight field per marker. Report sorts or highlights red-flag markers prominently. |
| Longitudinal trend tracking | Clients with multiple assessments can see how markers change over time. InsideTracker and Heads Up Health both offer this, but most coach-specific tools do not. Showing a sparkline or trend arrow per marker across visits is high-value. | High | Requires linking multiple assessments to a single client account. Query historical values per marker. Render trend lines or direction arrows in the report. Depends on client portal auth being in place. |
| Optimal vs normal range distinction | Clinical labs show "normal" (rules out disease). Longevity-focused platforms show "optimal" (peak health). Peak360's 5-tier system already does this implicitly, but making the distinction explicit in the UI (showing both clinical normal AND the 5-tier optimal) would align with the longevity medicine trend. Rupa Health highlights this as a key differentiator. | Low | Overlay or annotation on the range bar showing where "standard lab normal" sits vs the Peak360 optimal tiers. Minimal data work since the tiers already encode this. |
| Coach-controlled result release | Allow coaches to review results before clients see them. Rupa Health offers this: results can be held for coach review, then released manually or on a timer. Prevents client anxiety from seeing raw results without context. | Medium | Adds a "released" boolean per assessment. Client portal only shows released assessments. Coach gets a "release to client" button. |
| Per-marker coach notes | Let coaches add personalized notes to individual markers before releasing results to a client. More personal than generic recommendations. | Low | Text field per marker in the report, visible to client. Stored alongside section data. |
| Biological age score | The longevity space is converging on "biological age" as the headline metric. Deriving a composite biological age from the biomarker panel and fitness tests would be a strong differentiator, though the algorithm needs careful design. | High | Composite scoring from multiple markers. Needs validated algorithm or clearly labeled as "Peak360 estimate." Headline number on client dashboard. |
| PDF report with practice branding | Coaches want to share branded reports. Adding practice logo, coach name, and custom header to the PDF export makes the tool feel professional and co-branded. | Low | Already have PDF export. Add logo upload in admin settings. Template the PDF header. |

## Anti-Features

Features to explicitly NOT build. Each one seems appealing but adds complexity without proportional value for this platform's use case.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Real-time collaboration / simultaneous editing | Coaches and clients never edit the same assessment at the same time. Coach fills it out during a session; client views it later. Adding real-time sync (CRDT, WebSocket) is massive complexity for zero value. | Keep current auto-save model. Coach edits, client reads. |
| Wearable/device integrations (Fitbit, Apple Health, Garmin) | Integration maintenance is a black hole. APIs change, auth flows break, data normalization is endless. The platform's value is in the coached assessment, not passive data collection. | Allow manual entry of wearable-derived metrics (resting HR, step count) in the assessment form. Export data in standard formats if clients want to combine elsewhere. |
| HIPAA-certified infrastructure | Full HIPAA compliance requires BAAs with every vendor, certified hosting, audit logging, breach notification procedures, and ongoing compliance management. This is a legal and operational burden that only makes sense if selling to US medical practices. | Implement sensible security (encryption at rest, TLS, access control, audit log) without claiming HIPAA compliance. Add HIPAA as a future milestone if the market demands it. |
| Built-in messaging / chat between coach and client | Coaches already communicate with clients via existing channels (email, WhatsApp, in-person). Building a messaging system adds notification infrastructure, read receipts, and moderation concerns. | Link to external communication. Include coach contact info on the client portal. |
| Automated lab ordering / phlebotomy scheduling | Platforms like Rupa Health handle the lab ordering pipeline. Replicating it requires partnerships with lab networks, insurance handling, and regulatory compliance. Totally different business. | Accept uploaded lab results (already built with AI extraction). Let coaches use their preferred lab ordering service externally. |
| Mobile native app | A responsive web app covers the client portal use case. Native apps require separate codebases, app store review processes, and ongoing maintenance. The assessment form is primarily used on a laptop/tablet during coaching sessions. | Ensure the client portal is mobile-responsive. PWA if push notifications become needed later. |
| AI-generated treatment plans | Generating specific medical treatment plans crosses from "health assessment tool" into "medical device" territory with regulatory implications. The AI extraction for lab results is fine; AI prescribing treatments is not. | Provide evidence-based recommendations and lifestyle suggestions. Always frame as "discuss with your healthcare provider." Keep the coach as the decision-maker. |
| Multi-language support (i18n) | Adds significant complexity to every UI component. Only worth it when expanding to non-English markets, which is not the current focus. | English-only for now. Structure components so i18n could be added later (externalize strings), but do not invest in it now. |

## Feature Dependencies

```
Gender-specific ranges ──> Admin panel for range management
   (Build gender data first, then give admin UI to manage the complete dataset)

Auth system (users table, sessions, middleware) ──> Client portal
   (Portal requires auth to exist)

Auth system ──> Admin route protection
   (Admin panel needs auth to restrict access)

Client portal ──> Longitudinal trend tracking
   (Trends require multiple assessments linked to a client account)

Client portal ──> Coach-controlled result release
   (Release gating requires client-facing view to gate)

Range bar visualization ──> Optimal vs normal range overlay
   (Overlay sits on top of the range bar component)

Referral flags ──> Red flag marker weighting
   (Weighting extends the basic referral flag concept)

Actionable recommendations ──> Per-marker coach notes
   (Coach notes complement the generated recommendations)
```

## MVP Recommendation

**Phase 1 -- Clinical Accuracy (no auth required):**
1. Gender-specific blood marker ranges -- fixes a clinical accuracy problem that undermines credibility
2. Range bar visualization -- the single highest-impact UI improvement for the report
3. Referral flags for critical values -- duty-of-care baseline
4. Actionable recommendations per marker -- extends existing insights system
5. Medical disclaimer -- trivial but necessary

**Phase 2 -- Admin Management:**
6. Admin panel for normative range management -- moves data to DB, unlocks customization
7. Red flag marker weighting -- extends admin panel

**Phase 3 -- Multi-User Platform:**
8. Role-based auth (coach/client) -- foundation for everything multi-user
9. Client read-only portal -- immediate value once auth exists
10. Encryption at rest -- must ship with or before client portal
11. Coach-controlled result release -- gates client access appropriately

**Phase 4 -- Engagement and Retention:**
12. Longitudinal trend tracking -- requires multiple assessments per client
13. Optimal vs normal range distinction -- polish on the range bar
14. Per-marker coach notes -- personalization layer
15. PDF report with practice branding -- professional polish

**Defer indefinitely:**
- Biological age score: High complexity, needs validated algorithm, better suited as a standalone research effort after the platform is stable

**Rationale for ordering:**
- Clinical accuracy (Phase 1) must come first because wrong ratings undermine trust in everything else
- Admin panel (Phase 2) before auth because it is self-contained and unblocks coach customization without requiring the auth infrastructure
- Auth and client portal (Phase 3) is the highest-effort phase and should be built on a stable, accurate foundation
- Engagement features (Phase 4) only matter once clients are actually using the portal

## Sources

- [Rupa Health Blood Lab Dashboards](https://www.rupahealth.com/blood-lab-dashboards) -- practitioner dashboard features, optimal vs normal ranges, client-facing descriptions
- [Heads Up Health Product](https://headsuphealth.com/product/) -- longevity dashboard, client portal, practitioner management features
- [InsideTracker Pro](https://info.insidetracker.com/npti) -- coach dashboard, biomarker action plans, client blood test integration
- [PMC: Graphical display for laboratory data](https://pmc.ncbi.nlm.nih.gov/articles/PMC2995657/) -- bar graphs reduce interpretation time vs tables
- [PMC: Tables or Bar Graphs in EMR](https://pmc.ncbi.nlm.nih.gov/articles/PMC3770735/) -- bar graph format design with range indicators
- [HIPAA Encryption Requirements 2026](https://www.hipaajournal.com/hipaa-encryption-requirements/) -- AES-256 at rest, TLS in transit
- [AES-256 HIPAA Safe Harbor](https://www.kiteworks.com/hipaa-compliance/hipaa-encryption-requirements-safe-harbor-guide/) -- encryption best practices for health data
- [Longevity Medicine 2026 Strategy](https://holisticare.io/blog/longevity-medicine-2026-strategy/) -- biological age tracking, data-driven protocols
- [Top 8 Longevity Data Management Platforms](https://www.hillarylinmd.com/article/the-top-8-longevity-and-concierge-medicine-health-data-management-platforms) -- market landscape
- [CoachRx + InsideTracker Integration](https://www.coachrx.app/articles/coachrx-and-insidetracker-team-up-so-coaches-can-use-blood-biomarkers-to-deliver-more-effective-prescriptions) -- coach-client biomarker workflow
