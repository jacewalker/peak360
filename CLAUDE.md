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

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Peak360 — Milestone 1**

Peak360 is a full-stack longevity assessment platform built with Next.js. Coaches use it to evaluate clients across 11 sections (body composition, cardiovascular fitness, strength, mobility, biomarkers) with AI-powered document extraction and a 5-tier normative rating system. This milestone evolves the platform from a single-user assessment tool into a multi-user, clinically accurate, coach-and-client platform.

**Core Value:** Coaches can deliver accurate, gender-aware health assessments with actionable recommendations and give clients secure access to track their progress over time.

### Constraints

- **Tech stack**: Next.js 16 + React 19 + Tailwind CSS v4 + SQLite/Drizzle — must stay consistent with existing architecture
- **Data sensitivity**: Blood results and medical screening data require encryption at rest
- **Backwards compatibility**: Existing assessments must continue to work after normative data moves to DB (fallback to hardcoded defaults)
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5 - Core application logic, type-safe development
- JavaScript - Build configuration files (.mjs, .ts files executed as ESM)
- JSX/TSX - React component syntax throughout `src/components/` and `src/app/`
- HTML5 - Canvas-based signature pads, PDF generation
- CSS3 - Tailwind CSS classes for styling
## Runtime
- Node.js - Backend runtime for Next.js API routes and database operations
- Browser - Client-side React application (ES2017+ JavaScript)
- npm - Dependency management
- Lockfile: `package-lock.json` present (npm v9+ format)
## Frameworks
- Next.js 16.1.6 - Full-stack React framework with App Router, TypeScript support
- React 19.2.3 - UI component library
- React DOM 19.2.3 - DOM rendering
- Tailwind CSS 4 - Utility-first CSS framework with `@tailwindcss/postcss` plugin
- PostCSS 8 - CSS transformation pipeline via `postcss.config.mjs`
- Zustand 5.0.11 - Client-side form state management with auto-save debouncing
- Drizzle ORM 0.45.1 - SQL query builder and schema management
- better-sqlite3 12.6.2 - SQLite database driver with WAL mode support
- pg 8.18.0 - PostgreSQL driver (optional, selected via `DATABASE_URL` env var)
- Vitest 4.0.18 - Unit test runner with jsdom environment
- jsdom 28.1.0 - DOM simulation for browser-like testing
- @testing-library/react 16.3.2 - React component testing utilities
- @testing-library/jest-dom 6.9.1 - Custom DOM matchers
- @testing-library/user-event 14.6.1 - User interaction simulation
- Turbopack - Next.js bundler (enabled via dev mode)
- ESLint 9 - Code linting with Next.js presets
- eslint-config-next - Next.js + TypeScript ESLint rules
- jsPDF 4.2.0 - PDF generation from canvas and HTML
- html2canvas-pro 2.0.0 - HTML to canvas rendering for PDF export
- Recharts 3.8.0 - React charting library for assessment trends
- uuid 13.0.0 - UUID v4 generation for assessment IDs
- OpenAI SDK 6.22.0 - OpenAI API client for GPT-4o integration
## Key Dependencies
- openai 6.22.0 - Used for document extraction (vision) and biomarker verification via GPT-4o
- better-sqlite3 12.6.2 - Local database persistence (primary in development)
- drizzle-orm 0.45.1 - Type-safe database queries with schema management
- drizzle-kit 0.31.9 - Database migrations and schema tooling
- jspdf 4.2.0 - Section 11 (Complete Longevity Analysis) PDF report generation
- html2canvas-pro 2.0.0 - Canvas rendering for PDF section screenshots
- recharts 3.8.0 - Dashboard trends visualization (clients page)
## Configuration
- `.env.local` - Local environment variables (existence confirmed, secrets not read)
- Database selection: Uses `DATABASE_URL` presence to select PostgreSQL vs SQLite
- `next.config.ts` - Next.js configuration:
- `tsconfig.json` - TypeScript compiler options:
- `postcss.config.mjs` - PostCSS pipeline with Tailwind CSS v4 plugin
- `drizzle.config.ts` - Database schema and migration configuration:
- `eslint.config.mjs` - ESLint configuration:
- `vitest.config.ts` - Vitest configuration:
## Database
- SQLite 3 via better-sqlite3
- File location: `local.db`
- WAL (Write-Ahead Logging) mode enabled for concurrency
- Foreign keys enforced at database level
- Tables: `assessments`, `assessment_sections`, `signatures`, `uploaded_files`
- PostgreSQL via `pg` driver
- Activated when `DATABASE_URL` environment variable is set
- Same schema structure, uses JSONB for JSON columns instead of TEXT
## Platform Requirements
- Node.js (version not pinned in `.nvmrc`, inferred from `@types/node: ^20`)
- npm (included with Node.js)
- SQLite3 libraries (bundled with better-sqlite3)
- Node.js runtime compatible with ES2017
- SQLite3 libraries (if using SQLite) or PostgreSQL client libraries (if using PostgreSQL)
- Standalone build output from Next.js (no separate build artifacts needed)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Components: PascalCase (`Section1.tsx`, `FormField.tsx`, `SectionHeader.tsx`)
- Utilities/modules: camelCase (`assessment-store.ts`, `normative/ratings.ts`)
- API routes: kebab-case (`/api/ai/extract`, `/api/assessments/[id]/sections/[num]`)
- camelCase for all functions (`calculateAge`, `getFitnessAgeGroup`, `normalizeRating`)
- Handler functions: `handleX` pattern (`handleFileUpload`, `handleChange`)
- Getter/setter hooks: `useX` pattern (`useAssessmentStore`, `useRouter`)
- camelCase for all variables and constants (`assessmentId`, `clientName`, `isDirty`)
- State variables with descriptive names (`processingStage`, `extractedFields`, `errorMessage`)
- Boolean flags: `isX` or `hasX` pattern (`isDirty`, `isSaving`)
- PascalCase for interfaces and types (`SectionProps`, `ClientInfo`, `BloodTests`, `Assessment`)
- Union/literal types lowercase (`'male' | 'female'`, `'poor' | 'cautious' | 'normal' | 'great' | 'elite'`)
- camelCase matching field names from TypeScript interfaces (`clientName`, `cholesterolTotal`, `bodyFatPercent`, `crpHs`)
## Code Style
- Tool: Prettier (implicit from Next.js project setup)
- Line length: Flexible (examples show 80-100+ char lines)
- Indentation: 2 spaces
- Semicolons: Always included
- Tool: ESLint
- Config: `eslint.config.mjs` using `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Enforces Next.js and TypeScript best practices
## Import Organization
- `@/*` maps to `./src/*` (defined in `tsconfig.json`)
- All internal imports use `@/` alias (never relative paths like `../../../`)
- Examples: `@/types/assessment`, `@/components/forms/FormField`, `@/lib/db`
- Always use `import type { ... }` for TypeScript types and interfaces
- Example: `import type { SectionProps, Assessment } from '@/types/assessment'`
## Error Handling
- **API routes**: Return explicit error responses with status codes
- **Client components**: Use state for error messages
- **Validation**: Defensive checks for null/undefined
- **No explicit error throwing**: Exceptions not thrown in application code; handled via NextResponse and state
## Logging
- No logging statements found in codebase (minimal/debug approach)
- API responses use `NextResponse.json()` for structured responses
- Client-side debugging would use `console` if needed (not prevented)
## Comments
- Inline comments rare in codebase; code is self-documenting
- Complex logic paths may have comments (e.g., multi-step async operations)
- Example from `Section5.tsx`: `// Check for blocking warnings (unreadable / no data with no fields)`
- Not extensively used; interfaces are self-documenting via TypeScript
- Some complex functions have inline step comments
- Example: Comments describe processing stages and warning types
## Function Design
- Component functions: 50-200 lines common (includes JSX)
- Utility functions: 10-30 lines typical
- Large components split with sub-components (e.g., Section1-11 organized in separate files)
- Props passed via destructuring in component function signatures
- API routes use `{ params }: { params: Promise<{ id: string; num: string }> }` pattern for dynamic routes
- Arrow function callbacks preferred: `(v) => onChange('clientName', v)`
- Components return JSX
- API routes return `NextResponse.json({ success: boolean, data?: any, error?: string })`
- Utility functions return typed values: `Standards`, `RatingResult`, `{ tier: RatingTier; raw: string }`
- Null/undefined return with fallback often: `value ?? ''` or `value ?? 'default'`
## Module Design
- Components: Default export (e.g., `export default function Section1(...)`)
- Types: Named exports (e.g., `export interface ClientInfo { ... }`)
- Constants: Named exports (e.g., `export const TOTAL_SECTIONS = 11`)
- Utilities: Named exports (e.g., `export function getPeak360Rating(...)`)
- Not extensively used; imports directly from source files
- Type definitions consolidated in `src/types/`
- Components organized by feature directory (`src/components/sections/`, `src/components/forms/`, `src/components/ui/`)
## Component Architecture
- All section components receive standardized props: `{ data, onChange, assessmentId }`
- `data`: Section-specific data object (typed by section)
- `onChange(fieldName, value)`: Callback to update store
- `assessmentId`: String ID for API calls
- Example from `Section1.tsx`: `export default function Section1({ data, onChange }: SectionProps)`
- Marked with `'use client'` directive (required for React 19 + Next.js App Router)
- All interactive form components are client components
- Tailwind CSS with custom theme colors (navy, gold, rating tiers)
- Colors defined in `src/app/globals.css` via `@theme inline`
- Utility classes: `space-y-6`, `px-3 py-2.5`, `border border-border`, `text-sm`, `font-medium`
- Custom color tokens: `text-navy`, `text-gold`, `bg-surface`, `border-border`
## Zustand Store Pattern
- Single store instance: `useAssessmentStore` in `src/lib/store/assessment-store.ts`
- State shape: `{ assessmentId, currentSection, sectionData, completedSections, isDirty, isSaving, lastSaved, ...actions }`
- Action naming: `set/mark/reset` prefix (e.g., `setAssessmentId`, `markSectionCompleted`, `reset`)
- Accessed via `useAssessmentStore.getState()` in tests, hook pattern in components
- `onChange` handlers in components trigger `updateSectionField` → sets `isDirty = true`
- Debounced auto-save (1s) triggers PUT to `/api/assessments/[id]/sections/[num]`
- On save success: `setLastSaved(time)` which also sets `isDirty = false`
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Form-driven workflow spanning 11 sequential sections with automatic state synchronization
- Client-side state management with server-side persistence (auto-save pattern)
- AI-powered document extraction as middleware layer (OpenAI GPT-4o for images/PDFs/CSV)
- Normative rating system with 5-tier scoring applied to biomarkers and fitness metrics
- Responsive assessment lifecycle from creation → section completion → final report generation
## Layers
- Purpose: Render section forms, navigation, layouts, and reports to users
- Location: `src/app/` (page routes), `src/components/`
- Contains: React Server Components (layouts), Client Components (forms with state), UI primitives
- Depends on: Zustand store, API routes, TypeScript interfaces
- Used by: Browser/Next.js runtime
- Purpose: Hold form state in memory, track dirty flags, trigger auto-saves, manage completion status
- Location: `src/lib/store/assessment-store.ts`
- Contains: Zustand store with section data, assessment metadata, save status
- Depends on: React hooks, Zustand
- Used by: All section components via `useAssessmentStore()`
- Purpose: Bridge between client and database; handle CRUD, AI extraction, validation
- Location: `src/app/api/`
- Contains: Next.js route handlers for assessments, sections, AI extraction/verification, auth
- Depends on: Drizzle ORM, OpenAI SDK, database
- Used by: Client fetch calls, server-side operations
- Purpose: Compute ratings, manage normative thresholds, validate section completeness, export data
- Location: `src/lib/normative/`, `src/lib/db/`, `src/lib/ai/`, `src/lib/csv/`
- Contains: Rating engine, field mappings, database schema, CSV conversion logic
- Depends on: TypeScript types, database schema
- Used by: API layer and server-side calculations
- Purpose: Persist assessments, sections, signatures, and extracted AI data
- Location: `src/lib/db/schema.ts`, `local.db` (SQLite) or `DATABASE_URL` (Postgres)
- Contains: Four tables with referential integrity and JSON columns for flexible section data
- Depends on: Drizzle ORM, better-sqlite3 or node-postgres driver
- Used by: API layer via db proxy
## Data Flow
- `beforeunload` event listener uses `navigator.sendBeacon()` to POST unsaved changes
- Beacon fires even if user closes tab/navigates away
- Ensures no data loss in case of unexpected exit
- **Client-side:** Zustand store holds `sectionData[section]` as partial record of unknown
- **Server-side:** `assessment_sections.data` column stores full section as JSON blob
- **Sync strategy:** Store is source of truth during session; PUT commits to DB; GET on page load restores from DB
- **Completion tracking:** Separate `completedSections` array in store, persisted in assessment metadata
## Key Abstractions
- Purpose: Standard interface for all section components to receive data and handlers
- Examples: `src/components/sections/Section1.tsx` through `Section11.tsx`
- Pattern: `{ data: Record<string, unknown>, onChange: (field, value) => void, assessmentId: string }`
- Allows decoupling section UI from data management
- Purpose: Metadata envelope for a client's complete assessment lifecycle
- Examples: Client name, gender, DOB synced from Section 1; current section tracking; status (in_progress/completed)
- Pattern: Top-level row in `assessments` table; linked to multiple section data rows via foreign key
- Purpose: Store unstructured section form data as JSON blob with completion timestamp
- Examples: Blood test values (Section 5), body composition (Section 6), readiness scores (Section 2)
- Pattern: One row per section per assessment; `data` column is JSONB with flexible shape
- Purpose: Mediate AI extraction with quality gates and user feedback
- Examples: `FileUploadZone` (drop zone UI), `ExtractedValuesPanel` (review UI)
- Pattern: Three stages (uploading→reading→interpreting), error/warning handling, confidence display
- Purpose: Map test values to 5-tier labels (poor/cautious/normal/great/elite) based on age/gender/test-type
- Examples: `normativeData` object with marker-specific ranges; `getPeak360Rating()` resolver function
- Pattern: Lookup thresholds, find matching range, return tier + color/label from `TIER_COLORS`
## Entry Points
- Location: `src/app/page.tsx`
- Triggers: User visits `/`
- Responsibilities: Display dashboard stats (total, incomplete, completed, clients), show action items (stuck assessments), list recent assessments, button to create new assessment
- Location: `src/app/assessment/[id]/section/[num]/page.tsx`
- Triggers: User navigates to `/assessment/{uuid}/section/{1-11}`
- Responsibilities: Load section component, manage auto-save, handle navigation, restore state from API
- Location: `src/app/assessment/[id]/layout.tsx`
- Triggers: Wraps all section pages under `/assessment/[id]/**`
- Responsibilities: Render Header with assessment metadata, provide consistent nav context
- Triggers: Dashboard load, clients page load
- Returns: Array of all assessments ordered by recency
- Used for: Listing in dashboard, computing client aggregates
- Triggers: User clicks "New Assessment"
- Returns: New assessment UUID
- Used for: Creating empty assessment record and redirecting to section 1
- Triggers: Auto-save on 1s debounce OR page unload via sendBeacon
- Returns: 200 success
- Used for: Persisting section data + syncing client info from section 1
- Triggers: User uploads file to section 5 or 6
- Returns: Extracted fields + quality warnings
- Used for: AI document processing with quality gates
- Triggers: After successful extraction, before showing values panel
- Returns: Per-field confidence scores
- Used for: Second-pass validation and user confidence display
## Error Handling
- **API Errors:** Caught in fetch `.catch()` handlers; show error toast/message; allow user to retry
- **Extraction Warnings:** Non-blocking warnings (low quality, wrong doc) show as alert text; blocking warnings (unreadable, no data) prevent acceptance and show error state
- **Form Validation:** Section completion checked on navigation via `isSectionComplete()` but doesn't block progress (soft gate)
- **Database Integrity:** Foreign keys cascade delete; null JSON values default to empty object on read
- **Network Offline:** `sendBeacon` on unload ensures saves attempt even in degraded conditions
## Cross-Cutting Concerns
- Server-side: `isSectionComplete()` checks required fields per section type
- AI: Extraction API validates field relevance and document type matching
- Client-side: FormField components require HTML5 validation (type, required, min/max)
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
