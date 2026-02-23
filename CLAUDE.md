# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Peak360 is a full-stack longevity assessment platform built with Next.js. It's a health/fitness evaluation tool with 11 assessment sections covering body composition, cardiovascular fitness, strength, mobility, and biomarkers. Features AI-powered document extraction (GPT-4o) for lab results, SQLite database persistence, and a 5-tier normative rating system.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript + React 19
- **Styling**: Tailwind CSS v4 with custom `@theme inline` tokens (navy/gold color scheme)
- **Database**: SQLite via Drizzle ORM + better-sqlite3 (WAL mode)
- **State**: Zustand for client-side form state with auto-save (1s debounce)
- **AI**: OpenAI GPT-4o via `openai` SDK for document extraction/verification

## Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm run start        # Start production server
npm run db:push      # Push Drizzle schema to SQLite
npm run db:generate  # Generate Drizzle migrations
npm run db:studio    # Open Drizzle Studio (DB browser)
```

## Architecture

### Database (4 tables in `src/lib/db/schema.ts`)

- **assessments** — metadata: id, client_name, client_email, client_dob, client_gender, assessment_date, current_section, status
- **assessment_sections** — one row per section: assessment_id + section_number + JSON data blob
- **signatures** — canvas data URLs: assessment_id, type (client/coach), signature_data
- **uploaded_files** — AI extraction results: assessment_id, section_number, extracted_data JSON, verification_result JSON

### Routing

- `/` — Landing page with assessment list
- `/assessment/[id]/section/[num]` — Section pages (1-11), wrapped by `assessment/[id]/layout.tsx` which provides the Header
- `/api/assessments` — CRUD for assessments
- `/api/assessments/[id]/sections/[num]` — Section data save/load
- `/api/ai/extract` and `/api/ai/verify` — AI document processing

### Key Directories

- `src/components/sections/` — Section1.tsx through Section11.tsx (one component per assessment section)
- `src/components/forms/` — Reusable form components (FormField, SelectField, RadioGroup, SliderField, SignaturePad, FileUploadZone)
- `src/components/layout/` — Header, ProgressBar, NavigationButtons
- `src/lib/normative/` — Rating engine: `data.ts` (thresholds), `ratings.ts` (getPeak360Rating), `insights.ts` (generatePeak360Insights)
- `src/lib/ai/` — AI extraction: `prompts.ts`, `field-mappings.ts`
- `src/lib/store/` — Zustand store with auto-save
- `src/types/` — TypeScript interfaces for all form fields, normative data, API responses

### The 11 Sections

1. Client Information  2. Daily Readiness  3. Medical Screening  4. Informed Consent (canvas signatures)  5. Blood Tests & Biomarkers (~63 fields + AI upload)  6. Body Composition (7 fields + AI upload)  7. Cardiovascular Fitness  8. Strength Testing  9. Mobility & Flexibility  10. Balance & Power  11. Complete Longevity Analysis (report)

### Rating System

All biomarkers and fitness tests use a 5-tier system: **poor → cautious → normal → great → elite**, with `{min, max}` ranges. Some markers have age-bucketed and gender-specific thresholds. Rating colors defined in `src/types/normative.ts` (TIER_COLORS, TIER_LABELS).

### Data Flow

1. User fills form fields → Zustand store updates optimistically
2. Auto-save triggers after 1s debounce → PUT to `/api/assessments/[id]/sections/[num]`
3. Section data stored as JSON blob in `assessment_sections` table
4. On page unload, `navigator.sendBeacon` saves any unsaved changes
5. Section 1 client info syncs to `assessments` record for display on landing page

### AI Pipeline (Sections 5 & 6)

1. User drops file → POST to `/api/ai/extract` (GPT-4o vision for images/PDFs, text for CSV/TXT)
2. Extracted fields → POST to `/api/ai/verify` (second-pass confidence scoring)
3. Review UI shows per-field confidence → user accepts/edits → values auto-fill form

## Key Patterns

- Form field IDs are camelCase (e.g., `clientName`, `cholesterolTotal`)
- All section components receive `SectionProps`: `{ data, onChange, assessmentId }`
- `onChange(fieldName, value)` updates the Zustand store which triggers auto-save
- Color scheme: `--color-navy: #1a365d`, `--color-gold: #F5A623` (defined in `globals.css`)
- The assessment layout (`assessment/[id]/layout.tsx`) provides Header; section pages render ProgressBar and NavigationButtons

## Common Modifications

**Adding a new form field:** Add to the section component → add to TypeScript interface in `src/types/assessment.ts` → field auto-persists via JSON blob

**Adding a new biomarker:** Add thresholds to `src/lib/normative/data.ts` → add to REPORT_MARKERS in Section11 → add field mapping aliases in `src/lib/ai/field-mappings.ts` → add insight playbook in `src/lib/normative/insights.ts`

**Updating normative standards:** Edit `src/lib/normative/data.ts`. Each entry needs all 5 tiers with `{min, max}` ranges.
