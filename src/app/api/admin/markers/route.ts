import { NextRequest, NextResponse } from 'next/server';
import { db, runMigrations } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-helpers';
import { logAuditEvent, getRequestContext } from '@/lib/audit';
import { REPORT_MARKERS } from '@/lib/report-markers';
import {
  getAllMarkers,
  getMarkerByTestKey,
  createMarker,
} from '@/lib/markers/queries';
import { upsertDbRange } from '@/lib/normative/db-ranges';
import { PILLAR_KEYS, type PillarKey } from '@/lib/pillars/types';
import type { RatingTier, TierRanges } from '@/types/normative';

/**
 * Phase 12 - Admin-managed marker registry (D-01, D-02, D-13).
 *
 * GET   - list all DB-driven marker rows (admin-gated).
 * POST  - create a new marker row. Validates camel_snake testKey, camelCase
 *         dataKey, section in 1..10, pillar in PILLAR_KEYS, and category.
 *         Rejects testKey collisions against BOTH the in-memory REPORT_MARKERS
 *         seed (409) AND the DB (409). When hasNorms = true, atomically writes
 *         an initial unisex normativeRanges row alongside the marker insert
 *         (D-05). Every POST emits a 'marker.create' audit event.
 *
 * Mirrors src/app/api/admin/marker-content/route.ts (auth gate, runMigrations,
 * NextResponse envelope) and src/app/api/admin/normative/[marker]/route.ts
 * (tier-shape validation).
 */

const TIER_ORDER: RatingTier[] = ['poor', 'cautious', 'normal', 'great', 'elite'];
const TEST_KEY_RE = /^[a-z][a-z0-9_]*$/;
const DATA_KEY_RE = /^[a-z][a-zA-Z0-9]*$/;

/**
 * Validate initial tier ranges. Unlike the strict normative editor (which
 * enforces min < max and tier-edge continuity), the initial-range editor
 * accepts a permissive shape: every tier object must be present with
 * {min, max} keys but either bound may be null (admins commonly seed
 * with just the normal range and fill the rest later via the dedicated
 * normative editor).
 */
function validateInitialTiers(tiers: unknown): string[] {
  const errors: string[] = [];
  if (!tiers || typeof tiers !== 'object') {
    errors.push('initialTiers must be an object with 5 tier keys');
    return errors;
  }
  const t = tiers as Record<string, unknown>;
  for (const tier of TIER_ORDER) {
    const range = t[tier];
    if (!range || typeof range !== 'object') {
      errors.push(`initialTiers.${tier} must be an object with min and max`);
      continue;
    }
    const r = range as Record<string, unknown>;
    if (!('min' in r) || !('max' in r)) {
      errors.push(`initialTiers.${tier} must have both min and max keys`);
      continue;
    }
    if (r.min !== null && typeof r.min !== 'number') {
      errors.push(`initialTiers.${tier}.min must be a number or null`);
    }
    if (r.max !== null && typeof r.max !== 'number') {
      errors.push(`initialTiers.${tier}.max must be a number or null`);
    }
  }
  return errors;
}

