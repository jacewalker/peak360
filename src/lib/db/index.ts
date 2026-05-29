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
    // `signatures` table removed — signatures live inside assessment_sections.data
    await d.execute(sql`DROP TABLE IF EXISTS "signatures"`);
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

    // user.coach_id — assigns a client to a specific coach independently of
    // any assessment. Nullable; only meaningful for role='client' rows.
    await d.execute(sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "coach_id" text`);

    // Phase 7.1 — convert user.email_verified and user.banned from INTEGER
    // (Phase 4 legacy) to BOOLEAN. Better Auth's admin-plugin createUser
    // sends actual booleans, which PG rejects against an integer column —
    // that's the "Failed to create user account" bug visible on every invite.
    // Idempotent: ALTER only fires when the column is still integer. The
    // explicit CASE preserves 0→false, 1→true verbatim.
    await d.execute(sql`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'user' AND column_name = 'email_verified' AND data_type = 'integer'
        ) THEN
          ALTER TABLE "user"
            ALTER COLUMN "email_verified" TYPE boolean
            USING CASE WHEN "email_verified" = 0 THEN false ELSE true END;
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'user' AND column_name = 'banned' AND data_type = 'integer'
        ) THEN
          ALTER TABLE "user"
            ALTER COLUMN "banned" TYPE boolean
            USING CASE WHEN "banned" = 0 THEN false ELSE true END;
        END IF;
      END $$;
    `);

    // Phase 8 — Peak Living pillar tables
    await d.execute(sql`
      CREATE TABLE IF NOT EXISTS "pillar_definitions" (
        "pillar_key" text PRIMARY KEY NOT NULL,
        "label" text NOT NULL,
        "short_summary" text NOT NULL,
        "plain_meaning" text NOT NULL,
        "sort_order" integer NOT NULL,
        "updated_by" text NOT NULL,
        "updated_at" bigint NOT NULL
      )
    `);

    await d.execute(sql`
      CREATE TABLE IF NOT EXISTS "pillar_page_copy" (
        "id" serial PRIMARY KEY NOT NULL,
        "heading" text NOT NULL,
        "intro" text NOT NULL,
        "updated_by" text NOT NULL,
        "updated_at" bigint NOT NULL
      )
    `);

    await d.execute(sql`
      CREATE TABLE IF NOT EXISTS "pillar_prescriptions" (
        "assessment_id" text NOT NULL REFERENCES "assessments"("id") ON DELETE CASCADE,
        "pillar_key" text NOT NULL,
        "summary" text NOT NULL,
        "bullets" jsonb,
        "full_plan_href" text,
        "updated_by" text NOT NULL,
        "updated_at" bigint NOT NULL,
        PRIMARY KEY ("assessment_id", "pillar_key")
      )
    `);

    // Idempotent seed — pillar definitions (D-18; copy verbatim from 08-UI-SPEC.md)
    {
      const now8 = Date.now();
      await d.execute(sql`
        INSERT INTO "pillar_definitions" ("pillar_key", "label", "short_summary", "plain_meaning", "sort_order", "updated_by", "updated_at")
        VALUES
          ('cardiometabolic', 'Cardiometabolic Health', 'How well your heart, vessels, and metabolism are working together.', 'Cardiometabolic health covers the markers that drive long-term heart, vessel, and metabolic function — cholesterol balance, blood sugar control, inflammation, and blood pressure. Strong numbers here mean your engine is running clean.', 0, 'system', ${now8}),
          ('vo2', 'VO2 / Fitness Capacity', 'The size of your aerobic engine — the single best predictor of all-cause mortality.', 'VO2 max measures how efficiently your body uses oxygen during effort. It is one of the strongest predictors of healthspan and is highly trainable at any age. A larger aerobic engine means more capacity for everything else.', 1, 'system', ${now8}),
          ('bodyComposition', 'Body Composition', 'The balance of muscle, fat, and where it sits on your frame.', 'Body composition looks beyond weight — at the proportion of muscle to fat and how it''s distributed. A favourable composition supports metabolic health, joint longevity, and how capable you feel day-to-day.', 2, 'system', ${now8}),
          ('strength', 'Strength', 'Your ability to produce force — a leading indicator of healthy ageing.', 'Strength is one of the clearest signals of how well you are ageing. The ability to lift, push, and grip translates directly into independence, injury resistance, and quality of life as the decades roll on.', 3, 'system', ${now8}),
          ('balance', 'Balance', 'Stability and proprioception — your body''s quiet defence against falls.', 'Balance combines coordination, proprioception, and postural control. Strong balance now means a dramatically lower fall risk later, and it tracks closely with overall neurological and musculoskeletal health.', 4, 'system', ${now8})
        ON CONFLICT ("pillar_key") DO NOTHING
      `);

      // Idempotent seed — page copy (D-19; one row only)
      await d.execute(sql`
        INSERT INTO "pillar_page_copy" ("heading", "intro", "updated_by", "updated_at")
        SELECT 'The Peak Living Pillars',
               'Peak360 translates your results into five core pillars to show where you are performing strongly, where you may be exposed, and where focused intervention can help move you toward peak living.',
               'system',
               ${now8}
        WHERE NOT EXISTS (SELECT 1 FROM "pillar_page_copy")
      `);
    }

    // Phase 11 — Admin-authored marker content (D-08)
    await d.execute(sql`
      CREATE TABLE IF NOT EXISTS "marker_content" (
        "test_key" text PRIMARY KEY NOT NULL,
        "definition" text,
        "impact" text,
        "coach_insights" jsonb,
        "updated_by" text NOT NULL,
        "updated_at" bigint NOT NULL
      )
    `);

    // Idempotent seed — marker content (D-09; insert-if-absent per test_key,
    // never overwrites admin edits). One INSERT per marker keeps each statement
    // small and the conflict target unambiguous.
    {
      const now11 = Date.now();
      const { SEED_MARKER_CONTENT } = require('@/lib/marker-content/seed-content');
      const { REPORT_MARKERS } = require('@/lib/report-markers');
      for (const m of REPORT_MARKERS) {
        const c = SEED_MARKER_CONTENT[m.testKey];
        if (!c) continue;
        await d.execute(sql`
          INSERT INTO "marker_content" ("test_key", "definition", "impact", "coach_insights", "updated_by", "updated_at")
          VALUES (${m.testKey}, ${c.definition}, ${c.impact}, ${JSON.stringify(c.coachInsights)}::jsonb, 'system', ${now11})
          ON CONFLICT ("test_key") DO NOTHING
        `);
      }
    }

    // Phase 12 — Admin-managed marker registry (D-02). Idempotent CREATE so
    // forward-deploy environments converge without a migration step. No seed
    // (D-03 - seeded markers stay in REPORT_MARKERS source).
    await d.execute(sql`
      CREATE TABLE IF NOT EXISTS "markers" (
        "test_key" text PRIMARY KEY NOT NULL,
        "label" text NOT NULL,
        "section" integer NOT NULL,
        "data_key" text NOT NULL,
        "pillar" text NOT NULL,
        "category" text NOT NULL,
        "subcategory" text,
        "fallback_unit" text,
        "has_norms" boolean NOT NULL,
        "ai_aliases" jsonb,
        "severity_weight" integer,
        "created_by" text NOT NULL,
        "created_at" bigint NOT NULL,
        "updated_by" text NOT NULL,
        "updated_at" bigint NOT NULL
      )
    `);

    // Append-only client notes log (keyed by client name)
    await d.execute(sql`
      CREATE TABLE IF NOT EXISTS "client_notes" (
        "id" text PRIMARY KEY NOT NULL,
        "client_name" text NOT NULL,
        "author_id" text NOT NULL,
        "author_name" text NOT NULL,
        "body" text NOT NULL,
        "created_at" text NOT NULL
      )
    `);
    await d.execute(sql`CREATE INDEX IF NOT EXISTS "idx_client_notes_client_name" ON "client_notes" ("client_name")`);

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
    // `signatures` table removed — signatures live inside assessment_sections.data
    d.run(sql`DROP TABLE IF EXISTS "signatures"`);
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
        "coach_id" text,
        "banned" integer,
        "ban_reason" text,
        "ban_expires" integer,
        "created_at" text NOT NULL,
        "updated_at" text NOT NULL
      )
    `);
    try {
      d.run(sql`ALTER TABLE "user" ADD COLUMN "coach_id" text`);
    } catch { /* column already exists */ }
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

    // Phase 8 — Peak Living pillar tables
    d.run(sql`
      CREATE TABLE IF NOT EXISTS "pillar_definitions" (
        "pillar_key" text PRIMARY KEY NOT NULL,
        "label" text NOT NULL,
        "short_summary" text NOT NULL,
        "plain_meaning" text NOT NULL,
        "sort_order" integer NOT NULL,
        "updated_by" text NOT NULL,
        "updated_at" integer NOT NULL
      )
    `);

    d.run(sql`
      CREATE TABLE IF NOT EXISTS "pillar_page_copy" (
        "id" integer PRIMARY KEY AUTOINCREMENT,
        "heading" text NOT NULL,
        "intro" text NOT NULL,
        "updated_by" text NOT NULL,
        "updated_at" integer NOT NULL
      )
    `);

    d.run(sql`
      CREATE TABLE IF NOT EXISTS "pillar_prescriptions" (
        "assessment_id" text NOT NULL REFERENCES "assessments"("id") ON DELETE CASCADE,
        "pillar_key" text NOT NULL,
        "summary" text NOT NULL,
        "bullets" text,
        "full_plan_href" text,
        "updated_by" text NOT NULL,
        "updated_at" integer NOT NULL,
        PRIMARY KEY ("assessment_id", "pillar_key")
      )
    `);

    // Idempotent seed — pillar definitions (D-18; copy verbatim from 08-UI-SPEC.md)
    {
      const now8 = Date.now();
      d.run(sql`
        INSERT OR IGNORE INTO "pillar_definitions" ("pillar_key", "label", "short_summary", "plain_meaning", "sort_order", "updated_by", "updated_at")
        VALUES
          ('cardiometabolic', 'Cardiometabolic Health', 'How well your heart, vessels, and metabolism are working together.', 'Cardiometabolic health covers the markers that drive long-term heart, vessel, and metabolic function — cholesterol balance, blood sugar control, inflammation, and blood pressure. Strong numbers here mean your engine is running clean.', 0, 'system', ${now8}),
          ('vo2', 'VO2 / Fitness Capacity', 'The size of your aerobic engine — the single best predictor of all-cause mortality.', 'VO2 max measures how efficiently your body uses oxygen during effort. It is one of the strongest predictors of healthspan and is highly trainable at any age. A larger aerobic engine means more capacity for everything else.', 1, 'system', ${now8}),
          ('bodyComposition', 'Body Composition', 'The balance of muscle, fat, and where it sits on your frame.', 'Body composition looks beyond weight — at the proportion of muscle to fat and how it''s distributed. A favourable composition supports metabolic health, joint longevity, and how capable you feel day-to-day.', 2, 'system', ${now8}),
          ('strength', 'Strength', 'Your ability to produce force — a leading indicator of healthy ageing.', 'Strength is one of the clearest signals of how well you are ageing. The ability to lift, push, and grip translates directly into independence, injury resistance, and quality of life as the decades roll on.', 3, 'system', ${now8}),
          ('balance', 'Balance', 'Stability and proprioception — your body''s quiet defence against falls.', 'Balance combines coordination, proprioception, and postural control. Strong balance now means a dramatically lower fall risk later, and it tracks closely with overall neurological and musculoskeletal health.', 4, 'system', ${now8})
      `);

      // Idempotent seed — page copy (D-19; one row only)
      d.run(sql`
        INSERT INTO "pillar_page_copy" ("heading", "intro", "updated_by", "updated_at")
        SELECT 'The Peak Living Pillars',
               'Peak360 translates your results into five core pillars to show where you are performing strongly, where you may be exposed, and where focused intervention can help move you toward peak living.',
               'system',
               ${now8}
        WHERE NOT EXISTS (SELECT 1 FROM "pillar_page_copy")
      `);
    }

    // Phase 11 — Admin-authored marker content (D-08). SQLite stores the
    // coach_insights JSON as text and updated_at as integer epoch ms.
    d.run(sql`
      CREATE TABLE IF NOT EXISTS "marker_content" (
        "test_key" text PRIMARY KEY NOT NULL,
        "definition" text,
        "impact" text,
        "coach_insights" text,
        "updated_by" text NOT NULL,
        "updated_at" integer NOT NULL
      )
    `);

    // Idempotent seed — marker content (D-09; INSERT OR IGNORE never
    // overwrites admin edits). coach_insights serialized to JSON text.
    {
      const now11 = Date.now();
      const { SEED_MARKER_CONTENT } = require('@/lib/marker-content/seed-content');
      const { REPORT_MARKERS } = require('@/lib/report-markers');
      for (const m of REPORT_MARKERS) {
        const c = SEED_MARKER_CONTENT[m.testKey];
        if (!c) continue;
        d.run(sql`
          INSERT OR IGNORE INTO "marker_content" ("test_key", "definition", "impact", "coach_insights", "updated_by", "updated_at")
          VALUES (${m.testKey}, ${c.definition}, ${c.impact}, ${JSON.stringify(c.coachInsights)}, 'system', ${now11})
        `);
      }
    }

    // Phase 12 — Admin-managed marker registry (D-02). SQLite mirror; booleans
    // are integer (0/1), JSON is text.
    d.run(sql`
      CREATE TABLE IF NOT EXISTS "markers" (
        "test_key" text PRIMARY KEY NOT NULL,
        "label" text NOT NULL,
        "section" integer NOT NULL,
        "data_key" text NOT NULL,
        "pillar" text NOT NULL,
        "category" text NOT NULL,
        "subcategory" text,
        "fallback_unit" text,
        "has_norms" integer NOT NULL,
        "ai_aliases" text,
        "severity_weight" integer,
        "created_by" text NOT NULL,
        "created_at" integer NOT NULL,
        "updated_by" text NOT NULL,
        "updated_at" integer NOT NULL
      )
    `);

    // Append-only client notes log (keyed by client name)
    d.run(sql`
      CREATE TABLE IF NOT EXISTS "client_notes" (
        "id" text PRIMARY KEY NOT NULL,
        "client_name" text NOT NULL,
        "author_id" text NOT NULL,
        "author_name" text NOT NULL,
        "body" text NOT NULL,
        "created_at" text NOT NULL
      )
    `);
    d.run(sql`CREATE INDEX IF NOT EXISTS "idx_client_notes_client_name" ON "client_notes" ("client_name")`);

  }

  // Start backup scheduler for SQLite (must be called at app startup)
  try {
    const { startBackupScheduler } = require('@/lib/backup');
    startBackupScheduler();
  } catch {
    // Backup module may not be available in all environments
  }

  globalForDb.migrated = true;

  // Idempotent primary admin seed — runs once per process, only if env vars set
  // and no admin user exists yet. Errors are logged but never crash the app.
  try {
    const { seedPrimaryAdmin } = require('@/lib/seed-admin');
    await seedPrimaryAdmin();
  } catch (err) {
    console.error('[seed-admin] unexpected error:', err);
  }
}
