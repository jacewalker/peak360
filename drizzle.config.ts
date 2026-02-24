import { defineConfig } from 'drizzle-kit';

const isPostgres = !!process.env.DATABASE_URL;

export default defineConfig(
  isPostgres
    ? {
        schema: './src/lib/db/schema.ts',
        out: './drizzle',
        dialect: 'postgresql',
        dbCredentials: {
          url: process.env.DATABASE_URL!,
          ssl: { rejectUnauthorized: false },
        },
      }
    : {
        schema: './src/lib/db/schema-sqlite.ts',
        out: './drizzle-sqlite',
        dialect: 'sqlite',
        dbCredentials: {
          url: './local.db',
        },
      }
);
