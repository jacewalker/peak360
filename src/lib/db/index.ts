import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof drizzle<typeof schema>> | undefined;
};

if (!globalForDb.db) {
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.set('sslmode', 'no-verify');
  globalForDb.db = drizzle(url.toString(), { schema });
}

export const db = globalForDb.db;
