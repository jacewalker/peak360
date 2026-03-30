# Architecture

**Analysis Date:** 2026-03-29

## Pattern Overview

**Overall:** Next.js App Router with three-layer pattern: Presentation (React components), API Layer (Next.js route handlers), Data/Logic Layer (Zustand store + Drizzle ORM).

**Key Characteristics:**
- Form-driven workflow spanning 11 sequential sections with automatic state synchronization
- Client-side state management with server-side persistence (auto-save pattern)
- AI-powered document extraction as middleware layer (OpenAI GPT-4o for images/PDFs/CSV)
- Normative rating system with 5-tier scoring applied to biomarkers and fitness metrics
- Responsive assessment lifecycle from creation → section completion → final report generation

## Layers

**Presentation Layer:**
- Purpose: Render section forms, navigation, layouts, and reports to users
- Location: `src/app/` (page routes), `src/components/`
- Contains: React Server Components (layouts), Client Components (forms with state), UI primitives
- Depends on: Zustand store, API routes, TypeScript interfaces
- Used by: Browser/Next.js runtime

**State Management Layer:**
- Purpose: Hold form state in memory, track dirty flags, trigger auto-saves, manage completion status
- Location: `src/lib/store/assessment-store.ts`
- Contains: Zustand store with section data, assessment metadata, save status
- Depends on: React hooks, Zustand
- Used by: All section components via `useAssessmentStore()`

**API Layer (Server):**
- Purpose: Bridge between client and database; handle CRUD, AI extraction, validation
- Location: `src/app/api/`
- Contains: Next.js route handlers for assessments, sections, AI extraction/verification, auth
- Depends on: Drizzle ORM, OpenAI SDK, database
- Used by: Client fetch calls, server-side operations

**Data/Logic Layer:**
- Purpose: Compute ratings, manage normative thresholds, validate section completeness, export data
- Location: `src/lib/normative/`, `src/lib/db/`, `src/lib/ai/`, `src/lib/csv/`
- Contains: Rating engine, field mappings, database schema, CSV conversion logic
- Depends on: TypeScript types, database schema
- Used by: API layer and server-side calculations

**Database Layer:**
- Purpose: Persist assessments, sections, signatures, and extracted AI data
- Location: `src/lib/db/schema.ts`, `local.db` (SQLite) or `DATABASE_URL` (Postgres)
- Contains: Four tables with referential integrity and JSON columns for flexible section data
- Depends on: Drizzle ORM, better-sqlite3 or node-postgres driver
- Used by: API layer via db proxy

## Data Flow

**Assessment Creation & Navigation:**

1. User clicks "+ New Assessment" on dashboard (`/`)
2. POST `/api/assessments` → generates UUID, creates empty row in `assessments` table
3. Redirects to `/assessment/{id}/section/1` (Section1.tsx)
4. Page mounts, loads store and fetches current section data + completed sections list
5. User fills form fields → `onChange` updates Zustand store, marks `isDirty = true`

**Auto-Save Loop (1-second debounce):**

1. User changes field → store updates immediately (optimistic)
2. `useEffect` detects `isDirty` flag
3. Debounce timer starts (1000ms)
4. If user keeps typing, timer resets
5. After 1s idle: PUT `/api/assessments/{id}/sections/{num}` with form data
6. Server upserts `assessment_sections` row, syncs client info to `assessments` record
7. `lastSaved` timestamp updates in store

**Page Unload Safety:**

- `beforeunload` event listener uses `navigator.sendBeacon()` to POST unsaved changes
- Beacon fires even if user closes tab/navigates away
- Ensures no data loss in case of unexpected exit

**Section Navigation:**

1. User clicks "Next" or "Previous" button
2. Calls `saveSection(true)` → forces API save and checks completion status via `isSectionComplete()`
3. If complete, marks section in `completedSections` array
4. Redirects to next/previous section URL
5. New section page fetches its data and populates form

**AI Document Extraction (Sections 5 & 6):**

1. User drops file → `FileUploadZone` component
2. POST `/api/ai/extract` with FormData containing file + assessmentId + sectionNumber
3. Backend:
   - Converts image/PDF to base64 for GPT-4o vision API
   - Sends extraction prompt to OpenAI (section-specific: blood tests vs body composition)
   - Receives JSON with `fields`, `documentType`, `quality`, `qualityNotes`
   - Normalizes field keys using `fieldMappings` (e.g., "Total Cholesterol" → "cholesterolTotal")
   - Runs quality checks: unreadable, wrong document type, low field match rate
4. Returns warnings array + extracted fields
5. Frontend shows processing stages: uploading → reading → interpreting
6. If no critical errors: POST `/api/ai/verify` for confidence scoring
7. Shows extracted values panel with per-field confidence badges
8. User clicks accept → values merged into form data and auto-saved

**Report Generation (Section 11):**

1. Page loads Section11 component without form data
2. Fetches all previous sections' data from store/API
3. Computes ratings for biomarkers using `getPeak360Rating(testKey, value, age, gender)`
4. Generates insights using `generatePeak360Insights(section, rating, clientInfo)`
5. Renders HTML report with charts (Recharts), ratings, and recommendations
6. User clicks print → browser print dialog
7. CSS class `.no-print` hides controls, PDF renders cleanly

