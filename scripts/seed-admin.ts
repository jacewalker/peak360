// Manual primary-admin seeder — useful for one-off seeding or local dev.
// Reads PRIMARY_SEED_ADMIN_USERNAME and PRIMARY_SEED_ADMIN_PASSWORD.
// In production, the same logic also runs automatically at app boot via
// src/lib/seed-admin.ts (called from runMigrations()).
//
// Usage:
//   PRIMARY_SEED_ADMIN_USERNAME=admin@peak360.com.au \
//   PRIMARY_SEED_ADMIN_PASSWORD=<password> \
//   DATABASE_URL=<optional, postgres> \
//     npx tsx scripts/seed-admin.ts

async function main() {
  const email = process.env.PRIMARY_SEED_ADMIN_USERNAME;
  const password = process.env.PRIMARY_SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('PRIMARY_SEED_ADMIN_USERNAME and PRIMARY_SEED_ADMIN_PASSWORD must be set.');
    process.exit(1);
  }

  console.log(`Seeding primary admin: ${email}`);

  const { runMigrations } = await import('../src/lib/db/index');
  await runMigrations(); // also triggers seedPrimaryAdmin() if env vars are present

  console.log('Done. (If admin already existed, no changes were made.)');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
