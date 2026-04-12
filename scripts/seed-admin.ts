// Usage: npx tsx scripts/seed-admin.ts
// Requires ADMIN_EMAIL and ADMIN_PASSWORD env vars (or uses defaults for dev)

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@peak360.com.au';
  const password = process.env.ADMIN_PASSWORD ?? 'changeme123';

  console.log(`Seeding admin account: ${email}`);

  const baseUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';

  // Sign up the user via Better Auth API
  const signUpRes = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: 'Admin' }),
  });

  if (!signUpRes.ok) {
    const err = await signUpRes.text();
    if (err.includes('already exists') || err.includes('UNIQUE constraint')) {
      console.log('Admin account already exists, skipping.');
      return;
    }
    console.error('Failed to create admin:', err);
    process.exit(1);
  }

  // Set admin role directly in DB
  const { db } = await import('../src/lib/db/index');
  const isPostgres = !!process.env.DATABASE_URL;
  const schema = isPostgres
    ? await import('../src/lib/db/schema')
    : await import('../src/lib/db/schema-sqlite');

  const { eq } = await import('drizzle-orm');
  await db
    .update(schema.user)
    .set({ role: 'admin' })
    .where(eq(schema.user.email, email));

  console.log('Admin account created and role set to admin.');
}

seedAdmin().catch(console.error);
