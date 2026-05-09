import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Phase 8 — RBAC + audit regression guard for /api/admin/pillars.
 *
 * Mirrors the static-source-grep pattern from
 * tests/security/last-admin-guard.test.ts and tests/security/invitations-role.test.ts:
 * the route file is read from disk and asserted to contain the expected RBAC
 * gates, validation, and audit-log emissions. This is the codebase's
 * established convention for security regression coverage and avoids spinning
 * up a live HTTP harness.
 *
 * Decisions enforced:
 *   D-19 / D-20 — admin-only writes; non-admin returns 403 (via requireAdmin)
 *   D-30 — audit-log emission on every successful write
 *   Pitfall #2 — no auth.api.setRole side-effect (pillar writes have no
 *     session-invalidation requirement)
 */
describe('PATCH /api/admin/pillars — admin-only RBAC + audit regression guard', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/app/api/admin/pillars/route.ts'),
    'utf-8'
  );

  it('every exported handler is gated by requireAdmin (non-admin → 403)', () => {
    // Both GET and PATCH must call requireAdmin at the top.
    expect(source).toMatch(/export async function GET/);
    expect(source).toMatch(/export async function PATCH/);
    // requireAdmin must appear at least twice in code (once per handler).
    const reqAdminMatches = source.match(/requireAdmin\(\)/g) ?? [];
    expect(reqAdminMatches.length).toBeGreaterThanOrEqual(2);
    // requireAdmin's contract returns a 403 NextResponse when role !== 'admin';
    // verify the import is wired so the gate is real and not a stale stub.
    expect(source).toMatch(/from '@\/lib\/auth-helpers'/);
    // Both handlers must short-circuit on errorRes from requireAdmin BEFORE
    // any body parsing.
    expect(source).toMatch(/if \(errorRes\) return errorRes/);
  });

  it('coach and client roles are blocked by requireAdmin (the source of the 403)', () => {
    // requireAdmin in src/lib/auth-helpers.ts returns 403 for any role other
    // than 'admin'. Pin the helper so a future refactor that bypasses it (e.g.
    // raw getValidSession + custom role check that forgets the 403) trips this
    // test.
    expect(source).toMatch(/import \{[^}]*requireAdmin[^}]*\} from '@\/lib\/auth-helpers'/);
    // The route MUST NOT call getValidSession or requireSession directly —
    // both would skip the role-check that emits the 403 for coach/client.
    expect(source).not.toMatch(/getValidSession\(\)/);
    expect(source).not.toMatch(/requireSession\(\)/);
  });

  it('PATCH definition branch validates pillarKey ∈ PILLAR_KEYS (admin happy path)', () => {
    // Body validation rejects unknown pillar keys with 400.
    expect(source).toMatch(/PILLAR_KEYS/);
    expect(source).toMatch(/Invalid pillarKey/);
    // Definition branch performs an upsert with onConflictDoUpdate inside a
    // db.transaction (admin happy path commits the write atomically).
    expect(source).toMatch(/db\.transaction/);
    expect(source).toMatch(/onConflictDoUpdate/);
  });

  it('emits pillar_definition.update audit entry on successful definition write', () => {
    expect(source).toMatch(/logAuditEvent/);
    expect(source).toMatch(/'pillar_definition\.update'/);
    expect(source).toMatch(/from:\s*fromLabel/);
    expect(source).toMatch(/to:\s*label/);
  });

  it('emits pillar_page_copy.update audit entry on successful page-copy write', () => {
    expect(source).toMatch(/'pillar_page_copy\.update'/);
    expect(source).toMatch(/before_heading_hash/);
    expect(source).toMatch(/after_heading_hash/);
    expect(source).toMatch(/before_intro_hash/);
    expect(source).toMatch(/after_intro_hash/);
    // Hashes are sha256 short fingerprints (12 hex chars) per the locked
    // interface. Pin the createHash usage.
    expect(source).toMatch(/createHash\('sha256'\)/);
  });

  it('does NOT call auth.api.setRole — Pitfall #2 (no session-invalidation needed)', () => {
    // This route mutates pillar copy, not user roles. Importing setRole would
    // signal a wrong-pattern carry-forward from the Phase 7 user-role route.
    expect(source).not.toMatch(/auth\.api\.setRole/);
  });
});
