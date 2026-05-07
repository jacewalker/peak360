import { describe, it, expect, vi } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Phase 7 — T-07-34 + warning 2 IDOR regression guard.
 *
 * The PDF route and the /report page both render assessment data. If either
 * loses its ownership check, one client could fetch another client's PDF or
 * full report (insecure direct object reference).
 *
 * The test prefers BREADTH over depth — accepts any reasonable ownership
 * pattern (hasAccess helper, coachId/clientId equality, or session.user.id
 * comparison) — because the actual helper may evolve. Contract:
 *   1. An ownership check exists.
 *   2. A 403/404 is returned on failure.
 *   3. The session is read first (no anonymous PDF download).
 *   4. The /report page enforces ownership at SSR time (BL-05) — auth.api.getSession
 *      + hasAccess + redirect/notFound, replacing the old API-pass-through design.
 */
describe('Report + PDF IDOR ownership guards — T-07-34 + warning 2 regression guard', () => {
  const pdfRoutePath = resolve(
    process.cwd(),
    'src/app/api/assessments/[id]/pdf/route.ts'
  );
  const reportPagePath = resolve(
    process.cwd(),
    'src/app/portal/assessment/[id]/report/page.tsx'
  );

  it('the PDF route file exists', () => {
    expect(existsSync(pdfRoutePath)).toBe(true);
  });

  const pdfSource = existsSync(pdfRoutePath)
    ? readFileSync(pdfRoutePath, 'utf-8')
    : '';

  it('the PDF route enforces an ownership guard (hasAccess OR coachId/clientId equality OR session.user.id check)', () => {
    const ownershipPatterns = [
      /hasAccess\(/,
      /coachId\s*===\s*session\.user\.id/,
      /clientId\s*===\s*session\.user\.id/,
      /assessment\.coachId\s*===/,
      /assessment\.clientId\s*===/,
      /userId\s*===\s*session\.user\.id/,
    ];
    const matched = ownershipPatterns.some((re) => re.test(pdfSource));
    expect(matched).toBe(true);
  });

  it('the PDF route returns a 403 or 404 on ownership failure', () => {
    // Either a NextResponse 403 or a Next-style 404 is acceptable
    const has403 = /status:\s*403/.test(pdfSource);
    const has404 = /status:\s*404/.test(pdfSource) || /notFound\(/.test(pdfSource);
    expect(has403 || has404).toBe(true);
  });

  it('the PDF route reads the session before responding (no anonymous PDF download)', () => {
    const hasSessionRead =
      /auth\.api\.getSession/.test(pdfSource) ||
      /requireSession\(/.test(pdfSource) ||
      /requireAuth\(/.test(pdfSource);
    expect(hasSessionRead).toBe(true);
  });

  it('the /report page enforces ownership at SSR-time (BL-05 fix replaces the old API-pass-through design)', () => {
    if (!existsSync(reportPagePath)) {
      return;
    }
    const reportSource = readFileSync(reportPagePath, 'utf-8');

    // BL-05: the new design fetches the assessment row server-side and enforces
    // ownership before rendering. This REQUIRES importing @/lib/db (the previous
    // "MUST NOT import db" assertion was the OLD design's premise).
    expect(reportSource).toMatch(/auth\.api\.getSession/);
    expect(reportSource).toMatch(/hasAccess\(/);
    const hasRedirect = /redirect\(/.test(reportSource);
    const hasNotFound = /notFound\(/.test(reportSource);
    expect(hasRedirect || hasNotFound).toBe(true);

    // The Download PDF anchor still points to /api/assessments/{id}/pdf —
    // the route also enforces hasAccess(), so the link continues to require ownership.
    expect(reportSource).toMatch(/\/api\/assessments\//);
  });

  it('the PDF route invokes hasAccess() BEFORE renderToBuffer / loadReportData (ordering lock-in — WARNING 2 fix)', () => {
    // The hasAccess() call must precede any data load or buffer render to prevent
    // information disclosure via timing or partial-render side effects.
    const hasAccessIdx = pdfSource.search(/hasAccess\(/);
    const renderToBufferIdx = pdfSource.search(/renderToBuffer\(/);
    const loadReportDataIdx = pdfSource.search(/loadReportData\(/);

    expect(hasAccessIdx).toBeGreaterThanOrEqual(0);
    // renderToBuffer and loadReportData are both expected to appear in the route.
    expect(renderToBufferIdx).toBeGreaterThanOrEqual(0);
    expect(loadReportDataIdx).toBeGreaterThanOrEqual(0);

    // Critical ordering: ownership gate runs first.
    expect(hasAccessIdx).toBeLessThan(renderToBufferIdx);
    expect(hasAccessIdx).toBeLessThan(loadReportDataIdx);
  });

  describe('IDOR integration — client A cannot fetch client B PDF (T-07-34)', () => {
    it('GET /api/assessments/[id]/pdf returns 403 when caller is a client and is not the row owner', async () => {
      // Mocking strategy fallback (per plan-12 action note "If vi.spyOn cannot
      // be used, fall back to vi.mock at the top of the file with a factory"):
      // src/lib/db is a Proxy with only a get-trap, so vi.spyOn(db, 'select')
      // throws "property is not defined on the object". The route also calls
      // requireSession() which invokes next/headers — also outside a request
      // scope in vitest. We therefore vi.doMock @/lib/auth-helpers AND @/lib/db
      // so the hasAccess() gate sees a non-owner session against a foreign-
      // owned row and returns 403.
      vi.resetModules();

      vi.doMock('@/lib/auth-helpers', () => ({
        requireSession: vi.fn().mockResolvedValue([
          {
            user: {
              id: 'client-a-id',
              role: 'client',
              email: 'a@x',
              name: 'Client A',
            },
            session: { id: 'sess-a', token: 't', expiresAt: new Date() },
          },
          null,
        ]),
      }));

      // Provide an in-memory db.select() chain that returns a client-B-owned row.
      vi.doMock('@/lib/db', () => ({
        db: {
          select: () => ({
            from: () => ({
              where: () =>
                Promise.resolve([
                  {
                    id: 'assessment-b-id',
                    clientId: 'client-b-id',
                    coachId: 'coach-x-id',
                    assessmentDate: '2026-05-01',
                  },
                ]),
            }),
          }),
        },
      }));

      // Import the GET handler AFTER the doMock calls so it picks up the mocks.
      const { GET } = await import('@/app/api/assessments/[id]/pdf/route');
      const params = Promise.resolve({ id: 'assessment-b-id' });
      const request = new Request(
        'http://test/api/assessments/assessment-b-id/pdf'
      );
      const response = await GET(request, { params });

      // Strong assertion: a 403 (or 404 — both are acceptable per the route's contract).
      // The hasAccess() gate runs BEFORE renderToBuffer / loadReportData, so this
      // path does not trigger any downstream PDF rendering.
      expect([403, 404]).toContain(response.status);

      vi.doUnmock('@/lib/auth-helpers');
      vi.doUnmock('@/lib/db');
      vi.resetModules();
    });
  });
});

describe('Report page SSR ownership gate — BL-05 regression guard', () => {
  const reportPagePath = resolve(
    process.cwd(),
    'src/app/portal/assessment/[id]/report/page.tsx'
  );

  it('the report page is a server component (no "use client" directive)', () => {
    const source = readFileSync(reportPagePath, 'utf-8');
    expect(source).not.toMatch(/^['"]use client['"]/m);
  });

  it('the report page reads the session via auth.api.getSession before rendering', () => {
    const source = readFileSync(reportPagePath, 'utf-8');
    expect(source).toMatch(/auth\.api\.getSession/);
    expect(source).toMatch(/from 'next\/headers'/);
  });

  it('the report page enforces ownership via hasAccess + redirects/notFound on failure', () => {
    const source = readFileSync(reportPagePath, 'utf-8');
    expect(source).toMatch(/hasAccess\(/);
    // Either redirect or notFound must be invoked when ownership fails.
    const hasRedirect = /redirect\(/.test(source);
    const hasNotFound = /notFound\(/.test(source);
    expect(hasRedirect || hasNotFound).toBe(true);
  });

  it('the report page does NOT use client-side fetch for assessment data (data comes from server-side db.select)', () => {
    const source = readFileSync(reportPagePath, 'utf-8');
    expect(source).not.toMatch(/fetch\(`\/api\/assessments\//);
    expect(source).not.toMatch(/useState/);
    expect(source).not.toMatch(/useEffect/);
  });
});
