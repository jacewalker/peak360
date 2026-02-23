import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import path from 'path';
import * as schema from './schema';

function getDbUrl() {
  const dbUrl = process.env.DATABASE_URL!;
  const separator = dbUrl.includes('?') ? '&' : '?';
  return `${dbUrl}${separator}sslmode=no-verify`;
}

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof drizzle<typeof schema>> | undefined;
  migrated: boolean;
};

if (!globalForDb.db) {
  globalForDb.db = drizzle(getDbUrl(), { schema });
}

export const db = globalForDb.db;

export async function runMigrations() {
  if (globalForDb.migrated) return;
  await migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
  globalForDb.migrated = true;
}
