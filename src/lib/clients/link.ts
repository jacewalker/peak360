// Shared client-link resolver — makes assessments.client_id an authoritative
// reflection of the currently-assigned client across every write path.
//
// Resolution priority (resolveClientId):
//   1. EMAIL match wins — a role='client' user whose email matches (case-insensitive).
//   2. UNAMBIGUOUS NAME match — exactly one role='client' user with that name.
//   3. AMBIGUOUS NAME (2+ client users share the name) → treated as NO match; we
//      never guess and never auto-link the wrong existing account.
//   4. NO match → auto-create a role='client' user (random password, NO email sent):
//        - with the supplied email when present, else
//        - with a generated UNIQUE placeholder email so the UNIQUE constraint holds
//          (the account simply can't sign in until a real login is provisioned).
//   5. Neither name nor email present → return null (nothing to link).
//
// applyClientLink is AUTHORITATIVE: it always writes the resolved value (including
// null), so a stale/previous client_id is cleared or repointed on every change.
//
// This file sends NO email (no signInMagicLink / sendEmailViaSMTP2Go imports). The
// only user-create path is auth.api.createUser (mirrors src/app/api/client-login),
// followed by a re-query by email to obtain the new id.
//
// TESTABILITY: every exported function accepts an optional `deps` override
// ({ db, schema, createUser }). In production the deps default to the db proxy +
// the seed-admin-style schema selection + the real Better Auth createUser. Unit
// tests (src/lib/clients/link.test.ts) inject a throwaway better-sqlite3 drizzle
// instance and a thin createUser stub that mirrors createUser semantics (insert a
// role='client' row, then re-query by email). This exercises the resolver's real
// branching headless without booting Better Auth, while prod still uses the real
// createUser path verbatim.

import { eq } from 'drizzle-orm';

export interface ClientLinkInput {
  clientName?: string | null;
  clientEmail?: string | null;
  coachId?: string | null;
}

export type PlanAction = 'LINK' | 'CREATE-USER' | 'SKIP' | 'CONFLICT';

export interface PlanResult {
  action: PlanAction;
  detail: string;
}

export type NameMatchResult = string | null | 'ambiguous';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Schema = any;

/**
 * Create a role='client' user with a random password and NO email sent, then
 * re-query by email to return the new id. Mirrors the createUser flow in
 * src/app/api/client-login/route.ts lines 110-148 (role cast included).
 */
export type CreateClientUser = (args: {
  email: string;
  name: string;
  coachId?: string | null;
  db: Db;
  schema: Schema;
}) => Promise<string>;

export interface LinkDeps {
  db?: Db;
  schema?: Schema;
  createUser?: CreateClientUser;
}

async function loadDefaultDb(): Promise<Db> {
  const { db } = await import('@/lib/db');
  return db;
}

// Select the schema module the same way src/lib/seed-admin.ts does — the two
// schema files are distinct objects, picked by DATABASE_URL presence.
async function loadDefaultSchema(): Promise<Schema> {
  const isPostgres = !!process.env.DATABASE_URL;
  return isPostgres
    ? await import('@/lib/db/schema')
    : await import('@/lib/db/schema-sqlite');
}

// Default user creator — the real Better Auth path. Re-queries by email because
// createUser does not return the row reliably. Sets coachId when provided.
const defaultCreateClientUser: CreateClientUser = async ({ email, name, coachId, db, schema }) => {
  const { auth } = await import('@/lib/auth');
  await auth.api.createUser({
    body: {
      email,
      password: crypto.randomUUID(),
      name,
      // Better Auth admin plugin role typing narrows to its own union; the
      // runtime accepts any configured role string, so we widen via cast.
      role: 'client' as 'user' | 'admin',
    },
  });

  const fresh = await db.select().from(schema.user).where(eq(schema.user.email, email)).limit(1);
  if (fresh.length === 0) {
    throw new Error(`[clients/link] user not found after createUser: ${email}`);
  }
  const id: string = fresh[0].id;

  // Set coachId from the arg when provided so an auto-created client inherits
  // the assessment's coach.
  if (coachId) {
    await db.update(schema.user).set({ coachId }).where(eq(schema.user.id, id));
  }

  return id;
};

async function resolveDeps(deps?: LinkDeps): Promise<{ db: Db; schema: Schema; createUser: CreateClientUser }> {
  return {
    db: deps?.db ?? (await loadDefaultDb()),
    schema: deps?.schema ?? (await loadDefaultSchema()),
    createUser: deps?.createUser ?? defaultCreateClientUser,
  };
}

function normalizeEmail(email?: string | null): string {
  return (email ?? '').trim().toLowerCase();
}

function localPartOf(email: string): string {
  const at = email.indexOf('@');
  return at > 0 ? email.slice(0, at) : email;
}

/**
 * Look up a role='client' user by exact name.
 * Returns the user id (single match), null (no match), or 'ambiguous' (2+ matches).
 */
