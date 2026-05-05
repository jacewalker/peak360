// Test-only: import a CSV directly via the importCsv() function,
// bypassing auth. Used during local migration simulation.
//
// Usage: DATABASE_URL=... npx tsx scripts/test-import-csv.ts <path-to-csv>
import { readFile } from 'fs/promises';
import { runMigrations } from '../src/lib/db';
import { importCsv } from '../src/lib/csv/import';

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: tsx scripts/test-import-csv.ts <path-to-csv>');
  process.exit(1);
}

(async () => {
  await runMigrations();
  const text = await readFile(csvPath, 'utf8');
  const result = await importCsv(text);
  console.log(`Imported: ${result.imported}`);
  console.log(`Errors:   ${result.errors.length}`);
  console.log(`Warnings: ${result.warnings.length}`);
  if (result.errors.length) console.log('First error:', result.errors[0]);
  if (result.warnings.length) console.log('Warnings:', result.warnings.slice(0, 3));
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
