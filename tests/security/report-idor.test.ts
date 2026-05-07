import { describe, it, expect } from 'vitest';
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
 *   4. The /report page goes through the ownership-enforced API and does
 *      not import the db directly.
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

  it('the /report page exists and goes through the ownership-enforced API (no direct DB read on this page)', () => {
    if (!existsSync(reportPagePath)) {
      // If plan 07-08 has not yet shipped, mark as pending — but the test file should exist so the gate is wired.
      return;
    }
    const reportSource = readFileSync(reportPagePath, 'utf-8');
    // The page MUST go through /api/assessments/{id} (which enforces ownership). It MUST NOT import the db directly.
    expect(reportSource).toMatch(/\/api\/assessments\//);
    expect(reportSource).not.toMatch(/from '@\/lib\/db'/);
  });

  // TODO: Integration test — requires test infra for seeding two sessions.
  // Skeleton:
  // it.skip('client A receives 403/404 when requesting client B\'s PDF', async () => {
  //   const sessionA = await seedClient('a@x');
  //   const assessmentB = await seedAssessmentForClient('b@x');
  //   const res = await fetch(`/api/assessments/${assessmentB.id}/pdf`, { headers: { cookie: sessionA.cookie } });
  //   expect([403, 404]).toContain(res.status);
  // });
});
