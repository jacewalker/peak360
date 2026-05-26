import { NextResponse } from 'next/server';
import { runMigrations } from '@/lib/db';
import { requireSession } from '@/lib/auth-helpers';
import { getAllMarkerContent } from '@/lib/marker-content/queries';

/**
 * Phase 11 — Client-readable marker content (D-07, D-12).
 *
 * Any authenticated role (coach/client/admin) may READ global marker content;
 * only admins WRITE (via /api/admin/marker-content/*). Mirrors the any-role
 * section GET pattern — requireSession with no role gate. This is the endpoint
 * the report (Plan 04) fetches inside loadReport(). marker_content is
 * non-PII global clinical content (threat T-11-07: accept).
 */
export async function GET() {
  const [, errorRes] = await requireSession();
  if (errorRes) return errorRes;

  try {
    // Ensure the marker_content table exists + is seeded on first use (prod
    // creates tables lazily via runMigrations). Idempotent / no-op once present.
    await runMigrations();
    const rows = await getAllMarkerContent();
    return NextResponse.json({ success: true, data: rows });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Could not load marker content.' },
      { status: 500 }
    );
  }
}
