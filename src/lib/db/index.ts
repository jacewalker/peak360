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
      const rawUrl = process.env.DATABASE_URL!;
      const sslDisabled = /[?&]sslmode=disable/i.test(rawUrl);
      const connStr = rawUrl.replace(/[?&]sslmode=[^&]*/g, '');
      const pool = new Pool({
        connectionString: connStr,
        ssl: sslDisabled ? false : { rejectUnauthorized: false },
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
        "data" text,
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
        "extracted_data" text,
        "verification_result" jsonb,
        "status" text DEFAULT 'pending',
        "created_at" text NOT NULL
      )
    `);
    await d.execute(sql`
      CREATE TABLE IF NOT EXISTS "normative_ranges" (
        "id" serial PRIMARY KEY NOT NULL,
        "test_key" text NOT NULL,
        "category" text NOT NULL,
        "gender" text,
        "age_group" text,
        "unit" text,
        "note" text,
        "tiers" jsonb,
        "severity_weight" integer,
        "created_at" text NOT NULL,
        "updated_at" text NOT NULL
      )
    `);
    await d.execute(sql`
      CREATE TABLE IF NOT EXISTS "normative_versions" (
        "id" text PRIMARY KEY NOT NULL,
        "ranges_json" jsonb,
        "content_hash" text NOT NULL,
        "created_at" text NOT NULL
      )
    `);
    await d.execute(sql`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL,
        "action" text NOT NULL,
        "resource_type" text NOT NULL,
        "resource_id" text NOT NULL,
        "metadata" jsonb,
        "ip_address" text,
        "user_agent" text,
        "created_at" text NOT NULL
      )
    `);
    await d.execute(sql`ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "normative_version_id" text`);
    await d.execute(sql`ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "coach_id" text`);
    await d.execute(sql`ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "client_id" text`);

    // Better Auth tables
    await d.execute(sql`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "email" text NOT NULL UNIQUE,
        "email_verified" integer,
        "image" text,
        "role" text DEFAULT 'coach',
        "banned" integer,
        "ban_reason" text,
        "ban_expires" integer,
        "created_at" text NOT NULL,
        "updated_at" text NOT NULL
      )
    `);
    await d.execute(sql`
      CREATE TABLE IF NOT EXISTS "session" (
        "id" text PRIMARY KEY NOT NULL,
        "expires_at" text NOT NULL,
        "token" text NOT NULL UNIQUE,
        "ip_address" text,
        "user_agent" text,
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "impersonated_by" text,
        "created_at" text NOT NULL,
        "updated_at" text NOT NULL
      )
    `);
    await d.execute(sql`
      CREATE TABLE IF NOT EXISTS "account" (
        "id" text PRIMARY KEY NOT NULL,
        "account_id" text NOT NULL,
        "provider_id" text NOT NULL,
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "access_token" text,
        "refresh_token" text,
        "id_token" text,
        "access_token_expires_at" text,
        "refresh_token_expires_at" text,
        "scope" text,
        "password" text,
        "created_at" text NOT NULL,
        "updated_at" text NOT NULL
      )
    `);
    await d.execute(sql`
      CREATE TABLE IF NOT EXISTS "verification" (
        "id" text PRIMARY KEY NOT NULL,
        "identifier" text NOT NULL,
        "value" text NOT NULL,
        "expires_at" text NOT NULL,
        "created_at" text,
        "updated_at" text
      )
    `);

    // Migrate encrypted columns from jsonb to text for ciphertext storage
    try {
      await d.execute(sql`ALTER TABLE "assessment_sections" ALTER COLUMN "data" TYPE text USING "data"::text`);
    } catch { /* column may already be text */ }
    try {
      await d.execute(sql`ALTER TABLE "uploaded_files" ALTER COLUMN "extracted_data" TYPE text USING "extracted_data"::text`);
    } catch { /* column may already be text */ }

    // Audit logs table
    await d.execute(sql`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL,
        "action" text NOT NULL,
        "resource_type" text NOT NULL,
        "resource_id" text NOT NULL,
        "metadata" jsonb,
        "ip_address" text,
        "user_agent" text,
        "created_at" text NOT NULL
      )
    `);
    await d.execute(sql`CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "audit_logs" ("user_id")`);
    await d.execute(sql`CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "audit_logs" ("action")`);
    await d.execute(sql`CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs" ("created_at")`);

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
    d.run(sql`
      CREATE TABLE IF NOT EXISTS "normative_ranges" (
        "id" integer PRIMARY KEY AUTOINCREMENT,
        "test_key" text NOT NULL,
        "category" text NOT NULL,
        "gender" text,
        "age_group" text,
        "unit" text,
        "note" text,
        "tiers" text,
        "severity_weight" integer,
        "created_at" text NOT NULL,
        "updated_at" text NOT NULL
      )
    `);
    d.run(sql`
      CREATE TABLE IF NOT EXISTS "normative_versions" (
        "id" text PRIMARY KEY NOT NULL,
        "ranges_json" text,
        "content_hash" text NOT NULL,
        "created_at" text NOT NULL
      )
    `);
    d.run(sql`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL,
        "action" text NOT NULL,
        "resource_type" text NOT NULL,
        "resource_id" text NOT NULL,
        "metadata" text,
        "ip_address" text,
        "user_agent" text,
        "created_at" text NOT NULL
      )
    `);
    try {
      d.run(sql`ALTER TABLE "assessments" ADD COLUMN "normative_version_id" text`);
    } catch { /* column already exists */ }
    try {
      d.run(sql`ALTER TABLE "assessments" ADD COLUMN "coach_id" text`);
    } catch { /* column already exists */ }
    try {
      d.run(sql`ALTER TABLE "assessments" ADD COLUMN "client_id" text`);
    } catch { /* column already exists */ }

    // Better Auth tables
    d.run(sql`
      CREATE TABLE IF NOT EXISTS "user" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "email" text NOT NULL UNIQUE,
        "email_verified" integer,
        "image" text,
        "role" text DEFAULT 'coach',
        "banned" integer,
        "ban_reason" text,
        "ban_expires" integer,
        "created_at" text NOT NULL,
        "updated_at" text NOT NULL
      )
    `);
    d.run(sql`
      CREATE TABLE IF NOT EXISTS "session" (
        "id" text PRIMARY KEY NOT NULL,
        "expires_at" text NOT NULL,
        "token" text NOT NULL UNIQUE,
        "ip_address" text,
        "user_agent" text,
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "impersonated_by" text,
        "created_at" text NOT NULL,
        "updated_at" text NOT NULL
      )
    `);
    d.run(sql`
      CREATE TABLE IF NOT EXISTS "account" (
        "id" text PRIMARY KEY NOT NULL,
        "account_id" text NOT NULL,
        "provider_id" text NOT NULL,
        "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "access_token" text,
        "refresh_token" text,
        "id_token" text,
        "access_token_expires_at" text,
        "refresh_token_expires_at" text,
        "scope" text,
        "password" text,
        "created_at" text NOT NULL,
        "updated_at" text NOT NULL
      )
    `);
    d.run(sql`
      CREATE TABLE IF NOT EXISTS "verification" (
        "id" text PRIMARY KEY NOT NULL,
        "identifier" text NOT NULL,
        "value" text NOT NULL,
        "expires_at" text NOT NULL,
        "created_at" text,
        "updated_at" text
      )
    `);

    // Audit logs table
    d.run(sql`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL,
        "action" text NOT NULL,
        "resource_type" text NOT NULL,
        "resource_id" text NOT NULL,
        "metadata" text,
        "ip_address" text,
        "user_agent" text,
        "created_at" text NOT NULL
      )
    `);
    d.run(sql`CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "audit_logs" ("user_id")`);
    d.run(sql`CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "audit_logs" ("action")`);
    d.run(sql`CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs" ("created_at")`);

  }

  // Start backup scheduler for SQLite (must be called at app startup)
  try {
    const { startBackupScheduler } = require('@/lib/backup');
    startBackupScheduler();
  } catch {
    // Backup module may not be available in all environments
  }

  globalForDb.migrated = true;
}
