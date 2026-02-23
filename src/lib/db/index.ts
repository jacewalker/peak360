import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

function getDbUrl() {
  return process.env.DATABASE_URL ?? '';
}

const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof drizzle<typeof schema>> | undefined;
  migrated: boolean;
};

function getDb() {
  if (!globalForDb.db) {
    globalForDb.db = drizzle(getDbUrl(), { schema });
  }
  return globalForDb.db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    return (getDb() as any)[prop];
  },
});

export async function runMigrations() {
  if (globalForDb.migrated) return;
  const d = getDb();
  await d.execute(sql`
    CREATE TABLE IF NOT EXISTS "assessments" (
      "id" text PRIMARY KEY NOT NULL,
      "client_name" text,
      "client_email" text,
      "client_dob" text,
      "client_gender" text,
      "assessment_date" text,
      "current_section" integer DEFAULT 1,
      "status" text DEFAULT 'in_progress',
      "created_at" text NOT NULL,
      "updated_at" text NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "assessment_sections" (
      "id" serial PRIMARY KEY NOT NULL,
      "assessment_id" text NOT NULL REFERENCES "assessments"("id") ON DELETE CASCADE,
      "section_number" integer NOT NULL,
      "data" jsonb,
      "completed_at" text
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "signatures" (
      "id" serial PRIMARY KEY NOT NULL,
      "assessment_id" text NOT NULL REFERENCES "assessments"("id") ON DELETE CASCADE,
      "type" text NOT NULL,
      "signer_name" text,
      "signature_data" text,
      "signed_date" text
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "uploaded_files" (
      "id" serial PRIMARY KEY NOT NULL,
      "assessment_id" text NOT NULL REFERENCES "assessments"("id") ON DELETE CASCADE,
      "section_number" integer NOT NULL,
      "file_name" text,
      "extracted_data" jsonb,
      "verification_result" jsonb,
      "status" text DEFAULT 'pending',
      "created_at" text NOT NULL
    )
  `);
  globalForDb.migrated = true;
}
