import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { runMigrations } from '@/lib/db';
import { logAuditEvent, getRequestContext } from '@/lib/audit';
import {
  getMarkerByTestKey,
  updateMarker,
  deleteMarker,
  OptimisticConflictError,
  type UpdateMarkerInput,
} from '@/lib/markers/queries';
import { PILLAR_KEYS, type PillarKey } from '@/lib/pillars/types';

/**
 * Phase 12 - Admin-managed marker registry (D-13).
 *
 * GET    - fetch a single DB-driven marker by testKey.
 * PUT    - update a marker. Optimistic concurrency via body.updatedAt:
 *          if the DB row's updatedAt is newer, returns 409. Changing
 *          dataKey post-create is blocked with 400 to avoid orphaning
 *          existing assessment-section JSON keys.
 * DELETE - cascade delete the marker and its marker_content +
 *          normative_ranges rows. Returns the per-table delete counts.
 *
 * Mirrors src/app/api/admin/marker-content/[marker]/route.ts (auth gate,
 * runMigrations, NextResponse envelope, optimistic concurrency, audit).
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ testKey: string }> }
) {
  const [, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;

  try {
    await runMigrations();
    const { testKey } = await params;
    const marker = await getMarkerByTestKey(testKey);
    if (!marker) {
      return NextResponse.json(
        { success: false, error: 'Marker not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: { marker } });
  } catch (err) {
    console.error('[api/admin/markers/[testKey] GET] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Unexpected error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ testKey: string }> }
) {
  const [session, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;

  try {
    await runMigrations();
    const { testKey } = await params;
    const existing = await getMarkerByTestKey(testKey);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Marker not found' },
        { status: 404 }
      );
    }

    const body = (await request.json()) as {
      label?: unknown;
      section?: unknown;
      dataKey?: unknown;
      pillar?: unknown;
      category?: unknown;
      subcategory?: unknown;
      fallbackUnit?: unknown;
      hasNorms?: unknown;
      aiAliases?: unknown;
      severityWeight?: unknown;
      updatedAt?: unknown;
    };

    // dataKey immutability guard (D-13): changing the camelCase key after
    // create would orphan every existing assessment-section JSON blob that
    // already wrote a value under the old key.
    if (body.dataKey !== undefined && body.dataKey !== existing.dataKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'dataKey cannot be changed after creation (would orphan existing assessment data)',
        },
        { status: 400 }
      );
    }

    // updatedAt is required for optimistic concurrency.
    if (typeof body.updatedAt !== 'number') {
      return NextResponse.json(
        { success: false, error: 'updatedAt (epoch ms from the row you fetched) is required for concurrency control' },
        { status: 400 }
      );
    }

    // Validate the fields that ARE allowed to change (same shape rules as POST,
    // applied only when the field is present in the body).
    const set: UpdateMarkerInput = { updatedBy: session.user.id };

    if (body.label !== undefined) {
      if (typeof body.label !== 'string' || !body.label.trim()) {
        return NextResponse.json(
          { success: false, error: 'label must be a non-empty string' },
          { status: 400 }
        );
      }
      set.label = body.label.trim();
    }
    if (body.section !== undefined) {
      if (
        typeof body.section !== 'number' ||
        !Number.isInteger(body.section) ||
        body.section < 1 ||
        body.section > 10
      ) {
        return NextResponse.json(
          { success: false, error: 'section must be an integer in 1..10' },
          { status: 400 }
        );
      }
      set.section = body.section;
    }
    if (body.pillar !== undefined) {
      if (
        typeof body.pillar !== 'string' ||
        !PILLAR_KEYS.includes(body.pillar as PillarKey)
      ) {
        return NextResponse.json(
          { success: false, error: `pillar must be one of ${PILLAR_KEYS.join(', ')}` },
          { status: 400 }
        );
      }
      set.pillar = body.pillar as PillarKey;
    }
    if (body.category !== undefined) {
      if (typeof body.category !== 'string' || !body.category.trim()) {
        return NextResponse.json(
          { success: false, error: 'category must be a non-empty string' },
          { status: 400 }
        );
      }
      set.category = body.category.trim();
    }
    if (body.subcategory !== undefined) {
      if (body.subcategory !== null && typeof body.subcategory !== 'string') {
        return NextResponse.json(
          { success: false, error: 'subcategory must be a string or null' },
          { status: 400 }
        );
      }
      set.subcategory =
        typeof body.subcategory === 'string' && body.subcategory.trim()
          ? body.subcategory
          : null;
    }
    if (body.fallbackUnit !== undefined) {
      if (body.fallbackUnit !== null && typeof body.fallbackUnit !== 'string') {
        return NextResponse.json(
          { success: false, error: 'fallbackUnit must be a string or null' },
          { status: 400 }
        );
      }
      set.fallbackUnit =
        typeof body.fallbackUnit === 'string' && body.fallbackUnit.trim()
          ? body.fallbackUnit
          : null;
    }
    if (body.hasNorms !== undefined) {
      if (typeof body.hasNorms !== 'boolean') {
        return NextResponse.json(
          { success: false, error: 'hasNorms must be a boolean' },
          { status: 400 }
        );
      }
      set.hasNorms = body.hasNorms;
    }
    if (body.aiAliases !== undefined) {
      if (
        body.aiAliases !== null &&
        (!Array.isArray(body.aiAliases) ||
          !body.aiAliases.every((a) => typeof a === 'string'))
      ) {
        return NextResponse.json(
          { success: false, error: 'aiAliases must be an array of strings or null' },
          { status: 400 }
        );
      }
      const normalized = Array.isArray(body.aiAliases)
        ? (body.aiAliases as string[])
            .map((a) => a.trim())
            .filter((a) => a.length > 0)
        : null;
      set.aiAliases = normalized && normalized.length > 0 ? normalized : null;
    }
    if (body.severityWeight !== undefined) {
      if (
        body.severityWeight !== null &&
        (typeof body.severityWeight !== 'number' ||
          !Number.isFinite(body.severityWeight))
      ) {
        return NextResponse.json(
          { success: false, error: 'severityWeight must be a number or null' },
          { status: 400 }
        );
      }
      set.severityWeight =
        typeof body.severityWeight === 'number' ? body.severityWeight : null;
    }

    let updated;
    try {
      updated = await updateMarker(testKey, set, body.updatedAt);
    } catch (err) {
      if (err instanceof OptimisticConflictError) {
        return NextResponse.json(
          {
            success: false,
            error:
              'This marker was updated by another admin. Reload to see their changes before saving.',
          },
          { status: 409 }
        );
      }
      throw err;
    }

    const ctx = await getRequestContext();
    await logAuditEvent({
      userId: session.user.id,
      action: 'marker.update',
      resourceType: 'marker',
      resourceId: testKey,
      metadata: {
        fields: Object.keys(body).filter((k) => k !== 'updatedAt'),
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return NextResponse.json({ success: true, data: { marker: updated } });
  } catch (err) {
    console.error('[api/admin/markers/[testKey] PUT] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Unexpected error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ testKey: string }> }
) {
  const [session, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;

  try {
    await runMigrations();
    const { testKey } = await params;

    const existing = await getMarkerByTestKey(testKey);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Marker not found' },
        { status: 404 }
      );
    }

    const result = await deleteMarker(testKey);

    const ctx = await getRequestContext();
    await logAuditEvent({
      userId: session.user.id,
      action: 'marker.delete',
      resourceType: 'marker',
      resourceId: testKey,
      metadata: {
        deletedContent: result.deletedContent,
        deletedRanges: result.deletedRanges,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return NextResponse.json({
      success: true,
      data: {
        deletedMarker: result.deletedMarker,
        deletedContent: result.deletedContent,
        deletedRanges: result.deletedRanges,
      },
    });
  } catch (err) {
    console.error('[api/admin/markers/[testKey] DELETE] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Unexpected error' },
      { status: 500 }
    );
  }
}
