import { NextRequest, NextResponse } from 'next/server';
import { REPORT_MARKERS } from '@/lib/report-markers';
import { getDbRangesByTestKey, upsertDbRange, deleteDbRange } from '@/lib/normative/db-ranges';
import { getStandards } from '@/lib/normative/ratings';
import type { RatingTier, TierRanges } from '@/types/normative';

const TIER_ORDER: RatingTier[] = ['poor', 'cautious', 'normal', 'great', 'elite'];

function validateTiers(tiers: TierRanges): string[] {
  const errors: string[] = [];

  for (const tier of TIER_ORDER) {
    const range = tiers[tier];
    if (!range || typeof range.min !== 'number' || typeof range.max !== 'number') {
      errors.push(`${tier}: min and max must be numbers`);
      continue;
    }
    if (range.min >= range.max) {
      errors.push(`${tier}: min (${range.min}) must be less than max (${range.max})`);
    }
  }

  for (let i = 0; i < TIER_ORDER.length - 1; i++) {
    const prev = tiers[TIER_ORDER[i]];
    const next = tiers[TIER_ORDER[i + 1]];
    if (prev && next && typeof prev.max === 'number' && typeof next.min === 'number') {
      if (prev.max !== next.min) {
        errors.push(
          `Gap between tiers: ${TIER_ORDER[i]} max (${prev.max}) must equal ${TIER_ORDER[i + 1]} min (${next.min})`
        );
      }
    }
  }

  return errors;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ marker: string }> }
) {
  try {
    const { marker } = await params;

    const markerDef = REPORT_MARKERS.find((m) => m.testKey === marker);
    if (!markerDef) {
      return NextResponse.json(
        { success: false, error: 'Marker not found' },
        { status: 404 }
      );
    }

    const dbOverrides = await getDbRangesByTestKey(marker);

    const unisex = getStandards(marker, null, null);
    const male = getStandards(marker, null, 'male');
    const female = getStandards(marker, null, 'female');

    const hardcodedDefaults: Record<string, { unit: string | null; note: string | null; standards: TierRanges | null }> = {};

    if (unisex.standards) {
      hardcodedDefaults.unisex = unisex;
    }
    if (male.standards && JSON.stringify(male.standards) !== JSON.stringify(unisex.standards)) {
      hardcodedDefaults.male = male;
    }
    if (female.standards && JSON.stringify(female.standards) !== JSON.stringify(unisex.standards)) {
      hardcodedDefaults.female = female;
    }

    return NextResponse.json({
      success: true,
      data: {
        marker: markerDef,
        dbOverrides,
        hardcodedDefaults,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to load marker data' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ marker: string }> }
) {
  try {
    const { marker } = await params;

    const markerDef = REPORT_MARKERS.find((m) => m.testKey === marker);
    if (!markerDef) {
      return NextResponse.json(
        { success: false, error: 'Marker not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { variants, updatedAt } = body as {
      variants: Array<{
        gender: string | null;
        ageGroup: string | null;
        tiers: TierRanges;
        unit?: string;
        note?: string;
        severityWeight?: number;
      }>;
      updatedAt?: string | null;
    };

    if (!variants || !Array.isArray(variants) || variants.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one variant is required' },
        { status: 400 }
      );
    }

    // Optimistic locking: check updatedAt against current DB rows
    if (updatedAt) {
      const currentRows = await getDbRangesByTestKey(marker);
      const latestUpdate = currentRows.reduce((latest, row) => {
        return row.updatedAt > latest ? row.updatedAt : latest;
      }, '');
      if (latestUpdate && latestUpdate > updatedAt) {
        return NextResponse.json(
          {
            success: false,
            error: 'This marker was updated by another admin. Reload to see their changes before saving.',
          },
          { status: 409 }
        );
      }
    }

    // Validate each variant's tiers
    for (const variant of variants) {
      const errors = validateTiers(variant.tiers);
      if (errors.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Validation failed: ${errors.join('; ')}`,
          },
          { status: 400 }
        );
      }
    }

    // Upsert each variant
    for (const variant of variants) {
      await upsertDbRange({
        testKey: marker,
        category: markerDef.category,
        gender: variant.gender,
        ageGroup: variant.ageGroup,
        unit: variant.unit ?? null,
        note: variant.note ?? null,
        tiers: variant.tiers,
        severityWeight: variant.severityWeight ?? null,
      });
    }

    return NextResponse.json({
      success: true,
      data: { updated: variants.length },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to save marker ranges' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ marker: string }> }
) {
  try {
    const { marker } = await params;

    const markerDef = REPORT_MARKERS.find((m) => m.testKey === marker);
    if (!markerDef) {
      return NextResponse.json(
        { success: false, error: 'Marker not found' },
        { status: 404 }
      );
    }

    let gender: string | undefined;
    let ageGroup: string | undefined;

    try {
      const body = await request.json();
      gender = body.gender;
      ageGroup = body.ageGroup;
    } catch {
      // No body provided - delete all variants
    }

    const count = await deleteDbRange(marker, gender, ageGroup);

    return NextResponse.json({
      success: true,
      data: { deleted: count },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to delete marker ranges' },
      { status: 500 }
    );
  }
}
