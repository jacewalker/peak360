import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { REPORT_MARKERS } from '@/lib/report-markers';
import { db } from '@/lib/db';
import { markerContent } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth-helpers';
import { logAuditEvent, getRequestContext } from '@/lib/audit';
import type { RatingTier } from '@/types/normative';

/**
 * Phase 11 — Admin authoring API for a single marker's content (D-07, D-11).
 *
 * Mirrors src/app/api/admin/normative/[marker]/route.ts: requireAdmin gate,
 * marker-not-found 404, 409 optimistic-concurrency on updatedAt, and the
 * onConflictDoUpdate upsert + logAuditEvent pattern from the pillars route.
 * Definition + impact are gender-neutral (D-04); coachInsights is a
 * 5-tier x {male,female} matrix (D-05).
 */

type CoachInsights = Record<
  RatingTier,
  { male: string | null; female: string | null }
> | null;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ marker: string }> }
) {
  const [, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;

  try {
    const { marker } = await params;

    const markerDef = REPORT_MARKERS.find((m) => m.testKey === marker);
    if (!markerDef) {
      return NextResponse.json(
        { success: false, error: 'Marker not found' },
        { status: 404 }
      );
    }

    const [row] = await db
      .select()
      .from(markerContent)
      .where(eq(markerContent.testKey, marker));

    if (!row) {
      // No row yet — return an empty form shape so the editor can render.
      return NextResponse.json({
        success: true,
        data: {
          testKey: marker,
          definition: null,
          impact: null,
          coachInsights: null,
          updatedBy: null,
          updatedAt: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        testKey: row.testKey,
        definition: (row.definition as string | null) ?? null,
        impact: (row.impact as string | null) ?? null,
        coachInsights: (row.coachInsights as CoachInsights) ?? null,
        updatedBy: row.updatedBy,
        updatedAt: row.updatedAt,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to load marker content' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ marker: string }> }
) {
  const [session, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;

  try {
    const { marker } = await params;

    const markerDef = REPORT_MARKERS.find((m) => m.testKey === marker);
    if (!markerDef) {
      return NextResponse.json(
        { success: false, error: 'Marker not found' },
        { status: 404 }
      );
    }

    const body = (await request.json()) as {
      definition?: string | null;
      impact?: string | null;
      coachInsights?: CoachInsights;
      updatedAt?: number | null;
    };

    // Optimistic locking: if client sends updatedAt, reject if server's is newer.
    if (body.updatedAt != null) {
      const [current] = await db
        .select({ updatedAt: markerContent.updatedAt })
        .from(markerContent)
        .where(eq(markerContent.testKey, marker));
      if (current && current.updatedAt > body.updatedAt) {
        return NextResponse.json(
          {
            success: false,
            error:
              'This marker was updated by another admin. Reload to see their changes before saving.',
          },
          { status: 409 }
        );
      }
    }

    const now = Date.now();
    await db
      .insert(markerContent)
      .values({
        testKey: marker,
        definition: body.definition ?? null,
        impact: body.impact ?? null,
        coachInsights: body.coachInsights ?? null,
        updatedBy: session.user.id,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: markerContent.testKey,
        set: {
          definition: body.definition ?? null,
          impact: body.impact ?? null,
          coachInsights: body.coachInsights ?? null,
          updatedBy: session.user.id,
          updatedAt: now,
        },
      });

    const ctx = await getRequestContext();
    await logAuditEvent({
      userId: session.user.id,
      action: 'marker_content.update',
      resourceType: 'marker_content',
      resourceId: marker,
      metadata: { fields: Object.keys(body).filter((k) => k !== 'updatedAt') },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return NextResponse.json({ success: true, data: { updated: 1 } });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to save marker content' },
      { status: 500 }
    );
  }
}
