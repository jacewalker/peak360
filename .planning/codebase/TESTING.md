# Testing Patterns

**Analysis Date:** 2026-03-29

## Test Framework

**Runner:**
- Vitest 4.0.18
- Config: `vitest.config.ts`
- Environment: jsdom (browser-like)
- Setup file: `src/__tests__/setup.tsx` (runs before all tests)

**Assertion Library:**
- Vitest's built-in `expect()` (compatible with Jest API)
- Testing Library for component testing (`@testing-library/react 16.3.2`)

**Run Commands:**
```bash
npm run test              # Run all tests once
npm run test:watch       # Watch mode (re-run on changes)
```

## Test File Organization

**Location:**
- Co-located in `src/__tests__/` directory (separate from source, parallel structure)
- Subdirectories mirror source structure:
  - `src/__tests__/components/` → tests for `src/components/`
  - `src/__tests__/normative/` → tests for `src/lib/normative/`
  - `src/__tests__/sections/` → tests for `src/components/sections/`
  - `src/__tests__/store/` → tests for `src/lib/store/`
  - `src/__tests__/types/` → tests for `src/types/`
  - `src/__tests__/pages/` → tests for `src/app/`

**Naming:**
- Files named: `[module-name].test.ts` or `[module-name].test.tsx`
- Examples: `forms.test.tsx`, `assessment-store.test.ts`, `ratings.test.ts`

**Structure:**
```
src/__tests__/
├── setup.tsx                    # Vitest setup file (mocks Next.js modules)
├── components/
│   ├── forms.test.tsx           # All form component tests
│   └── layout.test.tsx          # All layout component tests
├── normative/
│   ├── data.test.ts             # Normative data tests
│   ├── insights.test.ts         # Insight generation tests
│   └── ratings.test.ts          # Rating calculation tests
├── sections/
│   └── sections.test.tsx        # Section component rendering tests
├── store/
│   └── assessment-store.test.ts # Zustand store tests
├── types/
│   ├── assessment.test.ts       # Assessment type constants
│   └── normative.test.ts        # Normative type tests
└── pages/
    └── home.test.tsx            # Home page component tests
```

## Test Structure

**Suite Organization:**

From `forms.test.tsx`:
```typescript
describe('FormField', () => {
  it('renders label and input', () => {
    // Single assertion per test
  });

  it('shows required asterisk', () => {
    // Verify visual feedback
  });

  // Multiple describe blocks for different components
});

describe('SelectField', () => {
  // Organized by component, not by concern
});
```

**Patterns:**
- One `describe()` block per component/function being tested
- Multiple `it()` blocks for different behaviors
- Descriptive test names: `'renders label and input'`, `'calls onChange when selection changes'`
- Tests are isolated and can run in any order

## Mocking

**Framework:** Vitest's `vi` API

**Setup File Pattern (src/__tests__/setup.tsx):**
```typescript
// Mock Next.js modules globally
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({}),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, priority, ...rest } = props;
    void fill;
    void priority;
    return <img {...rest} />;
  },
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: ...) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Global mocks
global.fetch = vi.fn();
Object.defineProperty(navigator, 'sendBeacon', {
  value: vi.fn(),
  writable: true,
});
```

**Component Test Mocking (forms.test.tsx):**
```typescript
// Mock callbacks
const onChange = vi.fn();
render(<FormField id="test" label="Test" value="" onChange={onChange} />);

// Verify callback invoked
fireEvent.change(screen.getByLabelText('Test'), { target: { value: 'hello' } });
expect(onChange).toHaveBeenCalledWith('hello');
```

**Page Test Mocking (home.test.tsx):**
```typescript
// Mock fetch globally
vi.mocked(fetch).mockResolvedValueOnce({
  json: () => Promise.resolve({ data: [] }),
} as Response);

render(<HomePage />);
// Assert rendering/behavior
```

**What to Mock:**
- Next.js navigation hooks (useRouter, useParams, usePathname)
- Next.js image and link components
- Global fetch API
- Browser APIs (navigator.sendBeacon)
- External API calls (optional, depending on test scope)

**What NOT to Mock:**
- Component internals (test component behavior as-is)
- Zustand store (test store + components together)
- React hooks (useState, useEffect, etc.)
- Drizzle ORM (avoid in client tests; test API routes separately)

## Fixtures and Factories

**Test Data:**

From `home.test.tsx`:
```typescript
// Inline test data objects
const assessmentData = {
  id: 'test-1',
  clientName: 'John Smith',
  assessmentDate: '2026-02-21',
  currentSection: 5,
  status: 'in_progress',
  createdAt: '2026-02-21T10:00:00Z',
};

// Reusable options arrays
const options = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
];
```

From `assessment-store.test.ts`:
```typescript
// Zustand store uses getState() with inline objects
useAssessmentStore.getState().setSectionData(1, { clientName: 'John' } as Record<string, unknown>);
```

