# Peak360 — Milestone 2

## What This Is

Peak360 is a full-stack longevity assessment platform built with Next.js. Coaches use it to evaluate clients across 11 sections (body composition, cardiovascular fitness, strength, mobility, biomarkers) with AI-powered document extraction and a 5-tier normative rating system. This milestone adds a public-facing landing page that showcases the Peak360 Longevity Program, with program overview, testing protocol details, and a contact form — giving the platform a professional public presence.

## Core Value

Prospective clients can discover the Peak360 Longevity Program through a branded landing page that communicates the program's philosophy, testing protocol, and benefits — and reach out via a contact form.

## Current Milestone: v2.0 Peak360 Landing Page

**Goal:** Build a public-facing landing page matching the Peak360 brochure design (navy/gold, Montserrat/Open Sans), with program overview sections and a contact form, while restructuring routes so the dashboard moves to `/dashboard`.

**Target features:**
- Hero section with program headline and callout banner
- Program Philosophy section
- What We Test section (biomarkers, VO2 Max, body composition, strength)
- Technology Showcase (Vald Force Decks, Evolt360, Calibre VO2)
- Testing Protocol Timeline
- Benefits grid
- CTA section with contact form
- Responsive Tailwind CSS design matching brochure branding
- Route restructure: landing page at `/`, dashboard at `/dashboard`

## Requirements

### Validated

- ✓ 11-section assessment workflow with auto-save — existing
- ✓ AI-powered document extraction (GPT-4o) for blood tests and body composition — existing
- ✓ 5-tier normative rating system (poor → elite) for biomarkers and fitness tests — existing
- ✓ SQLite persistence with Drizzle ORM — existing
- ✓ PDF export of Section 11 longevity report — existing (migrated to @react-pdf/renderer in Phase 5)
- ✓ Zustand state management with server sync — existing

### Active

- [ ] Gender-specific blood marker normative ranges
- [ ] Admin panel for normative range and threshold management
- [ ] Client portal with authentication and role-based access
- ✓ Report marker range visualization (gauge bars) — Validated in Phase 5: SVG range bars in PDF
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
*Last updated: 2026-04-12 — Milestone v2.0 started*
