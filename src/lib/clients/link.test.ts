// Unit coverage for the shared client-link resolver.
//
// APPROACH (documented per the plan): we drive the resolver's REAL branching
// against a throwaway better-sqlite3 + drizzle instance (the same schema-sqlite
// objects prod uses), injected via the resolver's `deps` override. The
// auto-create path is exercised through a thin `createUser` stub that mirrors
// auth.api.createUser semantics exactly -- insert a role='client' row, then
// re-query by email for the id (createUser does not return the row reliably).
// We deliberately do NOT boot Better Auth here: createUser headless requires a
// running auth runtime, so a faithful stub lets us exercise the resolver's
// email-vs-name-vs-create decision (the actual logic under test) while prod
// keeps using the real createUser path verbatim. DATABASE_URL is kept UNSET so
// the default schema-selection branch (schema-sqlite) is the one in play.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { eq } from 'drizzle-orm';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySchema = any;

let tmpDir: string;
let sqlite: { close: () => void };
let db: AnyDb;
let schema: AnySchema;

async function makeDb() {
  delete process.env.DATABASE_URL;
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'link-test-'));
  const Database = (await import('better-sqlite3')).default;
  const raw = new Database(path.join(tmpDir, 'local.test.db'));
  raw.pragma('journal_mode = WAL');
  raw.pragma('foreign_keys = ON');

  // Minimal schema matching schema-sqlite.ts for the tables the resolver touches.
  raw.exec(`
    CREATE TABLE "user" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "email" text NOT NULL UNIQUE,
      "email_verified" integer,
      "image" text,
      "role" text DEFAULT 'coach',
      "coach_id" text,
      "banned" integer,
      "ban_reason" text,
      "ban_expires" integer,
      "created_at" text NOT NULL,
      "updated_at" text NOT NULL
    );
    CREATE TABLE "assessments" (
      "id" text PRIMARY KEY NOT NULL,
      "client_name" text,
      "client_email" text,
      "client_dob" text,
      "client_gender" text,
      "assessment_date" text,
      "current_section" integer DEFAULT 1,
      "status" text DEFAULT 'in_progress',
      "normative_version_id" text,
      "coach_id" text,
      "client_id" text,
      "created_at" text NOT NULL,
      "updated_at" text NOT NULL
    );
  `);

  const { drizzle } = await import('drizzle-orm/better-sqlite3');
  schema = await import('@/lib/db/schema-sqlite');
  db = drizzle(raw, { schema });
  sqlite = raw;
}

async function insertUser(opts: {
  id: string;
  name: string;
  email: string;
  role?: string;
  coachId?: string | null;
}) {
  const now = new Date().toISOString();
  await db.insert(schema.user).values({
    id: opts.id,
    name: opts.name,
    email: opts.email,
    role: opts.role ?? 'client',
    coachId: opts.coachId ?? null,
    createdAt: now,
    updatedAt: now,
  });
}

async function insertAssessment(opts: {
  id: string;
  clientName?: string | null;
  clientEmail?: string | null;
  coachId?: string | null;
  clientId?: string | null;
}) {
  const now = new Date().toISOString();
  await db.insert(schema.assessments).values({
    id: opts.id,
    clientName: opts.clientName ?? null,
    clientEmail: opts.clientEmail ?? null,
    coachId: opts.coachId ?? null,
    clientId: opts.clientId ?? null,
    createdAt: now,
    updatedAt: now,
  });
}

// Faithful stub of auth.api.createUser: insert a role='client' user then
// re-query by email for the id. Mirrors the real path's insert+requery contract.
async function stubCreateUser(args: {
  email: string;
  name: string;
  coachId?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: any;
}): Promise<string> {
  const now = new Date().toISOString();
  await args.db.insert(args.schema.user).values({
    id: crypto.randomUUID(),
    name: args.name,
    email: args.email.toLowerCase(),
    role: 'client',
    coachId: args.coachId ?? null,
    createdAt: now,
    updatedAt: now,
  });
  const fresh = await args.db
    .select()
    .from(args.schema.user)
    .where(eq(args.schema.user.email, args.email.toLowerCase()))
    .limit(1);
  return fresh[0].id;
}