**Location:**
- Fixtures inline within test files (no separate fixtures directory)
- Simple test data objects created fresh in each test
- Setup method pattern for store tests:
  ```typescript
  beforeEach(() => {
    useAssessmentStore.getState().reset();
  });
  ```

## Coverage

**Requirements:** Not enforced (no coverage configuration in `vitest.config.ts`)

**View Coverage:**
- Not currently configured; to enable, add coverage option to vitest.config.ts

**Coverage Status (estimated from test count):**
- 10 test files, ~1,353 total test assertions
- Core areas tested: Components, store, normative ratings, types
- Not tested: API routes, AI extraction/verification logic, PDF generation

## Test Types

**Unit Tests:**
- Scope: Individual functions and components in isolation
- Approach: Test inputs/outputs without side effects
- Examples: `normalizeRating('poor')` returns `{ tier: 'poor' }`, `FormField` renders with label
- Location: `__tests__/components/`, `__tests__/normative/`, `__tests__/store/`

**Integration Tests:**
- Scope: Multiple components/systems working together
- Approach: Mock external APIs, test flow through components
- Examples: `HomePage` component fetches assessments and renders list, form fields trigger store updates
- Location: `__tests__/pages/home.test.tsx`, multi-component scenarios in `__tests__/components/`

**E2E Tests:**
- Framework: Not used
- Rationale: Application likely relies on manual testing or future Playwright/Cypress setup

## Common Patterns

**Async Testing:**

From `home.test.tsx`:
```typescript
it('renders assessment list when assessments exist', async () => {
  vi.mocked(fetch).mockResolvedValueOnce({
    json: () => Promise.resolve({
      data: [{ id: 'test-1', clientName: 'John Smith', ... }],
    }),
  } as Response);

  render(<HomePage />);

  // Wait for async state update
  await waitFor(() => {
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });
});
```

**Key Pattern:**
- Use `await waitFor(...)` to wait for async operations (fetch, state updates)
- Mock promises that resolve with test data
- Assert after data loads

**Error Testing:**

From `home.test.tsx`:
```typescript
it('handles fetch error gracefully', async () => {
  vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));
  render(<HomePage />);

  await waitFor(() => {
    // Should still render without crashing
    expect(screen.getByText('No assessments yet')).toBeInTheDocument();
  });
});
```

**Key Pattern:**
- Use `mockRejectedValueOnce()` to simulate errors
- Verify component doesn't crash and falls back gracefully
- Assert fallback UI is rendered

**Event Testing:**

From `forms.test.tsx`:
```typescript
it('calls onChange when selection changes', () => {
  const onChange = vi.fn();
  render(<SelectField id="test" label="Test" value="" onChange={onChange} options={options} />);

  fireEvent.change(screen.getByLabelText('Test'), { target: { value: 'b' } });

  expect(onChange).toHaveBeenCalledWith('b');
});
```

**Key Pattern:**
- Use `fireEvent.change()` or `fireEvent.click()` to simulate user interaction
- Pass vi.fn() mock callback to component
- Verify callback invoked with expected arguments

**Store Testing:**

From `assessment-store.test.ts`:
```typescript
beforeEach(() => {
  useAssessmentStore.getState().reset();
});

it('updates individual section field', () => {
  useAssessmentStore.getState().setSectionData(1, { clientName: 'John' } as Record<string, unknown>);
  useAssessmentStore.getState().updateSectionField(1, 'clientEmail', 'john@test.com');

  const section = useAssessmentStore.getState().sectionData[1] as Record<string, unknown>;
  expect(section.clientName).toBe('John');
  expect(section.clientEmail).toBe('john@test.com');
});
```

**Key Pattern:**
- Call `getState()` to access store directly in tests
- Use `beforeEach()` to reset state between tests
- Test multiple state changes in sequence to verify merging logic

## Test Lifecycle

**Before Each Test:**
- Store tests: `useAssessmentStore.getState().reset()`
- Fetch mocks: `vi.mocked(fetch).mockReset()`

**After Each Test:**
- Automatic cleanup by Testing Library (unmounts components)
- Vitest/vi auto-reset between tests (unless configured otherwise)

## Assertions Patterns

**Component Rendering:**
```typescript
expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
expect(screen.getByText('Text')).toBeInTheDocument();
```

**State & Props:**
```typescript
expect(state.assessmentId).toBe('test-123');
expect(useAssessmentStore.getState().isDirty).toBe(true);
```

**Call Verification:**
```typescript
expect(onChange).toHaveBeenCalledWith('hello');
expect(fetch).toHaveBeenCalledWith('/api/assessments', expect.objectContaining({ method: 'POST' }));
```

**UI State:**
```typescript
expect(screen.getByLabelText('Test')).toBeDisabled();
expect(screen.getByLabelText('Test')).toHaveAttribute('type', 'email');
expect(screen.getByLabelText('Test')).toHaveAttribute('min', '0');
```

---

*Testing analysis: 2026-03-29*
