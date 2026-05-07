import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Phase 7 — D-19 regression guard.
 *
 * Plan 07-08 task 2 (warning 3 fix) moved the client-role redirect from a
 * client-side useEffect to a SERVER component. The redirect now lives in
 * src/app/portal/assessment/[id]/section/layout.tsx and runs BEFORE any
 * child page renders, eliminating the flicker + stale auto-save POST risk.
 *
 * Static-source assertions are the right tool here: the SSR redirect never
 * reaches the React tree, so no DOM render can observe it. The trade-off is
 * acceptable — these checks fail loudly if any commit converts the layout
 * back to a client component or removes the redirect call.
 */
describe('SSR client redirect — D-19 + warning 3 regression guard', () => {
  const layoutPath = resolve(
    process.cwd(),
    'src/app/portal/assessment/[id]/section/layout.tsx'
  );

  it('the SSR section layout file exists', () => {
    expect(existsSync(layoutPath)).toBe(true);
  });

  const source = existsSync(layoutPath) ? readFileSync(layoutPath, 'utf-8') : '';

  it('the layout is a SERVER component (no `use client` directive)', () => {
    expect(source).not.toMatch(/^['"]use client['"]/m);
  });

  it('the layout reads the session via auth.api.getSession + headers()', () => {
    expect(source).toMatch(/auth\.api\.getSession/);
    expect(source).toMatch(/headers\(\)/);
  });

  it('the layout calls redirect() when role === "client"', () => {
    expect(source).toMatch(/from 'next\/navigation'/);
    expect(source).toMatch(/redirect\(/);
    // The role-check + redirect-call appear together. Read a fixed window
    // after the role-check token to avoid the [^}] nesting issue.
    const idx = source.search(/role\s*===\s*'client'/);
    expect(idx).toBeGreaterThanOrEqual(0);
    const block = source.slice(idx, idx + 300);
    expect(block).toMatch(/redirect\(/);
    expect(block).toMatch(/\/report/);
  });

  it('the section page no longer contains a client-side router.replace to /report (warning 3 — the redirect must be SSR-only)', () => {
    const sectionPagePath = resolve(
      process.cwd(),
      'src/app/portal/assessment/[id]/section/[num]/page.tsx'
    );
    if (!existsSync(sectionPagePath)) return; // file may not yet exist in early branches
    const sectionSource = readFileSync(sectionPagePath, 'utf-8');
    // No userRole-conditional redirect to /report from the client-side
    expect(sectionSource).not.toMatch(/router\.replace\([^)]*\/report/);
  });
});
