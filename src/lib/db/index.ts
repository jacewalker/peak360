import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof drizzle<typeof schema>> | undefined;
};

if (!globalForDb.db) {
  globalForDb.db = drizzle(process.env.DATABASE_URL!, { schema });
}

export const db = globalForDb.db;