**State Management:**

- **Client-side:** Zustand store holds `sectionData[section]` as partial record of unknown
- **Server-side:** `assessment_sections.data` column stores full section as JSON blob
- **Sync strategy:** Store is source of truth during session; PUT commits to DB; GET on page load restores from DB
- **Completion tracking:** Separate `completedSections` array in store, persisted in assessment metadata

## Key Abstractions

**SectionProps:**
- Purpose: Standard interface for all section components to receive data and handlers
- Examples: `src/components/sections/Section1.tsx` through `Section11.tsx`
- Pattern: `{ data: Record<string, unknown>, onChange: (field, value) => void, assessmentId: string }`
- Allows decoupling section UI from data management

**Assessment Record:**
- Purpose: Metadata envelope for a client's complete assessment lifecycle
- Examples: Client name, gender, DOB synced from Section 1; current section tracking; status (in_progress/completed)
- Pattern: Top-level row in `assessments` table; linked to multiple section data rows via foreign key

**Assessment Section Record:**
- Purpose: Store unstructured section form data as JSON blob with completion timestamp
- Examples: Blood test values (Section 5), body composition (Section 6), readiness scores (Section 2)
- Pattern: One row per section per assessment; `data` column is JSONB with flexible shape

**File Upload Pipeline:**
- Purpose: Mediate AI extraction with quality gates and user feedback
- Examples: `FileUploadZone` (drop zone UI), `ExtractedValuesPanel` (review UI)
- Pattern: Three stages (uploading→reading→interpreting), error/warning handling, confidence display

**Normative Rating System:**
- Purpose: Map test values to 5-tier labels (poor/cautious/normal/great/elite) based on age/gender/test-type
- Examples: `normativeData` object with marker-specific ranges; `getPeak360Rating()` resolver function
- Pattern: Lookup thresholds, find matching range, return tier + color/label from `TIER_COLORS`

## Entry Points

**Landing Page:**
- Location: `src/app/page.tsx`
- Triggers: User visits `/`
- Responsibilities: Display dashboard stats (total, incomplete, completed, clients), show action items (stuck assessments), list recent assessments, button to create new assessment

**Assessment Section Page:**
- Location: `src/app/assessment/[id]/section/[num]/page.tsx`
- Triggers: User navigates to `/assessment/{uuid}/section/{1-11}`
- Responsibilities: Load section component, manage auto-save, handle navigation, restore state from API

**Assessment Layout:**
- Location: `src/app/assessment/[id]/layout.tsx`
- Triggers: Wraps all section pages under `/assessment/[id]/**`
- Responsibilities: Render Header with assessment metadata, provide consistent nav context

**API: GET /api/assessments**
- Triggers: Dashboard load, clients page load
- Returns: Array of all assessments ordered by recency
- Used for: Listing in dashboard, computing client aggregates

**API: POST /api/assessments**
- Triggers: User clicks "New Assessment"
- Returns: New assessment UUID
- Used for: Creating empty assessment record and redirecting to section 1

**API: PUT /api/assessments/[id]/sections/[num]**
- Triggers: Auto-save on 1s debounce OR page unload via sendBeacon
- Returns: 200 success
- Used for: Persisting section data + syncing client info from section 1

**API: POST /api/ai/extract**
- Triggers: User uploads file to section 5 or 6
- Returns: Extracted fields + quality warnings
- Used for: AI document processing with quality gates

**API: POST /api/ai/verify**
- Triggers: After successful extraction, before showing values panel
- Returns: Per-field confidence scores
- Used for: Second-pass validation and user confidence display

## Error Handling

**Strategy:** Graceful degradation with user feedback. Network errors show retry UI; extraction failures show error messages with guidance; invalid completeness still allows forward navigation (soft validation).

**Patterns:**

- **API Errors:** Caught in fetch `.catch()` handlers; show error toast/message; allow user to retry
- **Extraction Warnings:** Non-blocking warnings (low quality, wrong doc) show as alert text; blocking warnings (unreadable, no data) prevent acceptance and show error state
- **Form Validation:** Section completion checked on navigation via `isSectionComplete()` but doesn't block progress (soft gate)
- **Database Integrity:** Foreign keys cascade delete; null JSON values default to empty object on read
- **Network Offline:** `sendBeacon` on unload ensures saves attempt even in degraded conditions

## Cross-Cutting Concerns

**Logging:** Console.error in API error handlers (OpenAI extraction, DB errors); no centralized logging service configured.

**Validation:**
- Server-side: `isSectionComplete()` checks required fields per section type
- AI: Extraction API validates field relevance and document type matching
- Client-side: FormField components require HTML5 validation (type, required, min/max)

**Authentication:** Not implemented; assumes self-hosted coach usage. Middleware stub present at `src/middleware.ts` for future auth layer.

**Styling:** Tailwind CSS v4 with `@theme inline` custom tokens (navy/gold color scheme); consistent spacing scale (0.5rem–16rem); responsive breakpoints (sm:, lg:)

**State Persistence:** Dual model—Zustand in-memory for session speed; DB for durability. On page reload, Zustand refetches from API to restore state. On unload, sendBeacon ensures final save.

---

*Architecture analysis: 2026-03-29*