export async function findClientUserByName(
  name: string,
  deps?: LinkDeps
): Promise<NameMatchResult> {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return null;
  const { db, schema } = await resolveDeps(deps);

  // Match name in-memory so we can count duplicates exactly and stay
  // driver-agnostic (no reliance on the name column's collation).
  const named = await db
    .select({ id: schema.user.id, name: schema.user.name })
    .from(schema.user)
    .where(eq(schema.user.role, 'client'));
  const hits = (named as Array<{ id: string; name: string | null }>).filter(
    (u) => (u.name ?? '') === trimmed
  );

  if (hits.length === 0) return null;
  if (hits.length > 1) return 'ambiguous';
  return hits[0].id;
}

/**
 * Read-only lookup shared by resolveClientId and planClientLink. Performs ONLY
 * the email/name lookups — never writes and never auto-creates.
 *
 * Returns one of:
 *   { kind: 'matched', id }       — email or unambiguous name match found
 *   { kind: 'create', email }     — no match; would auto-create with this email
 *   { kind: 'conflict', email }   — ambiguous name + no email; would auto-create a placeholder
 *   { kind: 'none' }              — neither name nor email present (nothing to link)
 */
async function lookupClientLink(
  input: ClientLinkInput,
  deps?: LinkDeps
): Promise<
  | { kind: 'matched'; id: string }
  | { kind: 'create'; email: string; name: string }
  | { kind: 'conflict'; email: string; name: string }
  | { kind: 'none' }
> {
  const { db, schema } = await resolveDeps(deps);
  const email = normalizeEmail(input.clientEmail);
  const name = (input.clientName ?? '').trim();

  if (!email && !name) return { kind: 'none' };

  // 1. Email match wins (case-insensitive — compare against lowercased stored email).
  if (email) {
    const rows = await db
      .select({ id: schema.user.id, email: schema.user.email })
      .from(schema.user)
      .where(eq(schema.user.role, 'client'));
    const hit = (rows as Array<{ id: string; email: string | null }>).find(
      (u) => normalizeEmail(u.email) === email
    );
    if (hit) return { kind: 'matched', id: hit.id };
  }

  // 2. Unambiguous name match. Note: findClientUserByName returns the literal
  // string 'ambiguous' for 2+ matches, so we must exclude that sentinel before
  // treating a string result as a real id.
  if (name) {
    const byName = await findClientUserByName(name, deps);
    if (typeof byName === 'string' && byName !== 'ambiguous') {
      return { kind: 'matched', id: byName };
    }
    // byName === 'ambiguous' or null falls through to create/conflict below.
  }

  // 3/4. No match → create.
  if (email) {
    return { kind: 'create', email, name: name || localPartOf(email) };
  }

  // Only a name, and it was ambiguous or unmatched → generate a unique
  // placeholder email so the UNIQUE constraint holds. Ambiguous → CONFLICT in
  // the plan; both still resolve to creating a distinct placeholder user.
  const placeholder = `client+${crypto.randomUUID()}@placeholder.peak360.local`;
  return { kind: 'conflict', email: placeholder, name };
}

/**
 * Resolve the client_id that should be linked to an assessment given its
 * current clientName/clientEmail. See file header for full priority rules.
 * May auto-create a role='client' user (no email sent). Returns null when there
 * is nothing to link.
 */
export async function resolveClientId(
  input: ClientLinkInput,
  deps?: LinkDeps
): Promise<string | null> {
  const { db, schema, createUser } = await resolveDeps(deps);
  const lookup = await lookupClientLink(input, deps);

  switch (lookup.kind) {
    case 'none':
      return null;
    case 'matched':
      return lookup.id;
    case 'create':
    case 'conflict':
      return createUser({
        email: lookup.email,
        name: lookup.name,
        coachId: input.coachId,
        db,
        schema,
      });
  }
}

/**
 * AUTHORITATIVE link: resolve the client_id and write it (including null) onto
 * the assessment, so a stale/previous client_id is always cleared or repointed.
 */
export async function applyClientLink(
  assessmentId: string,
  input: ClientLinkInput,
  deps?: LinkDeps
): Promise<void> {
  const { db, schema } = await resolveDeps(deps);
  const clientId = await resolveClientId(input, deps);
  await db
    .update(schema.assessments)
    .set({ clientId })
    .where(eq(schema.assessments.id, assessmentId));
}

/**
 * Read-only planner for the backfill script. Runs ONLY the lookup branches — no
 * writes, no createUser — and reports what applyClientLink WOULD do:
 *   LINK         existing client user resolved by email/unambiguous name
 *   CREATE-USER  no match; would auto-create with the shown email
 *   CONFLICT     ambiguous name with no email; would auto-create a placeholder (review!)
 *   SKIP         nothing to link (no name AND no email)
 */
export async function planClientLink(
  input: ClientLinkInput,
  deps?: LinkDeps
): Promise<PlanResult> {
  const lookup = await lookupClientLink(input, deps);
  switch (lookup.kind) {
    case 'none':
      return { action: 'SKIP', detail: 'no name and no email' };
    case 'matched':
      return { action: 'LINK', detail: lookup.id };
    case 'create':
      return { action: 'CREATE-USER', detail: lookup.email };
    case 'conflict':
      return { action: 'CONFLICT', detail: `ambiguous name → would create ${lookup.email}` };
  }
}
