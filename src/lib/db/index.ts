import { sql } from 'drizzle-orm';

const isPostgres = !!process.env.DATABASE_URL;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForDb = globalThis as unknown as { db: any; migrated: boolean };

function getDb() {
  if (!globalForDb.db) {
    if (isPostgres) {
      const { drizzle } = require('drizzle-orm/node-postgres');
      const { Pool } = require('pg');
      const schema = require('./schema');
      const connStr = process.env.DATABASE_URL!.replace(/[?&]sslmode=[^&]*/g, '');
      const pool = new Pool({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false },
      });
      globalForDb.db = drizzle(pool, { schema });
    } else {
      const { drizzle } = require('drizzle-orm/better-sqlite3');
      const Database = require('better-sqlite3');
      const schema = require('./schema-sqlite');
      const sqlite = new Database('local.db');
      sqlite.pragma('journal_mode = WAL');
      sqlite.pragma('foreign_keys = ON');
      globalForDb.db = drizzle(sqlite, { schema });
    }
  }
  return globalForDb.db;
}

export const db = new Proxy({} as any, {
  get(_, prop) {
    return (getDb() as any)[prop];
  },
});

export async function runMigrations() {
  if (globalForDb.migrated) return;
  const d = getDb();

  if (isPostgres) {
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
    await d.execute(sql`
      CREATE TABLE IF NOT EXISTS "assessment_sections" (
        "id" serial PRIMARY KEY NOT NULL,
        "assessment_id" text NOT NULL REFERENCES "assessments"("id") ON DELETE CASCADE,
        "section_number" integer NOT NULL,
        "data" jsonb,
        "completed_at" text
      )
    `);
    await d.execute(sql`
      CREATE TABLE IF NOT EXISTS "signatures" (
        "id" serial PRIMARY KEY NOT NULL,
        "assessment_id" text NOT NULL REFERENCES "assessments"("id") ON DELETE CASCADE,
        "type" text NOT NULL,
        "signer_name" text,
        "signature_data" text,
        "signed_date" text
      )
    `);
    await d.execute(sql`
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
  } else {
    d.run(sql`
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
    d.run(sql`
      CREATE TABLE IF NOT EXISTS "assessment_sections" (
        "id" integer PRIMARY KEY AUTOINCREMENT,
        "assessment_id" text NOT NULL REFERENCES "assessments"("id") ON DELETE CASCADE,
        "section_number" integer NOT NULL,
        "data" text,
        "completed_at" text
      )
    `);
    d.run(sql`
      CREATE TABLE IF NOT EXISTS "signatures" (
        "id" integer PRIMARY KEY AUTOINCREMENT,
        "assessment_id" text NOT NULL REFERENCES "assessments"("id") ON DELETE CASCADE,
        "type" text NOT NULL,
        "signer_name" text,
        "signature_data" text,
        "signed_date" text
      )
    `);
    d.run(sql`
      CREATE TABLE IF NOT EXISTS "uploaded_files" (
        "id" integer PRIMARY KEY AUTOINCREMENT,
        "assessment_id" text NOT NULL REFERENCES "assessments"("id") ON DELETE CASCADE,
        "section_number" integer NOT NULL,
        "file_name" text,
        "extracted_data" text,
        "verification_result" text,
        "status" text DEFAULT 'pending',
        "created_at" text NOT NULL
      )
    `);
  }

  globalForDb.migrated = true;
}
