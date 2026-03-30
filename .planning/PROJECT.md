# Peak360 — Milestone 1

## What This Is

Peak360 is a full-stack longevity assessment platform built with Next.js. Coaches use it to evaluate clients across 11 sections (body composition, cardiovascular fitness, strength, mobility, biomarkers) with AI-powered document extraction and a 5-tier normative rating system. This milestone evolves the platform from a single-user assessment tool into a multi-user, clinically accurate, coach-and-client platform.

## Core Value

Coaches can deliver accurate, gender-aware health assessments with actionable recommendations and give clients secure access to track their progress over time.

## Requirements

### Validated

- ✓ 11-section assessment workflow with auto-save — existing
- ✓ AI-powered document extraction (GPT-4o) for blood tests and body composition — existing
- ✓ 5-tier normative rating system (poor → elite) for biomarkers and fitness tests — existing
- ✓ SQLite persistence with Drizzle ORM — existing
- ✓ PDF export of Section 11 longevity report — existing
- ✓ Zustand state management with server sync — existing

### Active

- [ ] Gender-specific blood marker normative ranges
- [ ] Admin panel for normative range and threshold management
- [ ] Client portal with authentication and role-based access
- [ ] Report marker range visualization (gauge bars)
- [ ] Actionable recommendations and referral flags in reports
- [ ] Data encryption at rest for sensitive health data
- [ ] Automated backup strategy

### Out of Scope

- Mobile native app — web-first, responsive design sufficient for now
- Real-time collaboration — coaches and clients don't need simultaneous editing
- Third-party integrations (Fitbit, Apple Health) — adds complexity without core value
- Video consultations — out of domain, coaches meet clients in person

## Context

- Brownfield project with established patterns (App Router, Zustand store, Drizzle ORM)
- Existing codebase map at `.planning/codebase/`
- Normative data currently hardcoded in `src/lib/normative/data.ts` — admin panel will move this to DB
- Rating engine accepts age-bucketed thresholds but not gender-specific ones yet
- Single shared admin password currently — needs proper auth system
- Health data is sensitive (blood results, medical history) — encryption and access control are important

## Constraints

- **Tech stack**: Next.js 16 + React 19 + Tailwind CSS v4 + SQLite/Drizzle — must stay consistent with existing architecture
- **Data sensitivity**: Blood results and medical screening data require encryption at rest
- **Backwards compatibility**: Existing assessments must continue to work after normative data moves to DB (fallback to hardcoded defaults)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build gender ranges before admin panel | Gender ranges extend hardcoded data; admin panel then moves the complete dataset to DB | — Pending |
| Application-level encryption (AES-256) | Simpler than DB-level encryption, works with SQLite | — Pending |
| Role-based auth (coach/client) | Simplest model that enables client portal access | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-29 after initialization*
