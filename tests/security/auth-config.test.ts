import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Phase 7 — D-01 + D-23 regression guard.
 *
 * Static-source assertions on src/lib/auth.ts. Static checks are deliberate:
 * fast (<100ms), deterministic, no DB seeding, no Better Auth runtime mocking,
 * and survive Better Auth version bumps that change runtime behaviour.
 */
describe('Better Auth config — D-01 regression guard', () => {
  const authSource = readFileSync(resolve(process.cwd(), 'src/lib/auth.ts'), 'utf-8');

  it('emailAndPassword.disableSignUp is true (Phase 7 D-01)', () => {
    expect(authSource).toMatch(/disableSignUp:\s*true/);
  });

  it('sendResetPassword handler is configured (Phase 7 D-23)', () => {
    expect(authSource).toMatch(/sendResetPassword:/);
  });

  it('sendResetPassword uses sendEmailViaSMTP2Go (Phase 7 D-23)', () => {
    // Match the entire sendResetPassword handler body — async (...) => { ... }.
    // The handler nests at least one object literal (the SMTP2Go args), so a
    // simple [^}]+ stops too early. Use a balanced-brace-ish window: read up
    // to a reasonable cap of characters after the keyword.
    const idx = authSource.indexOf('sendResetPassword:');
    expect(idx).toBeGreaterThanOrEqual(0);
    const block = authSource.slice(idx, idx + 600);
    expect(block).toMatch(/sendEmailViaSMTP2Go/);
  });

  it('emailAndPassword.minPasswordLength is 8 (Phase 7 BL-01 fix — health-data sensitivity floor)', () => {
    // BL-01 from 07-VERIFICATION.md: the API floor must match the /reset-password UI's minLength={8}.
    expect(authSource).toMatch(/minPasswordLength:\s*8/);
    // Negative: ensure the regression value (4) is no longer present.
    expect(authSource).not.toMatch(/minPasswordLength:\s*4/);
  });
});
