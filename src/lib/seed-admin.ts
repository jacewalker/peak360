// Idempotent primary-admin seeder. Called once at app boot from runMigrations().
// Reads PRIMARY_SEED_ADMIN_USERNAME (email) and PRIMARY_SEED_ADMIN_PASSWORD.
// Skips if env vars are unset, or if any admin user already exists.

import { eq } from 'drizzle-orm';

let seeded = false;

export async function seedPrimaryAdmin(): Promise<void> {
  if (seeded) return;
  seeded = true;

  const email = process.env.PRIMARY_SEED_ADMIN_USERNAME;
  const password = process.env.PRIMARY_SEED_ADMIN_PASSWORD;
  if (!email || !password) return;

  const { db } = await import('./db');
  const isPostgres = !!process.env.DATABASE_URL;
  const schema = isPostgres
    ? await import('./db/schema')
    : await import('./db/schema-sqlite');

  const existingAdmin = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.role, 'admin'))
    .limit(1);

  if (existingAdmin.length > 0) return;

  const { auth } = await import('./auth');

  try {
    await auth.api.signUpEmail({
      body: { email, password, name: 'Admin' },
      headers: new Headers({ origin: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000' }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('already')) return;
    console.error('[seed-admin] sign-up failed:', msg);
    return;
  }

  await db
    .update(schema.user)
    .set({ role: 'admin' })
    .where(eq(schema.user.email, email));

  console.log(`[seed-admin] primary admin seeded: ${email}`);
}
