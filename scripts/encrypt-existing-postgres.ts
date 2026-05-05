// Postgres-compatible one-time migration to encrypt existing sensitive data.
//
// Mirrors scripts/encrypt-existing.ts (SQLite) but targets a remote/local Postgres
// via DATABASE_URL. Idempotent — already-encrypted rows are skipped via isEncrypted().
//
// Usage:
//   DATABASE_URL=postgres://... ENCRYPTION_KEY=<key> npx tsx scripts/encrypt-existing-postgres.ts
//   DRY_RUN=1 DATABASE_URL=... ENCRYPTION_KEY=... npx tsx scripts/encrypt-existing-postgres.ts
//
// Behaviour:
//   - All writes occur inside a single transaction; any failure rolls back.
//   - DRY_RUN=1 reports counts and a sample of rows without writing.
//   - Encrypts: assessment_sections.data (sections 3,4,5),
//               signatures.signature_data,
//               uploaded_files.extracted_data
import { Pool } from 'pg';
import { encrypt, isEncrypted } from '../src/lib/crypto';

const databaseUrl = process.env.DATABASE_URL;
const encryptionKey = process.env.ENCRYPTION_KEY;
const dryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is required.');
  process.exit(1);
}
if (!encryptionKey) {
  console.error('ENCRYPTION_KEY environment variable is required.');
  process.exit(1);
}

const SENSITIVE_SECTIONS = [3, 4, 5];

const sslDisabled = /[?&]sslmode=disable/i.test(databaseUrl);
const connStr = databaseUrl.replace(/[?&]sslmode=[^&]*/g, '');
const pool = new Pool({
  connectionString: connStr,
  ssl: sslDisabled ? false : { rejectUnauthorized: false },
});

interface Counts {
  sectionsTotal: number;
  sectionsEncrypted: number;
  sectionsAlreadyEncrypted: number;
  sectionsNullOrEmpty: number;
  filesTotal: number;
  filesEncrypted: number;
  filesAlreadyEncrypted: number;
  signaturesTotal: number;
  signaturesEncrypted: number;
  signaturesAlreadyEncrypted: number;
}

async function run(): Promise<Counts> {
  const client = await pool.connect();
  const counts: Counts = {
    sectionsTotal: 0,
    sectionsEncrypted: 0,
    sectionsAlreadyEncrypted: 0,
    sectionsNullOrEmpty: 0,
    filesTotal: 0,
    filesEncrypted: 0,
    filesAlreadyEncrypted: 0,
    signaturesTotal: 0,
    signaturesEncrypted: 0,
    signaturesAlreadyEncrypted: 0,
  };

  try {
    await client.query('BEGIN');

    // 1. assessment_sections.data (sections 3, 4, 5 only)
    const sectionRes = await client.query<{
      id: number;
      section_number: number;
      data: string | null;
    }>(
      `SELECT id, section_number, data
       FROM assessment_sections
       WHERE section_number = ANY($1::int[])`,
      [SENSITIVE_SECTIONS],
    );
    counts.sectionsTotal = sectionRes.rowCount ?? 0;

    for (const row of sectionRes.rows) {
      if (!row.data) {
        counts.sectionsNullOrEmpty++;
        continue;
      }
      if (isEncrypted(row.data)) {
        counts.sectionsAlreadyEncrypted++;
        continue;
      }
      const enc = encrypt(row.data);
      if (!dryRun) {
        await client.query(
          'UPDATE assessment_sections SET data = $1 WHERE id = $2',
          [enc, row.id],
        );
      }
      counts.sectionsEncrypted++;
    }

    // 2. uploaded_files.extracted_data
    const fileRes = await client.query<{
      id: number;
      extracted_data: string | null;
    }>(
      `SELECT id, extracted_data
       FROM uploaded_files
       WHERE extracted_data IS NOT NULL`,
    );
    counts.filesTotal = fileRes.rowCount ?? 0;

    for (const row of fileRes.rows) {
      if (!row.extracted_data) continue;
      if (isEncrypted(row.extracted_data)) {
        counts.filesAlreadyEncrypted++;
        continue;
      }
      const enc = encrypt(row.extracted_data);
      if (!dryRun) {
        await client.query(
          'UPDATE uploaded_files SET extracted_data = $1 WHERE id = $2',
          [enc, row.id],
        );
      }
      counts.filesEncrypted++;
    }

    // 3. signatures.signature_data (table removed in later cleanup; tolerate absence)
    const sigTableExists = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'signatures'
       ) AS exists`,
    );
    const sigRes = sigTableExists.rows[0]?.exists
      ? await client.query<{ id: number; signature_data: string | null }>(
          `SELECT id, signature_data FROM signatures WHERE signature_data IS NOT NULL`,
        )
      : { rowCount: 0, rows: [] as { id: number; signature_data: string | null }[] };
    counts.signaturesTotal = sigRes.rowCount ?? 0;

    for (const row of sigRes.rows) {
      if (!row.signature_data) continue;
      if (isEncrypted(row.signature_data)) {
        counts.signaturesAlreadyEncrypted++;
        continue;
      }
      const enc = encrypt(row.signature_data);
      if (!dryRun) {
        await client.query(
          'UPDATE signatures SET signature_data = $1 WHERE id = $2',
          [enc, row.id],
        );
      }
      counts.signaturesEncrypted++;
    }

    if (dryRun) {
      await client.query('ROLLBACK');
    } else {
      await client.query('COMMIT');
    }

    return counts;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

run()
  .then((c) => {
    const banner = dryRun ? '[DRY RUN — no changes written]' : '[COMMITTED]';
    console.log(banner);
    console.log(`assessment_sections (sections ${SENSITIVE_SECTIONS.join(',')}):`);
    console.log(`  total scanned:        ${c.sectionsTotal}`);
    console.log(`  encrypted this run:   ${c.sectionsEncrypted}`);
    console.log(`  already encrypted:    ${c.sectionsAlreadyEncrypted}`);
    console.log(`  null/empty (skipped): ${c.sectionsNullOrEmpty}`);
    console.log(`uploaded_files.extracted_data:`);
    console.log(`  total scanned:      ${c.filesTotal}`);
    console.log(`  encrypted this run: ${c.filesEncrypted}`);
    console.log(`  already encrypted:  ${c.filesAlreadyEncrypted}`);
    console.log(`signatures.signature_data:`);
    console.log(`  total scanned:      ${c.signaturesTotal}`);
    console.log(`  encrypted this run: ${c.signaturesEncrypted}`);
    console.log(`  already encrypted:  ${c.signaturesAlreadyEncrypted}`);
    return pool.end();
  })
  .catch(async (err) => {
    console.error('Migration failed:', err);
    await pool.end();
    process.exit(1);
  });
