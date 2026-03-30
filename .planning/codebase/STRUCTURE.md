# Codebase Structure

**Analysis Date:** 2026-03-29

## Directory Layout

```
peak360/
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── layout.tsx          # Root layout wrapping all pages
│   │   ├── page.tsx            # Landing/dashboard page (/)
│   │   ├── globals.css         # Tailwind + custom theme tokens
│   │   ├── assessment/         # Assessment flow pages
│   │   │   ├── [id]/           # Dynamic assessment ID
│   │   │   │   ├── layout.tsx  # Assessment header wrapper
│   │   │   │   ├── page.tsx    # Assessment intro/redirect
│   │   │   │   └── section/[num]/page.tsx  # 11 section pages
│   │   │   └── new/page.tsx    # New assessment creation
│   │   ├── assessments/        # Assessment list page
│   │   ├── clients/            # Client pages
│   │   │   ├── page.tsx        # Clients list
│   │   │   └── [name]/page.tsx # Client detail + trends
│   │   ├── login/              # Auth stub (not yet active)
│   │   └── api/                # Server-side API routes
│   │       ├── assessments/    # Assessment CRUD
│   │       ├── ai/             # AI extraction/verification
│   │       ├── auth/           # Auth routes (stub)
│   │       └── health/         # Health check endpoint
│   ├── components/
│   │   ├── sections/           # Section-specific components (Section1–11)
│   │   ├── forms/              # Reusable form inputs
│   │   ├── layout/             # Page layout components (Header, Sidebar, Nav)
│   │   └── ui/                 # Semantic/display components (SectionHeader, Badge, etc.)
│   ├── lib/
│   │   ├── db/                 # Drizzle ORM + database setup
│   │   ├── store/              # Zustand assessment store
│   │   ├── normative/          # Scoring engine (thresholds, ratings, insights)
│   │   ├── ai/                 # OpenAI prompts and field mappings
│   │   ├── csv/                # Import/export logic
│   │   └── [utils]/            # Helpers (section-completion, section-markers, etc.)
│   └── types/                  # TypeScript interfaces for assessment, normative data, API
├── public/                     # Static assets (images)
├── .planning/codebase/         # Generated analysis documents
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── tailwind.config.js          # Tailwind theming (if present)
└── local.db                    # SQLite database (dev only; .gitignored)
```

## Directory Purposes

**`src/app/`:**
- Purpose: Next.js App Router entry points for pages and API routes
- Contains: .tsx page files and route.ts handlers
- Key files: `layout.tsx` (root), `page.tsx` (dashboard), `globals.css` (theme)

**`src/app/assessment/[id]/section/[num]/page.tsx`:**
- Purpose: Dynamic route for each of 11 assessment sections
- Contains: Single SectionPage component that dynamically loads section 1–11 based on [num] param
- Exports: useAssessmentStore, handles auto-save, navigation, completion checking

**`src/app/api/assessments/`:**
- Purpose: CRUD operations on assessments and section data
- Files:
  - `route.ts` — GET all assessments, POST new assessment
  - `[id]/route.ts` — GET single assessment with metadata
  - `[id]/sections/[num]/route.ts` — GET/PUT section data (core persistence endpoint)
  - `export/route.ts` — CSV export
  - `import/route.ts` — CSV import

**`src/app/api/ai/`:**
- Purpose: Document extraction and verification workflows
- Files:
  - `extract/route.ts` — Upload file, call GPT-4o, return extracted fields + warnings
  - `verify/route.ts` — Second-pass confidence scoring on extracted values
  - `client-assessment/route.ts` — AI-generated assessment narratives (if implemented)

**`src/components/sections/`:**
- Purpose: 11 section-specific form components
- Files: `Section1.tsx` through `Section11.tsx` (no Section10 currently)
- Pattern: Each receives `SectionProps` interface with `data`, `onChange`, `assessmentId`
- Exports: Default function component

**`src/components/forms/`:**
- Purpose: Reusable form input primitives
- Files:
  - `FormField.tsx` — Text/email/tel/date input with label, validation
  - `SelectField.tsx` — Dropdown select
  - `RadioGroup.tsx` — Radio button group
  - `SliderField.tsx` — Range slider with thumb styling
  - `TextareaField.tsx` — Multiline text input
  - `SignaturePad.tsx` — Canvas-based signature capture
  - `FileUploadZone.tsx` — Drag-drop file upload with progress stages
  - `ExtractedValuesPanel.tsx` — Review UI for AI extraction with confidence badges
  - `FormRow.tsx` — Grid wrapper for responsive field layout

