import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { markerContent } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth-helpers';

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
    const rows = await db.select().from(markerContent);
    const authoredKeys = (rows as Record<string, unknown>[])
      .filter((r) => r.definition || r.impact || r.coachInsights)
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
