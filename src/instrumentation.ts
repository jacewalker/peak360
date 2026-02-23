export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { runMigrations } = await import('@/lib/db');
    try {
      await runMigrations();
    } catch (e) {
      console.error('Migration failed (non-fatal):', e);
    }
  }
}
