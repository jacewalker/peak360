import { NextResponse } from 'next/server';
import { db, runMigrations } from '@/lib/db';
import { markerContent } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth-helpers';

/**
 * A marker counts as "authored" only if it has real, non-empty content — a
 * trimmed definition/impact string, or at least one non-empty coach-insight
 * cell. A saved-but-empty matrix (all-empty strings) is NOT authored, so the
 * status pill stays meaningful (WR-04). Mirrors the modal's trim-based test.
 */
function hasAuthoredContent(row: Record<string, unknown>): boolean {
  const definition = typeof row.definition === 'string' ? row.definition.trim() : '';
  const impact = typeof row.impact === 'string' ? row.impact.trim() : '';
  if (definition || impact) return true;

  const insights = row.coachInsights;
  if (insights && typeof insights === 'object') {
    for (const cell of Object.values(insights as Record<string, unknown>)) {
      if (cell && typeof cell === 'object') {
        for (const value of Object.values(cell as Record<string, unknown>)) {
          if (typeof value === 'string' && value.trim()) return true;
        }
      }
    }
  }
  return false;
}

/**
 * Phase 11 — Admin list of all marker_content rows (D-11).
 *
 * Mirrors src/app/api/admin/normative/route.ts: requireAdmin gate, db.select,
 * { success, data } shape. Returns every row plus authoredKeys — the testKeys
 * that have any of definition/impact/coachInsights set — so the admin list page
 * can render an "Authored" vs "Draft" status pill per marker.
 */
export async function GET() {
  const [, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;

  try {
    await runMigrations();
    const rows = await db.select().from(markerContent);
    const authoredKeys = (rows as Record<string, unknown>[])
      .filter(hasAuthoredContent)
      .map((r) => r.testKey as string);

    return NextResponse.json({
      success: true,
      data: { rows, authoredKeys },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Could not load marker content.' },
      { status: 500 }
    );
  }
}
