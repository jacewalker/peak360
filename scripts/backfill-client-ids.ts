// One-time backfill: make assessments.client_id authoritative for existing rows.
//
// DRY-RUN BY DEFAULT. Reads every assessment, computes what applyClientLink WOULD
// do (LINK / CREATE-USER / SKIP / CONFLICT) WITHOUT mutating anything, and prints
// an aligned per-assessment action table plus a per-action summary count.
//
// Only when --apply (or APPLY=1) is passed does it actually call applyClientLink
// for each row, then re-print the table with applied results and a mutated count.
//
// Review the dry-run table first — CONFLICT rows (ambiguous name, no email) would
// auto-create a distinct placeholder user, so eyeball those before applying.
//
// Usage:
//   Dry-run (no writes):  DATABASE_URL=postgres://... npx tsx scripts/backfill-client-ids.ts
//   Apply:                DATABASE_URL=postgres://... npx tsx scripts/backfill-client-ids.ts --apply
//   (Local SQLite dry-run: just run without DATABASE_URL.)

import type { PlanAction } from '../src/lib/clients/link';

interface AssessmentRow {
  id: string;
  clientName: string | null;
  clientEmail: string | null;
  coachId: string | null;
  clientId: string | null;
}

function pad(s: string, width: number): string {
  const v = s ?? '';
  return v.length >= width ? v.slice(0, width) : v + ' '.repeat(width - v.length);
}

function shorten(s: string | null, width: number): string {
  if (!s) return '—';
  return s.length > width ? s.slice(0, width - 1) + '…' : s;
}

(async () => {
  const masked = process.env.DATABASE_URL?.replace(/:[^@]+@/, ':***@');
  console.log('Target DATABASE_URL:', masked ?? '(unset — local SQLite local.db)');

  const apply = process.argv.includes('--apply') || process.env.APPLY === '1';
  console.log(apply ? 'MODE: APPLY (will write client_id)' : 'MODE: DRY-RUN (no writes)');
  console.log('');

  const { runMigrations, db } = await import('../src/lib/db/index');
  console.log('Ensuring schema (runMigrations, idempotent)...');
  await runMigrations();

  const isPostgres = !!process.env.DATABASE_URL;
  const schema = isPostgres
    ? await import('../src/lib/db/schema')
    : await import('../src/lib/db/schema-sqlite');

  const { planClientLink, applyClientLink } = await import('../src/lib/clients/link');

  const rows: AssessmentRow[] = await db
    .select({
      id: schema.assessments.id,
      clientName: schema.assessments.clientName,
      clientEmail: schema.assessments.clientEmail,
      coachId: schema.assessments.coachId,
      clientId: schema.assessments.clientId,
    })
    .from(schema.assessments);

  console.log(`\nFound ${rows.length} assessment(s).\n`);

  // Header
  const COLS = { id: 38, name: 18, email: 26, current: 20, action: 14 };
  const header =
    pad('assessment id', COLS.id) +
    pad('clientName', COLS.name) +
    pad('clientEmail', COLS.email) +
    pad('current client_id', COLS.current) +
    pad('action', COLS.action) +
    'detail';
  console.log(header);
  console.log('-'.repeat(header.length));

  const summary: Record<PlanAction, number> = {
    LINK: 0,
    'CREATE-USER': 0,
    SKIP: 0,
    CONFLICT: 0,
  };

  // Plan rows (read-only) for every assessment. We compute the plan first so the
  // dry-run table never triggers a write or an auto-create.
  const planned: Array<{ row: AssessmentRow; action: PlanAction; detail: string }> = [];
  for (const row of rows) {
    let action: PlanAction;
    let detail: string;

    // If client_id is already correct (matches a LINK target), treat as SKIP.
    const plan = await planClientLink({
      clientName: row.clientName,
      clientEmail: row.clientEmail,
    });

    if (plan.action === 'LINK' && row.clientId === plan.detail) {
      action = 'SKIP';
      detail = 'already linked correctly';
    } else {
      action = plan.action;
      detail = plan.detail;
    }

    summary[action] += 1;
    planned.push({ row, action, detail });

    console.log(
      pad(shorten(row.id, COLS.id - 1), COLS.id) +
        pad(shorten(row.clientName, COLS.name - 1), COLS.name) +
        pad(shorten(row.clientEmail, COLS.email - 1), COLS.email) +
        pad(shorten(row.clientId, COLS.current - 1), COLS.current) +
        pad(action, COLS.action) +
        detail
    );
  }

  console.log('\nSummary (planned):');
  for (const k of Object.keys(summary) as PlanAction[]) {
    console.log(`  ${pad(k, 14)} ${summary[k]}`);
  }

  if (!apply) {
    console.log('\nDRY-RUN complete — no writes were made. Re-run with --apply to mutate.');
    process.exit(0);
  }

  // APPLY: authoritatively set client_id for every row (this may auto-create
  // users for CREATE-USER/CONFLICT rows). SKIP rows with nothing to link still
  // resolve to null, which is the correct authoritative value.
  console.log('\nApplying client_id links...\n');
  let mutated = 0;
  for (const { row } of planned) {
    await applyClientLink(row.id, {
      clientName: row.clientName,
      clientEmail: row.clientEmail,
      coachId: row.coachId,
    });
    mutated += 1;
  }

  // Re-read and print the applied result table.
  const after: AssessmentRow[] = await db
    .select({
      id: schema.assessments.id,
      clientName: schema.assessments.clientName,
      clientEmail: schema.assessments.clientEmail,
      coachId: schema.assessments.coachId,
      clientId: schema.assessments.clientId,
    })
    .from(schema.assessments);

  console.log('Applied result:');
  console.log(
    pad('assessment id', COLS.id) +
      pad('clientName', COLS.name) +
      pad('clientEmail', COLS.email) +
      'client_id (after)'
  );
  console.log('-'.repeat(header.length));
  for (const row of after) {
    console.log(
      pad(shorten(row.id, COLS.id - 1), COLS.id) +
        pad(shorten(row.clientName, COLS.name - 1), COLS.name) +
        pad(shorten(row.clientEmail, COLS.email - 1), COLS.email) +
        shorten(row.clientId, 40)
    );
  }

  console.log(`\nAPPLY complete — ${mutated} assessment(s) processed.`);
  process.exit(0);
})().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
