// One-shot: run runMigrations() against whatever DATABASE_URL points at.
// Used to push schema additively to prod before the new code is deployed.
//
// Usage: DATABASE_URL=postgres://... npx tsx scripts/run-migrations.ts

(async () => {
  const masked = process.env.DATABASE_URL?.replace(/:[^@]+@/, ':***@');
  console.log('Target DATABASE_URL:', masked);
  const { runMigrations } = await import('../src/lib/db/index');
  console.log('Running migrations...');
  await runMigrations();
  console.log('Migrations complete.');
  process.exit(0);
})().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
