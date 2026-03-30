# Coding Conventions

**Analysis Date:** 2026-03-29

## Naming Patterns

**Files:**
- Components: PascalCase (`Section1.tsx`, `FormField.tsx`, `SectionHeader.tsx`)
- Utilities/modules: camelCase (`assessment-store.ts`, `normative/ratings.ts`)
- API routes: kebab-case (`/api/ai/extract`, `/api/assessments/[id]/sections/[num]`)

**Functions:**
- camelCase for all functions (`calculateAge`, `getFitnessAgeGroup`, `normalizeRating`)
- Handler functions: `handleX` pattern (`handleFileUpload`, `handleChange`)
- Getter/setter hooks: `useX` pattern (`useAssessmentStore`, `useRouter`)

**Variables:**
- camelCase for all variables and constants (`assessmentId`, `clientName`, `isDirty`)
- State variables with descriptive names (`processingStage`, `extractedFields`, `errorMessage`)
- Boolean flags: `isX` or `hasX` pattern (`isDirty`, `isSaving`)

**Types:**
- PascalCase for interfaces and types (`SectionProps`, `ClientInfo`, `BloodTests`, `Assessment`)
- Union/literal types lowercase (`'male' | 'female'`, `'poor' | 'cautious' | 'normal' | 'great' | 'elite'`)

**Form Field IDs:**
- camelCase matching field names from TypeScript interfaces (`clientName`, `cholesterolTotal`, `bodyFatPercent`, `crpHs`)

## Code Style

**Formatting:**
- Tool: Prettier (implicit from Next.js project setup)
- Line length: Flexible (examples show 80-100+ char lines)
- Indentation: 2 spaces
- Semicolons: Always included

**Linting:**
- Tool: ESLint
- Config: `eslint.config.mjs` using `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Enforces Next.js and TypeScript best practices

## Import Organization

**Order:**
1. React imports (`import { useState, useEffect } from 'react'`)
2. Next.js imports (`import { useRouter } from 'next/navigation'`, `import Link from 'next/link'`)
3. Type imports (`import type { SectionProps } from '@/app/assessment/[id]/section/[num]/page'`)
4. Local imports (`import SectionHeader from '@/components/ui/SectionHeader'`)
5. Utility/lib imports (`import { db } from '@/lib/db'`, `import { getPeak360Rating } from '@/lib/normative/ratings'`)
6. Store imports (`import { useAssessmentStore } from '@/lib/store/assessment-store'`)

**Path Aliases:**
- `@/*` maps to `./src/*` (defined in `tsconfig.json`)
- All internal imports use `@/` alias (never relative paths like `../../../`)
- Examples: `@/types/assessment`, `@/components/forms/FormField`, `@/lib/db`

**Use `type` imports:**
- Always use `import type { ... }` for TypeScript types and interfaces
- Example: `import type { SectionProps, Assessment } from '@/types/assessment'`

## Error Handling

**Patterns:**
- **API routes**: Return explicit error responses with status codes
  - 400: Validation errors (missing required data)
  - 401: Authentication errors
  - 404: Not found
  - 500: Server errors
  - Example from `/api/assessments/[id]/route.ts`: `if (!row) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })`

- **Client components**: Use state for error messages
  - Example from `Section5.tsx`: `setErrorMessage(...)` and display via conditional rendering
  - Pattern: `if (errorCondition) { setErrorMessage(msg); setProcessingStage('error'); }`

- **Validation**: Defensive checks for null/undefined
  - Check before use: `if (!file)`, `if (!timelines || timelines.length === 0)`
  - Null coalescing: Use optional chaining `?.` and nullish coalescing `??`
  - Example: `const conf = verification?.fields?.[key]?.confidence || 'medium'`

- **No explicit error throwing**: Exceptions not thrown in application code; handled via NextResponse and state

## Logging

**Framework:** Built-in browser console (implicit, not explicitly configured)

**Patterns:**
- No logging statements found in codebase (minimal/debug approach)
- API responses use `NextResponse.json()` for structured responses
- Client-side debugging would use `console` if needed (not prevented)

## Comments

**When to Comment:**
- Inline comments rare in codebase; code is self-documenting
- Complex logic paths may have comments (e.g., multi-step async operations)
- Example from `Section5.tsx`: `// Check for blocking warnings (unreadable / no data with no fields)`

**JSDoc/TSDoc:**
- Not extensively used; interfaces are self-documenting via TypeScript
- Some complex functions have inline step comments
- Example: Comments describe processing stages and warning types

## Function Design

**Size:**
- Component functions: 50-200 lines common (includes JSX)
- Utility functions: 10-30 lines typical
- Large components split with sub-components (e.g., Section1-11 organized in separate files)

**Parameters:**
- Props passed via destructuring in component function signatures
- API routes use `{ params }: { params: Promise<{ id: string; num: string }> }` pattern for dynamic routes
- Arrow function callbacks preferred: `(v) => onChange('clientName', v)`

**Return Values:**
- Components return JSX
- API routes return `NextResponse.json({ success: boolean, data?: any, error?: string })`
- Utility functions return typed values: `Standards`, `RatingResult`, `{ tier: RatingTier; raw: string }`
- Null/undefined return with fallback often: `value ?? ''` or `value ?? 'default'`

## Module Design

**Exports:**
- Components: Default export (e.g., `export default function Section1(...)`)
- Types: Named exports (e.g., `export interface ClientInfo { ... }`)
- Constants: Named exports (e.g., `export const TOTAL_SECTIONS = 11`)
- Utilities: Named exports (e.g., `export function getPeak360Rating(...)`)

**Barrel Files:**
- Not extensively used; imports directly from source files
- Type definitions consolidated in `src/types/`
- Components organized by feature directory (`src/components/sections/`, `src/components/forms/`, `src/components/ui/`)

## Component Architecture

**Props Pattern (SectionProps):**
- All section components receive standardized props: `{ data, onChange, assessmentId }`
- `data`: Section-specific data object (typed by section)
- `onChange(fieldName, value)`: Callback to update store
- `assessmentId`: String ID for API calls
- Example from `Section1.tsx`: `export default function Section1({ data, onChange }: SectionProps)`

**Client Components:**
- Marked with `'use client'` directive (required for React 19 + Next.js App Router)
- All interactive form components are client components

**CSS Styling:**
- Tailwind CSS with custom theme colors (navy, gold, rating tiers)
- Colors defined in `src/app/globals.css` via `@theme inline`
- Utility classes: `space-y-6`, `px-3 py-2.5`, `border border-border`, `text-sm`, `font-medium`
- Custom color tokens: `text-navy`, `text-gold`, `bg-surface`, `border-border`

## Zustand Store Pattern

**Store Structure:**
- Single store instance: `useAssessmentStore` in `src/lib/store/assessment-store.ts`
- State shape: `{ assessmentId, currentSection, sectionData, completedSections, isDirty, isSaving, lastSaved, ...actions }`
- Action naming: `set/mark/reset` prefix (e.g., `setAssessmentId`, `markSectionCompleted`, `reset`)
- Accessed via `useAssessmentStore.getState()` in tests, hook pattern in components

**Auto-save Integration:**
- `onChange` handlers in components trigger `updateSectionField` → sets `isDirty = true`
- Debounced auto-save (1s) triggers PUT to `/api/assessments/[id]/sections/[num]`
- On save success: `setLastSaved(time)` which also sets `isDirty = false`

---

*Convention analysis: 2026-03-29*