function deps() {
  return { db, schema, createUser: stubCreateUser };
}

beforeEach(async () => {
  await makeDb();
});

afterEach(() => {
  sqlite?.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.DATABASE_URL;
});

describe('resolveClientId', () => {
  it('Test 1: email match wins over a different name match', async () => {
    const { resolveClientId } = await import('@/lib/clients/link');
    await insertUser({ id: 'u-email', name: 'Someone Else', email: 'match@x.com', role: 'client' });
    await insertUser({ id: 'u-name', name: 'Jane Doe', email: 'jane@x.com', role: 'client' });

    const id = await resolveClientId(
      { clientName: 'Jane Doe', clientEmail: 'match@x.com' },
      deps()
    );
    expect(id).toBe('u-email');
  });

  it('Test 2: unambiguous name match (single client user) returns that id', async () => {
    const { resolveClientId } = await import('@/lib/clients/link');
    await insertUser({ id: 'u-1', name: 'John Smith', email: 'john@x.com', role: 'client' });

    const id = await resolveClientId({ clientName: 'John Smith' }, deps());
    expect(id).toBe('u-1');
  });

  it('Test 3: ambiguous name (two client users, same name, no email) auto-creates a NEW user', async () => {
    const { resolveClientId } = await import('@/lib/clients/link');
    await insertUser({ id: 'dup-a', name: 'Ambi Name', email: 'a@x.com', role: 'client' });
    await insertUser({ id: 'dup-b', name: 'Ambi Name', email: 'b@x.com', role: 'client' });

    const id = await resolveClientId({ clientName: 'Ambi Name' }, deps());
    expect(id).not.toBe('dup-a');
    expect(id).not.toBe('dup-b');

    // The new user exists and is a client with a placeholder email.
    const [row] = await db.select().from(schema.user).where(eq(schema.user.id, id));
    expect(row.role).toBe('client');
    expect(row.email).toContain('@placeholder.peak360.local');
  });

  it('Test 4: no match + email present auto-creates client user with that exact email', async () => {
    const { resolveClientId } = await import('@/lib/clients/link');
    const id = await resolveClientId(
      { clientName: 'New Client', clientEmail: 'New@Example.com' },
      deps()
    );
    const [row] = await db.select().from(schema.user).where(eq(schema.user.id, id));
    expect(row.role).toBe('client');
    expect(row.email).toBe('new@example.com'); // lowercased before store
    expect(row.name).toBe('New Client');
  });

  it('Test 6: a coach-role user matched by name is NEVER linked (auto-creates a client)', async () => {
    const { resolveClientId } = await import('@/lib/clients/link');
    await insertUser({ id: 'coach-x', name: 'Coach Person', email: 'coach@x.com', role: 'coach' });

    const id = await resolveClientId(
      { clientName: 'Coach Person', clientEmail: 'coachclient@x.com' },
      deps()
    );
    expect(id).not.toBe('coach-x');
    const [row] = await db.select().from(schema.user).where(eq(schema.user.id, id));
    expect(row.role).toBe('client');
    expect(row.email).toBe('coachclient@x.com');
  });

  it('returns null when neither name nor email is present', async () => {
    const { resolveClientId } = await import('@/lib/clients/link');
    const id = await resolveClientId({}, deps());
    expect(id).toBeNull();
  });

  it('inherits coachId on an auto-created client', async () => {
    const { resolveClientId } = await import('@/lib/clients/link');
    const id = await resolveClientId(
      { clientName: 'Coached Client', clientEmail: 'cc@x.com', coachId: 'coach-77' },
      deps()
    );
    const [row] = await db.select().from(schema.user).where(eq(schema.user.id, id));
    expect(row.coachId).toBe('coach-77');
  });
});