**`src/components/layout/`:**
- Purpose: Structural UI components for page framing
- Files:
  - `AppShell.tsx` — Conditional sidebar renderer (hides during assessment)
  - `Header.tsx` — Top nav bar with assessment progress and sync status
  - `Sidebar.tsx` — Left navigation (dashboard, assessments, clients, logout)
  - `ProgressBar.tsx` — Section indicator showing 1/11, 2/11, etc. and completed checkmarks
  - `NavigationButtons.tsx` — Next/Previous/Save & Exit/Cancel buttons at bottom

**`src/components/ui/`:**
- Purpose: Display-only components for semantic meaning
- Files:
  - `SectionHeader.tsx` — Title + description for each section
  - `TestCategory.tsx` — Grouped biomarker display (e.g., "Lipid Panel")
  - `Badge.tsx` — Tier badge showing rating (poor/cautious/normal/great/elite)
  - `ValdResultCard.tsx` — Fitness test result card
  - `WarningBox.tsx` — Alert box for extraction warnings

**`src/lib/db/`:**
- Purpose: Database initialization and schema
- Files:
  - `schema.ts` — Drizzle table definitions (assessments, assessment_sections, signatures, uploaded_files)
  - `schema-sqlite.ts` — SQLite-specific schema variant (if manual migration needed)
  - `index.ts` — Proxy db object, runtime detection of Postgres vs SQLite, migration logic

**`src/lib/store/`:**
- Purpose: Client-side state management
- Files:
  - `assessment-store.ts` — Zustand store with section data, dirty flags, completion status
- Exports: `useAssessmentStore()` hook

**`src/lib/normative/`:**
- Purpose: Scoring, thresholds, and insights for the rating system
- Files:
  - `data.ts` — Thresholds for 5 tiers per biomarker and fitness test (blood_tests, fitness, body_composition)
  - `ratings.ts` — Functions to compute tier from value: `getPeak360Rating()`, `getStandards()`
  - `insights.ts` — Generate human-readable insight text based on rating and client profile

**`src/lib/ai/`:**
- Purpose: OpenAI integration for document extraction
- Files:
  - `prompts.ts` — System prompts for GPT-4o extraction (blood tests, body composition)
  - `field-mappings.ts` — Lookup table mapping user/doc field names to canonical camelCase IDs (e.g., "Total Cholesterol" → "cholesterolTotal")

**`src/lib/csv/`:**
- Purpose: Import/export assessment data
- Files:
  - `columns.ts` — Definition of CSV columns for export
  - `export.ts` — Generate CSV from assessment records
  - `import.ts` — Parse CSV and populate assessments

**`src/types/`:**
- Purpose: TypeScript interfaces for all major data structures
- Files:
  - `assessment.ts` — ClientInfo, DailyReadiness, MedicalScreening, BloodTests, BodyComposition, etc. (interfaces for each section)
  - `normative.ts` — RatingTier, TierRanges, RatingResult, NormativeData
  - `api.ts` — API request/response envelopes

## Key File Locations

**Entry Points:**
- `src/app/page.tsx` — Dashboard/landing (fetch assessments, display stats, action items)
- `src/app/assessment/[id]/section/[num]/page.tsx` — Assessment section form (11 variants)
- `src/app/layout.tsx` — HTML root, metadata, AppShell wrapper

**Configuration:**
- `package.json` — Dependencies, scripts (dev, build, test, db:push, db:generate)
- `src/app/globals.css` — Tailwind theme with navy/gold tokens
- `tsconfig.json` — TypeScript settings

**Core Logic:**
- `src/lib/store/assessment-store.ts` — Zustand store state machine
- `src/lib/db/schema.ts` — Drizzle table definitions
- `src/lib/normative/ratings.ts` — Tier computation engine
- `src/lib/section-completion.ts` — Section validation rules

**Testing:**
- `src/__tests__/` — Vitest test files (sections, forms, store, normative, types)
- `vitest.config.ts` or `vite.config.ts` — Vitest configuration (if present)

## Naming Conventions

