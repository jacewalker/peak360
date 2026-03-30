# External Integrations

**Analysis Date:** 2026-03-29

## APIs & External Services

**Document & Biomarker Processing:**
- OpenAI GPT-4o - AI-powered document extraction and verification
  - SDK: `openai` 6.22.0
  - Auth: Environment variable `OPENAI_API_KEY`
  - Endpoints:
    - `POST /api/ai/extract` - Extracts biomarker/body composition values from medical documents (images, PDFs, CSV, TXT)
    - `POST /api/ai/verify` - Second-pass confidence scoring and field validation
  - Models: `gpt-4o` for vision (images/PDFs) and text processing
  - Temperature: 0.1 (deterministic)
  - Response format: JSON

## Data Storage

**Databases:**
- **SQLite (Primary):**
  - Client: `better-sqlite3` 12.6.2
  - Connection: File-based at `local.db`
  - ORM: `drizzle-orm` 0.45.1
  - Features: WAL mode, foreign key constraints enabled
  - Migrations: Via `drizzle-kit`

- **PostgreSQL (Optional):**
  - Client: `pg` 8.18.0
  - Connection: Via `DATABASE_URL` environment variable
  - ORM: `drizzle-orm` 0.45.1 with PostgreSQL dialect
  - Activated: When `DATABASE_URL` is set
  - Features: JSONB columns, cascading deletes

**File Storage:**
- Canvas data URLs - Signature pads stored as base64 data URLs in `signatures.signature_data` (TEXT column)
- Uploaded files - Medical documents tracked in `uploaded_files` table with:
  - `file_name` - Original filename
  - `extracted_data` - JSON object with extracted biomarker values
  - `verification_result` - JSON object with confidence scores and validation results
  - `status` - Extraction status ('pending', 'extracting', 'completed')

**Caching:**
- Not explicitly integrated
- Client-side form state debounced with 1-second auto-save via Zustand

## Authentication & Identity

**Auth Provider:**
- Custom implementation
- Approach: Simple HTTP-Only cookie-based authentication
  - Location: `src/app/api/auth/login/route.ts`
  - Mechanism: `ADMIN_PASSWORD` environment variable verified against form submission
  - Cookie: `peak360_auth` set on successful login
  - Cookie settings: Secure flag when `NODE_ENV === 'production'`, HttpOnly
  - Middleware: `src/middleware.ts` validates cookie for protected routes

## Monitoring & Observability

**Error Tracking:**
- Not explicitly integrated (no Sentry, Datadog, etc.)
- Console.error() used in API routes for local logging

**Logs:**
- Standard console logging in Node.js backend
- No centralized log aggregation detected
- Error messages logged to server console in API route error handlers

## CI/CD & Deployment

**Hosting:**
- Not specified in codebase
- Next.js `output: 'standalone'` suggests deployment-agnostic setup (Vercel, self-hosted, Docker, etc.)

**CI Pipeline:**
- Not detected in codebase
- GitHub presence (`git repo confirmed`) but no `.github/workflows/` in analysis scope

## Environment Configuration

**Required env vars for AI:**
- `OPENAI_API_KEY` - OpenAI API key for GPT-4o access

**Required env vars for Auth:**
- `ADMIN_PASSWORD` - Password for login authentication (checked in `src/app/api/auth/login/route.ts`)

**Optional env vars:**
- `DATABASE_URL` - PostgreSQL connection string (if provided, switches from SQLite to PostgreSQL)
- `NODE_ENV` - Set to 'production' for secure cookie handling

**Secrets location:**
- `.env.local` file present (local development)
- Production secrets loaded from environment at runtime
- No inline secrets in codebase

## Webhooks & Callbacks

**Incoming:**
- Not applicable - No webhook receivers detected

**Outgoing:**
- Not applicable - No webhook senders detected
- AI extraction is request-response only (no webhooks to OpenAI or similar)

## Data Flow: Document Extraction Pipeline

1. User uploads file to Section 5 (Blood Tests) or Section 6 (Body Composition) UI
2. Frontend sends `FormData` with file to `POST /api/ai/extract`
3. Backend:
   - Records file in `uploaded_files` table with status='extracting'
   - Converts file to base64 (images/PDFs) or reads as text (CSV/TXT)
   - Sends to OpenAI GPT-4o with system prompt and user message
   - Receives JSON response with extracted fields and document type
   - Normalizes field keys using `fieldMappings` from `src/lib/ai/field-mappings.ts`
   - Performs validation: checks quality, document type mismatch, field relevance
   - Updates file record with `extracted_data` and validation `warnings`
4. Frontend displays extracted values with review/edit UI
5. User triggers `POST /api/ai/verify` to get confidence scores
6. Backend sends extracted fields to GPT-4o for verification with verification system prompt
7. Receives confidence scores, updates file record with `verification_result`
8. Frontend shows confidence per field, allows manual edits
9. User accepts values → form fields updated and auto-saved to `assessment_sections` via Zustand store

## Assessment Data Persistence

**Flow:**
1. User fills form → Zustand store updates immediately (optimistic)
2. Auto-save (1s debounce) triggers `PUT /api/assessments/[id]/sections/[num]`
3. Backend saves JSON blob to `assessment_sections.data` column
4. On page unload, `navigator.sendBeacon` ensures unsaved changes are persisted
5. Section 1 client info syncs back to `assessments` table (metadata denormalization)

**Tables:**
- `assessments` - One per assessment, stores client metadata and current section
- `assessment_sections` - One row per section per assessment, stores section data as JSON
- `signatures` - Canvas signatures for client and coach sign-off
- `uploaded_files` - AI extraction results and verification confidence

## Export & Import

**Export:**
- `GET /api/assessments/export` - Returns CSV export of all assessments
- Uses `exportCsv()` from `src/lib/csv/export.ts`
- Triggers database migrations before export
- Content-Type: `text/csv; charset=utf-8`
- Filename: `peak360-export-[YYYY-MM-DD].csv`

**Import:**
- Endpoint: `POST /api/assessments/import` (exists in routing but implementation not analyzed)

## Assessment Report Generation

**Section 11 PDF Output:**
- Uses `jsPDF` 4.2.0 for PDF creation
- Uses `html2canvas-pro` 2.0.0 to render section screenshots
- Generates multi-page PDF with assessment results, ratings, and insights
- Downloaded to user's device

---

*Integration audit: 2026-03-29*
