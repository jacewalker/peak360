# Requirements: Peak360 Milestone 1

**Defined:** 2026-03-29
**Core Value:** Coaches can deliver accurate, gender-aware health assessments with actionable recommendations and give clients secure access to track their progress over time.

## v1 Requirements

### Clinical Accuracy

- [ ] **CLIN-01**: Rating engine accepts gender parameter and selects gender-specific thresholds for blood markers
- [ ] **CLIN-02**: Gender-specific normative ranges added for ~15-20 blood markers where male/female ranges differ clinically (hemoglobin, ferritin, testosterone, iron, creatinine, etc.)
- [ ] **CLIN-03**: Combined age-bucketed and gender-specific threshold lookups work together
- [ ] **CLIN-04**: Gender propagated from Section 1 (clientGender) through to Section 11 rating calls

### Report Visualization

- [ ] **REPT-01**: Horizontal range bar/gauge next to each marker showing value position within 5-tier range (poor to elite)
- [ ] **REPT-02**: Referral flags for markers critically out of range (e.g., "Refer to GP for further investigation")
- [x] **REPT-03**: Supplementation recommendations for markers in poor/cautious tiers
- [x] **REPT-04**: Lifestyle/dietary suggestions for markers in cautious tier
- [ ] **REPT-05**: Medical advice disclaimer clearly displayed on report

### Authentication

- [ ] **AUTH-01**: User accounts with role-based access (admin, coach, client)
- [ ] **AUTH-02**: Assessment ownership via coach_id and client_id columns on assessments table
- [ ] **AUTH-03**: Every API route independently validates auth (not middleware-only)
- [ ] **AUTH-04**: Coaches can invite clients via email link or generated credentials
- [ ] **AUTH-05**: Client login provides read-only access to own assessments only

### Admin Panel

- [ ] **ADMN-01**: Normative ranges moved from hardcoded TypeScript to database-backed configuration
- [ ] **ADMN-02**: Hardcoded defaults used as fallback when no DB overrides exist
- [ ] **ADMN-03**: Admin UI to browse all markers grouped by category (blood, body comp, cardio, strength, mobility, balance)
- [ ] **ADMN-04**: Admin UI to edit min/max values for each tier per marker
- [ ] **ADMN-05**: Normative range versioning — snapshot the version used per assessment
- [ ] **ADMN-06**: Red flag marker weighting with configurable severity

### Security

- [ ] **SECU-01**: AES-256-GCM encryption at rest for sensitive fields (blood results, medical screening)
- [ ] **SECU-02**: Audit log recording who accessed what data and when
- [ ] **SECU-03**: Automated SQLite backup strategy with point-in-time recovery capability

## v2 Requirements

### Client Engagement

- **ENGE-01**: Client dashboard showing trends across multiple assessments
- **ENGE-02**: Magic link login for clients (requires email infrastructure)
- **ENGE-03**: Coach notes per assessment visible to client
- **ENGE-04**: Branded PDF export with coach/business logo

### Admin Enhancements

- **ADEX-01**: Preview of how range changes affect a sample reading
- **ADEX-02**: Risk threshold configuration for readiness and medical screening questions
- **ADEX-03**: Bulk import/export of normative ranges

### Data Portability

- **DATA-01**: Client data export for portability (GDPR-style data access)
- **DATA-02**: Encryption key rotation strategy

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile native app | Web-first; responsive design sufficient for current use |
| Real-time collaboration | Coaches and clients don't need simultaneous editing |
| Wearable integrations (Fitbit, Apple Health) | Complexity sinkhole, not core value |
| HIPAA certification | Compliance process, not a software feature — address organizationally |
| Lab ordering integration | Out of domain, coaches work with existing lab results |
| AI treatment plans | Liability risk, coaches provide guidance not prescriptions |
| Video consultations | Out of domain, coaches meet clients in person |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLIN-01 | Phase 1 | Pending |
| CLIN-02 | Phase 1 | Pending |
| CLIN-03 | Phase 1 | Pending |
| CLIN-04 | Phase 1 | Pending |
| REPT-01 | Phase 1 | Pending |
| REPT-02 | Phase 1 | Pending |
| REPT-03 | Phase 1 | Complete |
| REPT-04 | Phase 1 | Complete |
| REPT-05 | Phase 1 | Pending |
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 2 | Pending |
| ADMN-01 | Phase 3 | Pending |
| ADMN-02 | Phase 3 | Pending |
| ADMN-03 | Phase 3 | Pending |
| ADMN-04 | Phase 3 | Pending |
| ADMN-05 | Phase 3 | Pending |
| ADMN-06 | Phase 3 | Pending |
| SECU-01 | Phase 4 | Pending |
| SECU-02 | Phase 4 | Pending |
| SECU-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---
*Requirements defined: 2026-03-29*
*Last updated: 2026-03-29 after roadmap creation*
