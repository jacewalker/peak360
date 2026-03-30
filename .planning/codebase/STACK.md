# Technology Stack

**Analysis Date:** 2026-03-29

## Languages

**Primary:**
- TypeScript 5 - Core application logic, type-safe development
- JavaScript - Build configuration files (.mjs, .ts files executed as ESM)
- JSX/TSX - React component syntax throughout `src/components/` and `src/app/`

**Secondary:**
- HTML5 - Canvas-based signature pads, PDF generation
- CSS3 - Tailwind CSS classes for styling

## Runtime

**Environment:**
- Node.js - Backend runtime for Next.js API routes and database operations
- Browser - Client-side React application (ES2017+ JavaScript)

**Package Manager:**
- npm - Dependency management
- Lockfile: `package-lock.json` present (npm v9+ format)

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack React framework with App Router, TypeScript support
- React 19.2.3 - UI component library
- React DOM 19.2.3 - DOM rendering

**Styling:**
- Tailwind CSS 4 - Utility-first CSS framework with `@tailwindcss/postcss` plugin
- PostCSS 8 - CSS transformation pipeline via `postcss.config.mjs`

**State Management:**
- Zustand 5.0.11 - Client-side form state management with auto-save debouncing

**Database/ORM:**
- Drizzle ORM 0.45.1 - SQL query builder and schema management
- better-sqlite3 12.6.2 - SQLite database driver with WAL mode support
- pg 8.18.0 - PostgreSQL driver (optional, selected via `DATABASE_URL` env var)

**Testing:**
- Vitest 4.0.18 - Unit test runner with jsdom environment
- jsdom 28.1.0 - DOM simulation for browser-like testing
- @testing-library/react 16.3.2 - React component testing utilities
- @testing-library/jest-dom 6.9.1 - Custom DOM matchers
- @testing-library/user-event 14.6.1 - User interaction simulation

**Build & Dev Tools:**
- Turbopack - Next.js bundler (enabled via dev mode)
- ESLint 9 - Code linting with Next.js presets
- eslint-config-next - Next.js + TypeScript ESLint rules

**Document Generation:**
- jsPDF 4.2.0 - PDF generation from canvas and HTML
- html2canvas-pro 2.0.0 - HTML to canvas rendering for PDF export

**Data Visualization:**
- Recharts 3.8.0 - React charting library for assessment trends

**Utilities:**
- uuid 13.0.0 - UUID v4 generation for assessment IDs
- OpenAI SDK 6.22.0 - OpenAI API client for GPT-4o integration

## Key Dependencies

**Critical:**
- openai 6.22.0 - Used for document extraction (vision) and biomarker verification via GPT-4o
- better-sqlite3 12.6.2 - Local database persistence (primary in development)
- drizzle-orm 0.45.1 - Type-safe database queries with schema management

**Infrastructure:**
- drizzle-kit 0.31.9 - Database migrations and schema tooling
- jspdf 4.2.0 - Section 11 (Complete Longevity Analysis) PDF report generation
- html2canvas-pro 2.0.0 - Canvas rendering for PDF section screenshots
- recharts 3.8.0 - Dashboard trends visualization (clients page)

## Configuration

**Environment:**
- `.env.local` - Local environment variables (existence confirmed, secrets not read)
- Database selection: Uses `DATABASE_URL` presence to select PostgreSQL vs SQLite
  - If `DATABASE_URL` exists → PostgreSQL via `pg` driver
  - If `DATABASE_URL` missing → SQLite via `better-sqlite3` driver at `local.db`

**Build:**
- `next.config.ts` - Next.js configuration:
  - `output: 'standalone'` - Enables self-contained production builds
  - `serverExternalPackages: ['better-sqlite3']` - Allows better-sqlite3 as server-only package
- `tsconfig.json` - TypeScript compiler options:
  - `target: ES2017` - ECMAScript 2017 compatibility
  - `module: esnext` - ES module syntax
  - `paths: { "@/*": "./src/*" }` - Path alias for imports
- `postcss.config.mjs` - PostCSS pipeline with Tailwind CSS v4 plugin
- `drizzle.config.ts` - Database schema and migration configuration:
  - Supports both SQLite and PostgreSQL dialects
  - Schema file: `src/lib/db/schema-sqlite.ts` (SQLite) or `src/lib/db/schema.ts` (PostgreSQL)

**Linting:**
- `eslint.config.mjs` - ESLint configuration:
  - Extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
  - Ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`

**Testing:**
- `vitest.config.ts` - Vitest configuration:
  - `environment: 'jsdom'` - Browser-like test environment
  - `setupFiles: ['./src/__tests__/setup.tsx']` - Test setup
  - `include: 'src/**/*.test.{ts,tsx}'` - Test file pattern
  - Path alias configured to match tsconfig

## Database

**Local Development:**
- SQLite 3 via better-sqlite3
- File location: `local.db`
- WAL (Write-Ahead Logging) mode enabled for concurrency
- Foreign keys enforced at database level
- Tables: `assessments`, `assessment_sections`, `signatures`, `uploaded_files`

**Production/Optional:**
- PostgreSQL via `pg` driver
- Activated when `DATABASE_URL` environment variable is set
- Same schema structure, uses JSONB for JSON columns instead of TEXT

## Platform Requirements

**Development:**
- Node.js (version not pinned in `.nvmrc`, inferred from `@types/node: ^20`)
- npm (included with Node.js)
- SQLite3 libraries (bundled with better-sqlite3)

**Production:**
- Node.js runtime compatible with ES2017
- SQLite3 libraries (if using SQLite) or PostgreSQL client libraries (if using PostgreSQL)
- Standalone build output from Next.js (no separate build artifacts needed)

---

*Stack analysis: 2026-03-29*