**Files:**
- PascalCase for React components: `Section1.tsx`, `FormField.tsx`, `ProgressBar.tsx`
- camelCase for utilities and logic files: `assessment-store.ts`, `section-completion.ts`, `field-mappings.ts`
- Index files: `schema.ts`, `index.ts` for module entry points

**Directories:**
- Plural nouns for container directories: `src/components/sections/`, `src/components/forms/`, `src/lib/normative/`
- Dynamic segments: `[id]`, `[num]`, `[name]` for Next.js route params
- API route directories match REST resources: `/api/assessments/`, `/api/ai/`

**Variables & Functions:**
- camelCase for variables and functions: `sectionData`, `handleChange`, `getPeak360Rating()`
- SCREAMING_SNAKE_CASE for constants: `REQUIRED_FIELDS`, `MIN_FILLED`, `VISIBLE_SECTIONS`
- TypeScript interfaces/types: PascalCase: `Assessment`, `SectionProps`, `RatingTier`

**Field IDs (form fields):**
- camelCase for field identifiers: `clientName`, `cholesterolTotal`, `sleepQuality`
- Prefixes for organization: `client*` for section 1, `blood*` for tests (if consistency desired)

## Where to Add New Code

**New Feature (e.g., new assessment section):**
1. Define TypeScript interface in `src/types/assessment.ts`
2. Create component `src/components/sections/Section[N].tsx` receiving `SectionProps`
3. Add required fields check in `src/lib/section-completion.ts` if applicable
4. Section page already routes dynamically via `[num]` param; no routing changes needed
5. Tests: Add to `src/__tests__/sections/sections.test.tsx`

**New Biomarker/Rating:**
1. Add thresholds to `src/lib/normative/data.ts` with 5-tier ranges
2. Add field mapping alias in `src/lib/ai/field-mappings.ts` (e.g., "Total Cholesterol" → "cholesterolTotal")
3. Add insight playbook in `src/lib/normative/insights.ts` for human-readable feedback
4. Update `src/components/sections/Section5.tsx` or `Section11.tsx` UI to display marker
5. Add TypeScript interface field in `src/types/assessment.ts` BloodTests interface

**New Form Component:**
1. Create in `src/components/forms/[ComponentName].tsx`
2. Follow `FormField.tsx` pattern: props interface, label + input, Tailwind styling
3. Emit change events via `onChange` callback
4. Use in section component via standard pattern: `onChange((v) => onChange('fieldId', v))`

**New API Endpoint:**
1. Create `src/app/api/[resource]/route.ts` or `src/app/api/[resource]/[id]/route.ts`
2. Export named handlers: `GET`, `POST`, `PUT`, `DELETE` as needed
3. Use Drizzle ORM for queries via `import { db } from '@/lib/db'`
4. Return `NextResponse.json({ success: bool, data?: any, error?: string })`
5. Handle errors with try/catch and return appropriate status codes

**Utilities/Helpers:**
- Shared functions: `src/lib/utils/[domain].ts` (e.g., `lib/utils/date-helpers.ts`)
- Database queries: Inline in route handlers or extract to `src/lib/db/queries.ts` if complex
- Type-safe field access: Leverage TypeScript interfaces; no raw type casts

## Special Directories

**`src/__tests__/`:**
- Purpose: Vitest test files mirroring src structure
- Generated: No (manually written)
- Committed: Yes
- Pattern: `*.test.tsx` or `*.test.ts` files
- Example: `src/__tests__/sections/sections.test.tsx`

**`public/`:**
- Purpose: Static assets served by Next.js
- Generated: No (user-managed)
- Committed: Yes
- Contains: Images, icons, etc.

**`local.db` (development only):**
- Purpose: SQLite database file when DATABASE_URL env var absent
- Generated: Yes (by first run of dev server)
- Committed: No (.gitignored)
- Manages: Assessment records, section data, signatures

**`.next/`:**
- Purpose: Next.js build artifacts
- Generated: Yes (by `npm run build`)
- Committed: No (.gitignored)
- Contains: Compiled pages, server functions, static exports

**`.planning/codebase/`:**
- Purpose: Generated analysis documents for GSD orchestration
- Generated: Yes (by map-codebase command)
- Committed: Yes (reference documentation)
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, etc.

---

*Structure analysis: 2026-03-29*
