import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Phase 7 — D-21 + BL-02 fix regression guard for the role-change route.
 *
 * Regressions guarded:
 *   D-21 step 2: count remaining admins BEFORE allowing demotion (verbatim error
 *     copy + status:400; pinned on the local variable name `before`).
 *   BL-02 fix (07-10-PLAN, supersedes the previous "warning 6 fix" rollback):
 *     count + role update happen inside an atomic db.transaction. The previous
 *     post-check rollback was unreachable in concurrent races and has been
 *     removed in favour of the atomic design.
 */
describe('POST /api/admin/users/[userId]/role last-admin guard — D-21 + BL-02 fix regression guard', () => {
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

  // ---- BL-02 fix: atomic transaction replaces the unreachable rollback ----
  it('count + role update happen inside an atomic db.transaction (BL-02 fix)', () => {
    // The transactional shape is the new contract.
    expect(source).toMatch(/db\.transaction\s*\(/);

    // The role write goes through tx.update(user), NOT auth.api.setRole, for the durable write.
    expect(source).toMatch(/tx\.update\(user\)/);

    // The count query and the role write both happen inside the transaction body.
    // Brace-balance the transaction body manually because the body contains nested
    // braces (if-block, template-literal-with-braces) that defeat naive regex.
    const txStart = source.search(/db\.transaction\s*\(\s*async\s*\(/);
    expect(txStart).toBeGreaterThanOrEqual(0);
    const bodyStart = source.indexOf('{', txStart);
    expect(bodyStart).toBeGreaterThanOrEqual(0);
    let depth = 1;
    let bodyEnd = bodyStart + 1;
    while (bodyEnd < source.length && depth > 0) {
      const ch = source[bodyEnd];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      if (depth === 0) break;
      bodyEnd++;
    }
    const txBlock = source.slice(bodyStart, bodyEnd + 1);
    // Inside the transaction body: admin-count filter + role write.
    expect(txBlock).toMatch(/eq\(user\.role,\s*'admin'\)/);
    expect(txBlock).toMatch(/tx\.update\(user\)/);
  });

  it('the unreachable post-check rollback is removed (no user.role.rollback audit; no 409 status)', () => {
    // BL-02 from 07-VERIFICATION.md: the rollback path was unreachable; replaced by atomic transaction.
    expect(source).not.toMatch(/'user\.role\.rollback'/);
    expect(source).not.toMatch(/status:\s*409/);
  });

  it('auth.api.setRole is called at most once (post-commit, for session side-effects only)', () => {
    // Forward-write + rollback both used auth.api.setRole, totalling 2+ calls.
    // Post-fix: at most 1 call, made AFTER db.transaction commits, purely for session invalidation.
    const setRoleMatches = source.match(/auth\.api\.setRole/g) ?? [];
    expect(setRoleMatches.length).toBeLessThanOrEqual(1);
  });
});
