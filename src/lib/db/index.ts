import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof drizzle<typeof schema>> | undefined;
};

if (!globalForDb.db) {
  const dbUrl = process.env.DATABASE_URL!;
  const separator = dbUrl.includes('?') ? '&' : '?';
  globalForDb.db = drizzle(`${dbUrl}${separator}sslmode=no-verify`, { schema });
}

export const db = globalForDb.db;
