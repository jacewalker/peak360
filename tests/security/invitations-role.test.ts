import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Phase 7 — D-05 regression guard for POST /api/invitations.
 *
 * Asserts that:
 *   1. A coach session POSTing role !== 'client' is forbidden (403).
 *   2. The route uses the atomic auth.api.createUser path (D-02), not the
 *      old signUpEmail + post-hoc role-update pattern.
 *   3. The requestedRole is whitelist-validated against the three legal roles.
 */
describe('POST /api/invitations role-of-caller validation — D-05 regression guard', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/app/api/invitations/route.ts'),
    'utf-8'
  );

  it('coach role caller cannot set role !== "client"', () => {
    expect(source).toMatch(/session\.user\.role\s*===\s*'coach'/);
    expect(source).toMatch(/requestedRole\s*!==\s*'client'/);
    // The coach-guard returns NextResponse with `status: 403`. The if-block
    // contains a nested `{ error: ... }` literal so a `[^}]` window closes
    // too early — read a fixed slice after the guard keyword instead.
    const idx = source.search(/session\.user\.role\s*===\s*'coach'\s*&&\s*requestedRole\s*!==\s*'client'/);
    expect(idx).toBeGreaterThanOrEqual(0);
    const guard = source.slice(idx, idx + 300);
    expect(guard).toMatch(/status:\s*403/);
  });

  it('uses auth.api.createUser (atomic per D-02), not signUpEmail + post-hoc role update', () => {
    expect(source).toMatch(/auth\.api\.createUser/);
    expect(source).not.toMatch(/auth\.api\.signUpEmail/);
    expect(source).not.toMatch(/db\.update\(user\)\.set\(\{\s*role:/);
  });

  it('whitelist-validates requestedRole against admin|coach|client', () => {
    expect(source).toMatch(/\['admin',\s*'coach',\s*'client'\]/);
  });
});
