import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { db } from '@/lib/db';
import { pillarPrescriptions } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth-helpers';
import { logAuditEvent, getRequestContext } from '@/lib/audit';
import { PILLAR_KEYS } from '@/lib/pillars/types';

/**
 * Phase 8 — Admin authoring API for per-assessment per-pillar prescriptions.
 *
 * D-12, D-15, D-16, D-20 — admin-only writes; audit log on every write.
 * Composite key (assessment_id, pillar_key) is upserted in the PATCH branch.
 *
 * URL scheme validation (T-08-17): fullPlanHref MUST be http(s) only — any
 * other scheme is rejected with 400 at the API write boundary. The portal
 * renders fullPlanHref via a plain anchor element so the API is the chokepoint
 * that prevents script-URL injection.
 */

function isValidPillarKey(k: unknown): boolean {
  return typeof k === 'string' && (PILLAR_KEYS as readonly string[]).includes(k);
}

function isValidUrl(s: unknown): boolean {
  if (typeof s !== 'string') return false;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function normaliseBullets(input: unknown): string[] | null {
  if (Array.isArray(input)) {
    const items = input
      .map((x) => (typeof x === 'string' ? x.trim() : ''))
      .filter((s) => s.length > 0);
    return items.length > 0 ? items : null;
  }
  if (typeof input === 'string') {
    const items = input
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return items.length > 0 ? items : null;
  }
  return null;
}

function shortHash(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 12);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;

  const { id: assessmentId } = await params;
  const rows = await db
    .select()
    .from(pillarPrescriptions)
    .where(eq(pillarPrescriptions.assessmentId, assessmentId));
  return NextResponse.json({ prescriptions: rows });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [session, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;

  const { id: assessmentId } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || !isValidPillarKey(body.pillarKey)) {
    return NextResponse.json({ error: 'Invalid pillarKey' }, { status: 400 });
  }
  if (typeof body.summary !== 'string' || body.summary.trim().length === 0) {
    return NextResponse.json({ error: 'Summary is required' }, { status: 400 });
  }
  const summary = body.summary.trim();
  const bullets = normaliseBullets(body.bullets);

  let fullPlanHref: string | null = null;
  if (
    body.fullPlanHref !== undefined &&
    body.fullPlanHref !== null &&
    body.fullPlanHref !== ''
  ) {
    if (!isValidUrl(body.fullPlanHref)) {
      return NextResponse.json(
        { error: 'Full-plan link must use http or https' },
        { status: 400 }
      );
    }
    fullPlanHref = body.fullPlanHref as string;
  }

  // Capture previous summary hash for audit (null if no row pre-existed)
  const [prev] = await db
    .select()
    .from(pillarPrescriptions)
    .where(
      and(
        eq(pillarPrescriptions.assessmentId, assessmentId),
        eq(pillarPrescriptions.pillarKey, body.pillarKey)
      )
    );
  const beforeHash = prev?.summary ? shortHash(prev.summary) : null;
  const afterHash = shortHash(summary);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.transaction(async (tx: any) => {
      await tx
        .insert(pillarPrescriptions)
        .values({
          assessmentId,
          pillarKey: body.pillarKey,
          summary,
          bullets,
          fullPlanHref,
          updatedBy: session.user.id,
          updatedAt: Date.now(),
        })
        .onConflictDoUpdate({
          target: [pillarPrescriptions.assessmentId, pillarPrescriptions.pillarKey],
          set: {
            summary,
            bullets,
            fullPlanHref,
            updatedBy: session.user.id,
            updatedAt: Date.now(),
          },
        });
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to save prescription' },
      { status: 500 }
    );
  }

  const ctx = await getRequestContext();
  await logAuditEvent({
    userId: session.user.id,
    action: 'pillar_prescription.upsert',
    resourceType: 'pillar_prescription',
    resourceId: `${assessmentId}:${body.pillarKey}`,
    metadata: {
      assessment_id: assessmentId,
      pillar_key: body.pillarKey,
      before_summary_hash: beforeHash,
      after_summary_hash: afterHash,
    },
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const [session, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;

  const { id: assessmentId } = await params;
  const url = new URL(request.url);
  const pillarKey = url.searchParams.get('pillarKey');
  if (!pillarKey || !isValidPillarKey(pillarKey)) {
    return NextResponse.json({ error: 'Invalid pillarKey' }, { status: 400 });
  }

  const [prev] = await db
    .select()
    .from(pillarPrescriptions)
    .where(
      and(
        eq(pillarPrescriptions.assessmentId, assessmentId),
        eq(pillarPrescriptions.pillarKey, pillarKey)
      )
    );
  if (!prev) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const beforeHash = shortHash(prev.summary);

  await db
    .delete(pillarPrescriptions)
    .where(
      and(
        eq(pillarPrescriptions.assessmentId, assessmentId),
        eq(pillarPrescriptions.pillarKey, pillarKey)
      )
    );

  const ctx = await getRequestContext();
  await logAuditEvent({
    userId: session.user.id,
    action: 'pillar_prescription.delete',
    resourceType: 'pillar_prescription',
    resourceId: `${assessmentId}:${pillarKey}`,
    metadata: {
      assessment_id: assessmentId,
      pillar_key: pillarKey,
      before_summary_hash: beforeHash,
    },
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  });
  return NextResponse.json({ success: true });
}