export async function GET() {
  const [, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;

  try {
    await runMigrations();
    const markers = await getAllMarkers();
    return NextResponse.json({ success: true, data: { markers } });
  } catch (err) {
    console.error('[api/admin/markers GET] Failed to list markers:', err);
    return NextResponse.json(
      { success: false, error: 'Could not load markers.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const [session, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;

  try {
    await runMigrations();
    const body = (await request.json()) as {
      testKey?: unknown;
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
      initialTiers?: unknown;
      initialUnit?: unknown;
    };

    // 1. testKey
    if (typeof body.testKey !== 'string' || !body.testKey || !TEST_KEY_RE.test(body.testKey)) {
      return NextResponse.json(
        { success: false, error: 'testKey must be a non-empty string matching ^[a-z][a-z0-9_]*$' },
        { status: 400 }
      );
    }
    // 2. label
    if (typeof body.label !== 'string' || !body.label.trim()) {
      return NextResponse.json(
        { success: false, error: 'label must be a non-empty string' },
        { status: 400 }
      );
    }
    // 3. section
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
    // 4. dataKey
    if (typeof body.dataKey !== 'string' || !body.dataKey || !DATA_KEY_RE.test(body.dataKey)) {
      return NextResponse.json(
        { success: false, error: 'dataKey must be a non-empty string matching ^[a-z][a-zA-Z0-9]*$' },
        { status: 400 }
      );
    }
    // 5. pillar
    if (typeof body.pillar !== 'string' || !PILLAR_KEYS.includes(body.pillar as PillarKey)) {
      return NextResponse.json(
        { success: false, error: `pillar must be one of ${PILLAR_KEYS.join(', ')}` },
        { status: 400 }
      );
    }
    // 6. category
    if (typeof body.category !== 'string' || !body.category.trim()) {
      return NextResponse.json(
        { success: false, error: 'category must be a non-empty string' },
        { status: 400 }
      );
    }
    // 7. hasNorms
    if (typeof body.hasNorms !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'hasNorms must be a boolean' },
        { status: 400 }
      );
    }
    // 8. initialTiers (required when hasNorms)
    if (body.hasNorms) {
      const tierErrors = validateInitialTiers(body.initialTiers);
      if (tierErrors.length > 0) {
        return NextResponse.json(
          { success: false, error: `Validation failed: ${tierErrors.join('; ')}` },
          { status: 400 }
        );
      }
    }
    // 9. aiAliases shape (optional)
    if (
      body.aiAliases != null &&
      (!Array.isArray(body.aiAliases) || !body.aiAliases.every((a) => typeof a === 'string'))
    ) {
      return NextResponse.json(
        { success: false, error: 'aiAliases must be an array of strings if provided' },
        { status: 400 }
      );
    }

    // Uniqueness against seeded REPORT_MARKERS (in-memory check first - cheaper).
    if (REPORT_MARKERS.some((m) => m.testKey === body.testKey)) {
      return NextResponse.json(
        { success: false, error: 'testKey conflicts with a seeded marker' },
        { status: 409 }
      );
    }
    // Uniqueness against existing DB rows.
    const existing = await getMarkerByTestKey(body.testKey);
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'testKey already in use' },
        { status: 409 }
      );
    }

    // Normalize optional fields.
    const subcategory =
      typeof body.subcategory === 'string' && body.subcategory.trim()
        ? body.subcategory
        : null;
    const fallbackUnit =
      typeof body.fallbackUnit === 'string' && body.fallbackUnit.trim()
        ? body.fallbackUnit
        : null;
    const aiAliases = Array.isArray(body.aiAliases)
      ? (body.aiAliases as string[]).map((a) => a.trim()).filter((a) => a.length > 0)
      : null;
    const severityWeight =
      typeof body.severityWeight === 'number' && Number.isFinite(body.severityWeight)
        ? body.severityWeight
        : null;

    // Atomic-ish create. The codebase does not use real DB transactions
    // across this kind of write (mirrors db-ranges.ts + marker-content
    // upsert posture). If the upsertDbRange call below fails after the
    // marker insert succeeds, the marker row will exist without an initial
    // range - acceptable per 12-PATTERNS section 5; the admin can retry the
    // range edit via /portal/admin/normative/[marker] without re-creating
    // the marker.
    const marker = await createMarker({
      testKey: body.testKey,
      label: body.label.trim(),
      section: body.section,
      dataKey: body.dataKey,
      pillar: body.pillar as PillarKey,
      category: body.category.trim(),
      subcategory,
      fallbackUnit,
      hasNorms: body.hasNorms,
      aiAliases: aiAliases && aiAliases.length > 0 ? aiAliases : null,
      severityWeight,
      createdBy: session.user.id,
      updatedBy: session.user.id,
    });

    let initialRangeWritten = false;
    if (body.hasNorms) {
      try {
        const initialUnit =
          typeof body.initialUnit === 'string' && body.initialUnit.trim()
            ? body.initialUnit
            : fallbackUnit;
        await upsertDbRange({
          testKey: marker.testKey,
          category: marker.category,
          gender: null,
          ageGroup: null,
          unit: initialUnit,
          note: null,
          tiers: body.initialTiers as TierRanges,
          severityWeight,
        });
        initialRangeWritten = true;
      } catch (rangeErr) {
        // Marker row exists; initial range insert failed. Surface in audit
        // so the admin can spot it and edit ranges via the normative editor.
        // Do NOT roll back the marker - the codebase does not have a txn
        // primitive for cross-table writes (12-PATTERNS section 5).
        console.error(
          '[api/admin/markers POST] marker created but initial range write failed:',
          rangeErr
        );
      }
    }

    const ctx = await getRequestContext();
    await logAuditEvent({
      userId: session.user.id,
      action: 'marker.create',
      resourceType: 'marker',
      resourceId: marker.testKey,
      metadata: {
        section: marker.section,
        pillar: marker.pillar,
        hasNorms: marker.hasNorms,
        withInitialRange: body.hasNorms === true,
        initialRangeWritten,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return NextResponse.json({ success: true, data: { marker } }, { status: 201 });
  } catch (err) {
    console.error('[api/admin/markers POST] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Unexpected error creating marker' },
      { status: 500 }
    );
  }
}
