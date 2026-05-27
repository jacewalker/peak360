// One-time backfill: make assessments.client_id authoritative for existing rows.
//
// DRY-RUN BY DEFAULT. Reads every assessment, computes what would happen
// (LINK / CREATE-USER / SKIP / CONFLICT / REVIEW) WITHOUT mutating anything, and
// prints an aligned per-assessment action table plus a per-action summary count.
//
// Only when --apply (or APPLY=1) is passed does it actually write client_id.
//
// SAFETY MODEL (hardened for a prod one-shot):
//   * Resilience — APPLY processes each row in its own try/catch. One bad row
//     (e.g. an email that collides with an existing non-client account, which
//     makes auth.api.createUser throw a UNIQUE violation) is logged and skipped;
//     the rest still apply. Failures are summarized at the end and the script
//     exits non-zero so they're visible.
//   * Don't silently repoint existing links — a row that ALREADY has a client_id
//     and would CHANGE (resolve to a different user, or auto-create a new one) is
//     classified REVIEW and NOT written, unless you pass --repoint-existing.
//     The backfill's job is to FILL missing links; moving an existing link is a
//     deliberate decision. (Going-forward, the app routes still repoint on edits.)
//     A row with a client_id but no name/email is left as-is (never cleared here).
//
// Review the dry-run table first — CONFLICT rows (ambiguous name, no email) would
// auto-create a distinct placeholder user, and REVIEW rows would change an
// existing link; eyeball both before applying.
//
// Usage:
//   Dry-run (no writes):  DATABASE_URL=postgres://... npx tsx scripts/backfill-client-ids.ts
//   Apply:                DATABASE_URL=postgres://... npx tsx scripts/backfill-client-ids.ts --apply
//   Apply + repoint:      DATABASE_URL=postgres://... npx tsx scripts/backfill-client-ids.ts --apply --repoint-existing
//   (Local SQLite dry-run: just run without DATABASE_URL.)

import type { PlanAction } from '../src/lib/clients/link';

// Script-level action set: the resolver's PlanAction plus REVIEW, a backfill-only
// classification for "already linked, but resolution would change it".
type RowAction = PlanAction | 'REVIEW';

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
  const repointExisting = process.argv.includes('--repoint-existing');
  console.log(apply ? 'MODE: APPLY (will write client_id)' : 'MODE: DRY-RUN (no writes)');
  if (repointExisting) console.log('  --repoint-existing: REVIEW rows WILL be repointed.');
  console.log('');

  const { runMigrations, db } = await import('../src/lib/db/index');
  console.log('Ensuring schema (runMigrations, idempotent)...');
  await runMigrations();

  const isPostgres = !!process.env.DATABASE_URL;
  const schema = isPostgres
    ? await import('../src/lib/db/schema')
    : await import('../src/lib/db/schema-sqlite');

  const { planClientLink, applyClientLink } = await import('../src/lib/clients/link');

  const select = () =>
    db
      .select({
        id: schema.assessments.id,
        clientName: schema.assessments.clientName,
        clientEmail: schema.assessments.clientEmail,
        coachId: schema.assessments.coachId,
        clientId: schema.assessments.clientId,
      })
      .from(schema.assessments);

  const rows: AssessmentRow[] = await select();

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

  const summary: Record<RowAction, number> = {
    LINK: 0,
    'CREATE-USER': 0,
    SKIP: 0,
    CONFLICT: 0,
    REVIEW: 0,
  };

  // Plan rows (read-only) for every assessment. We compute the plan first so the
  // dry-run table never triggers a write or an auto-create.
  const planned: Array<{ row: AssessmentRow; action: RowAction; detail: string }> = [];
  for (const row of rows) {
    const plan = await planClientLink({
      clientName: row.clientName,
      clientEmail: row.clientEmail,
    });

    let action: RowAction;
    let detail: string;

    if (row.clientId) {
      // Already linked. Only LINK-to-the-same-user is a no-op SKIP; anything that
      // would change the link is REVIEW (not written unless --repoint-existing).
      if (plan.action === 'LINK' && plan.detail === row.clientId) {
        action = 'SKIP';
        detail = 'already linked correctly';
      } else if (plan.action === 'SKIP') {
        // No name/email to resolve from — leave the existing link untouched.
        action = 'SKIP';
        detail = 'no name/email; leaving existing client_id';
      } else if (plan.action === 'LINK') {
        action = 'REVIEW';
        detail = `would repoint ${shorten(row.clientId, 12)} → ${shorten(plan.detail, 12)}`;
      } else {
        // CREATE-USER or CONFLICT against an already-linked row.
        action = 'REVIEW';
        detail = `would repoint ${shorten(row.clientId, 12)} → new (${plan.detail})`;
      }
    } else {
      // No existing link — fill it per the resolver's plan.
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
  for (const k of Object.keys(summary) as RowAction[]) {
    console.log(`  ${pad(k, 14)} ${summary[k]}`);
  }
  if (summary.REVIEW > 0 && !repointExisting) {
    console.log(
      `\n  ${summary.REVIEW} REVIEW row(s) already have a client_id and would CHANGE — ` +
        'left untouched. Re-run with --repoint-existing to apply those too.'
    );
  }

  if (!apply) {
    console.log('\nDRY-RUN complete — no writes were made. Re-run with --apply to mutate.');
    process.exit(0);
  }

  // APPLY: fill missing links (LINK / CREATE-USER / CONFLICT) and, only when
  // --repoint-existing is set, the REVIEW rows. Each row is isolated in its own
  // try/catch so one failure (e.g. a colliding email) never aborts the run.
  const isApplyable = (a: RowAction): boolean =>
    a === 'LINK' || a === 'CREATE-USER' || a === 'CONFLICT' || (a === 'REVIEW' && repointExisting);

  console.log('\nApplying client_id links...\n');
  let mutated = 0;
  let skipped = 0;
  const failures: Array<{ id: string; name: string | null; error: string }> = [];

  for (const { row, action } of planned) {
    if (!isApplyable(action)) {
      skipped += 1;
      continue;
    }
    try {
      await applyClientLink(row.id, {
        clientName: row.clientName,
        clientEmail: row.clientEmail,
        coachId: row.coachId,
      });
      mutated += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failures.push({ id: row.id, name: row.clientName, error: message });
      console.error(`  ✗ ${shorten(row.id, 12)} (${row.clientName ?? '—'}): ${message}`);
    }
  }

  // Re-read and print the applied result table.
  const after: AssessmentRow[] = await select();

  console.log('\nApplied result:');
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

  console.log(
    `\nAPPLY complete — ${mutated} linked, ${skipped} skipped` +
      (failures.length ? `, ${failures.length} FAILED` : '') +
      '.'
  );
  if (failures.length) {
    console.log('\nFailures (rows NOT linked — investigate and re-run; the script is idempotent):');
    for (const f of failures) {
      console.log(`  ✗ ${f.id}  ${f.name ?? '—'}  —  ${f.error}`);
    }
    process.exit(1);
  }
  process.exit(0);
})().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