describe('applyClientLink', () => {
  it('Test 5: reassignment repoints client_id from A to B', async () => {
    const { applyClientLink } = await import('@/lib/clients/link');
    await insertUser({ id: 'client-a', name: 'Alpha', email: 'alpha@x.com', role: 'client' });
    await insertUser({ id: 'client-b', name: 'Bravo', email: 'bravo@x.com', role: 'client' });
    await insertAssessment({ id: 'asmt-1', clientName: 'Alpha', clientEmail: 'alpha@x.com' });

    await applyClientLink('asmt-1', { clientName: 'Alpha', clientEmail: 'alpha@x.com' }, deps());
    let [row] = await db.select().from(schema.assessments).where(eq(schema.assessments.id, 'asmt-1'));
    expect(row.clientId).toBe('client-a');

    // Reassign to client B
    await applyClientLink('asmt-1', { clientName: 'Bravo', clientEmail: 'bravo@x.com' }, deps());
    [row] = await db.select().from(schema.assessments).where(eq(schema.assessments.id, 'asmt-1'));
    expect(row.clientId).toBe('client-b');
    expect(row.clientId).not.toBe('client-a');
  });

  it('authoritatively clears client_id to null when nothing matches', async () => {
    const { applyClientLink } = await import('@/lib/clients/link');
    await insertAssessment({ id: 'asmt-2', clientId: 'stale-id' });

    // No name and no email -> resolves to null -> clears the stale id.
    await applyClientLink('asmt-2', {}, deps());
    const [row] = await db.select().from(schema.assessments).where(eq(schema.assessments.id, 'asmt-2'));
    expect(row.clientId).toBeNull();
  });
});

describe('planClientLink (read-only, no writes)', () => {
  it('LINK for an unambiguous existing client', async () => {
    const { planClientLink } = await import('@/lib/clients/link');
    await insertUser({ id: 'p-1', name: 'Plan Client', email: 'plan@x.com', role: 'client' });
    const res = await planClientLink({ clientName: 'Plan Client' }, deps());
    expect(res.action).toBe('LINK');
    expect(res.detail).toBe('p-1');
  });

  it('CREATE-USER for an unmatched email and makes no writes', async () => {
    const { planClientLink } = await import('@/lib/clients/link');
    const before = await db.select().from(schema.user);
    const res = await planClientLink({ clientName: 'Ghost', clientEmail: 'ghost@x.com' }, deps());
    expect(res.action).toBe('CREATE-USER');
    expect(res.detail).toBe('ghost@x.com');
    const after = await db.select().from(schema.user);
    expect(after.length).toBe(before.length); // no user created
  });

  it('CONFLICT for an ambiguous name with no email', async () => {
    const { planClientLink } = await import('@/lib/clients/link');
    await insertUser({ id: 'c-a', name: 'Twin', email: 'twin-a@x.com', role: 'client' });
    await insertUser({ id: 'c-b', name: 'Twin', email: 'twin-b@x.com', role: 'client' });
    const res = await planClientLink({ clientName: 'Twin' }, deps());
    expect(res.action).toBe('CONFLICT');
  });

  it('SKIP when nothing to link', async () => {
    const { planClientLink } = await import('@/lib/clients/link');
    const res = await planClientLink({}, deps());
    expect(res.action).toBe('SKIP');
  });
});

describe('findClientUserByName', () => {
  it('returns id for a single client match', async () => {
    const { findClientUserByName } = await import('@/lib/clients/link');
    await insertUser({ id: 'n-1', name: 'Solo', email: 'solo@x.com', role: 'client' });
    expect(await findClientUserByName('Solo', deps())).toBe('n-1');
  });

  it("returns 'ambiguous' for 2+ client matches", async () => {
    const { findClientUserByName } = await import('@/lib/clients/link');
    await insertUser({ id: 'a-1', name: 'Pair', email: 'p1@x.com', role: 'client' });
    await insertUser({ id: 'a-2', name: 'Pair', email: 'p2@x.com', role: 'client' });
    expect(await findClientUserByName('Pair', deps())).toBe('ambiguous');
  });

  it('ignores coach-role users with the same name', async () => {
    const { findClientUserByName } = await import('@/lib/clients/link');
    await insertUser({ id: 'co-1', name: 'NameClash', email: 'co@x.com', role: 'coach' });
    expect(await findClientUserByName('NameClash', deps())).toBeNull();
  });
});
