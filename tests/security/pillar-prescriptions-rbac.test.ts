import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Phase 8 — RBAC + audit + URL-scheme regression guard for
 * /api/admin/assessments/[id]/prescriptions.
 *
 * Mirrors the static-source-grep pattern from
 * tests/security/last-admin-guard.test.ts. The route source is read from disk
 * and asserted to contain the expected RBAC gates, validation, audit-log
 * emissions, and the http(s)-only URL scheme guard.
 *
 * Decisions enforced:
 *   D-12 / D-15 / D-20 — admin-only writes; non-admin returns 403
 *   D-16 — pillar_prescription.upsert / .delete audit emission with sha256
 *     short-hash before/after metadata
 *   T-08-17 (threat register) — fullPlanHref MUST reject non-http(s) schemes
 *     (e.g. javascript:) with 400 at the API write boundary
 *   Pitfall #2 — no auth.api.setRole side-effect
 */
describe('PATCH/DELETE /api/admin/assessments/[id]/prescriptions — RBAC + audit + URL-scheme guard', () => {
  const source = readFileSync(
    resolve(
      process.cwd(),
      'src/app/api/admin/assessments/[id]/prescriptions/route.ts'
    ),
    'utf-8'
  );

  it('every exported handler is gated by requireAdmin (non-admin → 403)', () => {
    expect(source).toMatch(/export async function GET/);
    expect(source).toMatch(/export async function PATCH/);
    expect(source).toMatch(/export async function DELETE/);
    // requireAdmin must appear at least three times (one per handler).
    const reqAdminMatches = source.match(/requireAdmin\(\)/g) ?? [];
    expect(reqAdminMatches.length).toBeGreaterThanOrEqual(3);
    // Each handler must short-circuit on errorRes from requireAdmin BEFORE
    // any body parsing or DB read.
    const errorResMatches = source.match(/if \(errorRes\) return errorRes/g) ?? [];
    expect(errorResMatches.length).toBeGreaterThanOrEqual(3);
    expect(source).toMatch(/from '@\/lib\/auth-helpers'/);
  });

  it('coach and client roles cannot bypass requireAdmin (no raw session use)', () => {
    // Coach and client are blocked because requireAdmin returns a 403 for any
    // role !== 'admin'. The route must not bypass requireAdmin via raw session
    // helpers.
    expect(source).not.toMatch(/getValidSession\(\)/);
    expect(source).not.toMatch(/requireSession\(\)/);
    // Pitfall #2 — admin auth helpers, not user-role side-effects.
    expect(source).not.toMatch(/auth\.api\.setRole/);
  });

  it('PATCH validates pillarKey and rejects empty summary (admin happy path inputs)', () => {
    expect(source).toMatch(/PILLAR_KEYS/);
    expect(source).toMatch(/Invalid pillarKey/);
    expect(source).toMatch(/Summary is required/);
    // Composite-key upsert inside db.transaction is the locked happy path.
    expect(source).toMatch(/db\.transaction/);
    expect(source).toMatch(/onConflictDoUpdate/);
    // Composite target on (assessmentId, pillarKey).
    expect(source).toMatch(
      /target:\s*\[pillarPrescriptions\.assessmentId,\s*pillarPrescriptions\.pillarKey\]/
    );
  });

  it('PATCH rejects fullPlanHref containing a javascript: or other non-http(s) scheme with 400 (T-08-17)', () => {
    // The validator constructs `new URL(s)` and asserts the protocol is
    // http: or https:. Pin the scheme allowlist so a future refactor can't
    // silently widen it (e.g. include 'data:' or drop the check).
    expect(source).toMatch(/u\.protocol\s*===\s*'http:'/);
    expect(source).toMatch(/u\.protocol\s*===\s*'https:'/);
    expect(source).toMatch(/Full-plan link must use http or https/);
    // The error path returns status 400.
    const idx = source.search(/Full-plan link must use http or https/);
    expect(idx).toBeGreaterThanOrEqual(0);
    const guardBlock = source.slice(idx, idx + 200);
    expect(guardBlock).toMatch(/status:\s*400/);
  });

  it('emits pillar_prescription.upsert audit entry with composite resourceId + before/after sha256 short hashes', () => {
    expect(source).toMatch(/logAuditEvent/);
    expect(source).toMatch(/'pillar_prescription\.upsert'/);
    // resourceId is the composite key formatted as `${assessmentId}:${pillarKey}`.
    expect(source).toMatch(/`\$\{assessmentId\}:\$\{body\.pillarKey\}`/);
    // Audit metadata payload includes both before and after summary hashes.
    expect(source).toMatch(/before_summary_hash/);
    expect(source).toMatch(/after_summary_hash/);
    // Hashes use sha256.
    expect(source).toMatch(/createHash\('sha256'\)/);
  });

  it('emits pillar_prescription.delete audit entry; DELETE returns 404 when no row exists', () => {
    expect(source).toMatch(/'pillar_prescription\.delete'/);
    // The DELETE handler MUST capture the previous summary hash before
    // removing the row, so the audit metadata records what was destroyed.
    expect(source).toMatch(/before_summary_hash/);
    // Idempotency callout: when no row exists, DELETE returns 404 with
    // generic 'Not found' copy (admin already has cross-assessment visibility
    // so this leaks no information per T-08-22).
    const idx = source.search(/'Not found'/);
    expect(idx).toBeGreaterThanOrEqual(0);
    const block = source.slice(idx, idx + 200);
    expect(block).toMatch(/status:\s*404/);
  });
});
