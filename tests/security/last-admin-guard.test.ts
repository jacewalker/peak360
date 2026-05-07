import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Phase 7 — D-21 + warning 6 regression guard for the role-change route.
 *
 * Two regressions are guarded here:
 *   D-21 step 2: count remaining admins BEFORE allowing demotion.
 *   Warning 6 fix: re-count admins AFTER setRole and roll back if count < 1
 *     (closes the concurrent-demotion race window).
 */
describe('POST /api/admin/users/[userId]/role last-admin guard — D-21 + warning 6 regression guard', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/app/api/admin/users/[userId]/role/route.ts'),
    'utf-8'
  );

  it('counts remaining admins before allowing demotion', () => {
    expect(source).toMatch(/oldRole\s*===\s*'admin'/);
    expect(source).toMatch(/newRole\s*!==\s*'admin'/);
    expect(source).toMatch(/eq\(user\.role,\s*'admin'\)/);
  });

  it('returns 400 with the verbatim error copy when only one admin remains', () => {
    expect(source).toMatch(
      /Cannot change the role of the only admin\. Promote another user to admin first\./
    );
    // The guard body wraps `{ error: '...' }, { status: 400 }` — the nested
    // object literal closes before `status:` is reached, so a `[^}]` regex
    // window is too narrow. Read a fixed window after the `before <= 1`
    // pre-check token instead.
    const idx = source.search(/before\s*<=\s*1/);
    expect(idx).toBeGreaterThanOrEqual(0);
    const guardBlock = source.slice(idx, idx + 400);
    expect(guardBlock).toMatch(/status:\s*400/);
  });

  it('the pre-count check appears BEFORE the auth.api.setRole call', () => {
    const guardIdx = source.search(
      /Cannot change the role of the only admin/
    );
    const setRoleIdx = source.search(/auth\.api\.setRole/);
    expect(guardIdx).toBeGreaterThanOrEqual(0);
    expect(setRoleIdx).toBeGreaterThanOrEqual(0);
    expect(guardIdx).toBeLessThan(setRoleIdx);
  });

  it('writes an audit_logs entry with action user.role.changed', () => {
    expect(source).toMatch(/logAuditEvent/);
    expect(source).toMatch(/'user\.role\.changed'/);
    expect(source).toMatch(/from:\s*oldRole/);
    expect(source).toMatch(/to:\s*newRole/);
  });

  // ---- Warning 6 fix: post-check rollback ----
  it('post-check rollback: re-counts admins AFTER setRole and rolls back if count < 1 (warning 6)', () => {
    // The setRole call appears at least twice — once forward, once for the rollback.
    const setRoleMatches = source.match(/auth\.api\.setRole/g) ?? [];
    expect(setRoleMatches.length).toBeGreaterThanOrEqual(2);

    // The rollback writes a distinct audit action.
    expect(source).toMatch(/'user\.role\.rollback'/);

    // The rollback returns 409 — the canonical "race detected" status.
    expect(source).toMatch(/status:\s*409/);

    // The rollback path appears AFTER the first setRole call.
    const firstSetRoleIdx = source.search(/auth\.api\.setRole/);
    const rollbackIdx = source.search(/'user\.role\.rollback'/);
    expect(rollbackIdx).toBeGreaterThan(firstSetRoleIdx);
  });
});
