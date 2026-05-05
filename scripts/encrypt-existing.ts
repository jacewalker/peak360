// Run with: ENCRYPTION_KEY=<key> npx tsx scripts/encrypt-existing.ts
import Database from 'better-sqlite3';
import { encrypt, isEncrypted } from '../src/lib/crypto';

const key = process.env.ENCRYPTION_KEY;
if (!key) {
  console.error('ENCRYPTION_KEY environment variable is required.');
  process.exit(1);
}

const db = new Database('local.db', { readonly: false });
db.pragma('journal_mode = WAL');

const SENSITIVE_SECTIONS = [3, 4, 5];

const transaction = db.transaction(() => {
  // Encrypt assessment_sections.data for sensitive sections
  const sectionRows = db.prepare(
    `SELECT id, section_number, data FROM assessment_sections WHERE section_number IN (${SENSITIVE_SECTIONS.join(',')})`
  ).all() as { id: number; section_number: number; data: string | null }[];

  let sectionCount = 0;
  for (const row of sectionRows) {
    if (!row.data || isEncrypted(row.data)) continue;
    const enc = encrypt(row.data);
    db.prepare('UPDATE assessment_sections SET data = ? WHERE id = ?').run(enc, row.id);
    sectionCount++;
  }

  // Encrypt uploaded_files.extracted_data
  const fileRows = db.prepare(
    'SELECT id, extracted_data FROM uploaded_files WHERE extracted_data IS NOT NULL'
  ).all() as { id: number; extracted_data: string | null }[];

  let fileCount = 0;
  for (const row of fileRows) {
    if (!row.extracted_data || isEncrypted(row.extracted_data)) continue;
    const enc = encrypt(row.extracted_data);
    db.prepare('UPDATE uploaded_files SET extracted_data = ? WHERE id = ?').run(enc, row.id);
    fileCount++;
  }

  // Encrypt signatures.signature_data
  const sigRows = db.prepare(
    'SELECT id, signature_data FROM signatures WHERE signature_data IS NOT NULL'
  ).all() as { id: number; signature_data: string | null }[];

  let sigCount = 0;
  for (const row of sigRows) {
    if (!row.signature_data || isEncrypted(row.signature_data)) continue;
    const enc = encrypt(row.signature_data);
    db.prepare('UPDATE signatures SET signature_data = ? WHERE id = ?').run(enc, row.id);
    sigCount++;
  }

  return { sectionCount, fileCount, sigCount };
});

const result = transaction();
console.log(
  `Encrypted ${result.sectionCount} assessment_sections rows, ` +
  `${result.fileCount} uploaded_files rows, ` +
  `${result.sigCount} signatures rows`
);

db.close();
