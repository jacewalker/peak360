import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { db } from '@/lib/db';
import { pillarDefinitions, pillarPageCopy } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth-helpers';
import { logAuditEvent, getRequestContext } from '@/lib/audit';
import { PILLAR_KEYS } from '@/lib/pillars/types';

/**
 * Phase 8 — Admin authoring API for global pillar definitions and page copy.
 *
 * D-15, D-19, D-20 — admin-only writes; audit log on every successful write.
 * Mirrors the Phase 7 BL-02 admin-route pattern (requireAdmin → transactional
 * write → logAuditEvent). Pitfall #2: this route does NOT trigger Better Auth
 * role-side-effect APIs — those are specific to user-role changes; pillar
 * writes have no session-invalidation requirement.
 *
 * PATCH dispatches on body.kind:
 *   { kind: 'definition', pillarKey, label, shortSummary, plainMeaning, sortOrder }
 *   { kind: 'pageCopy',   heading, intro }
 */

function isValidPillarKey(k: unknown): boolean {
  return typeof k === 'string' && (PILLAR_KEYS as readonly string[]).includes(k);
}

function nonEmpty(s: unknown): string | null {
  if (typeof s !== 'string') return null;
  const t = s.trim();
  return t.length > 0 ? t : null;
}

function shortHash(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 12);
}

export async function GET() {
  const [, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;

  const [defs, pcRows] = await Promise.all([
    db.select().from(pillarDefinitions).orderBy(pillarDefinitions.sortOrder),
    db.select().from(pillarPageCopy).limit(1),
  ]);
  return NextResponse.json({
    definitions: defs,
    pageCopy: pcRows[0] ?? null,
  });
}

export async function PATCH(request: NextRequest) {
  const [session, errorRes] = await requireAdmin();
  if (errorRes) return errorRes;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  // ---- Branch: definition update --------------------------------------
  if (body.kind === 'definition') {
    if (!isValidPillarKey(body.pillarKey)) {
      return NextResponse.json({ error: 'Invalid pillarKey' }, { status: 400 });
    }
    const label = nonEmpty(body.label);
    const shortSummary = nonEmpty(body.shortSummary);
    const plainMeaning = nonEmpty(body.plainMeaning);
    const sortOrder =
      Number.isInteger(body.sortOrder) && body.sortOrder >= 0
        ? (body.sortOrder as number)
        : null;
    if (!label || !shortSummary || !plainMeaning || sortOrder === null) {
      return NextResponse.json(
        { error: 'Missing or invalid fields' },
        { status: 400 }
      );
    }

    // Capture previous label for audit metadata
    const [prev] = await db
      .select()
      .from(pillarDefinitions)
      .where(eq(pillarDefinitions.pillarKey, body.pillarKey));
    const fromLabel = prev?.label ?? null;

    try {
      // db is exported as Proxy<any> so tx has no inferable type — annotate as any.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.transaction(async (tx: any) => {
        await tx
          .insert(pillarDefinitions)
          .values({
            pillarKey: body.pillarKey,
            label,
            shortSummary,
            plainMeaning,
            sortOrder,
            updatedBy: session.user.id,
            updatedAt: Date.now(),
          })
          .onConflictDoUpdate({
            target: pillarDefinitions.pillarKey,
            set: {
              label,
              shortSummary,
              plainMeaning,
              sortOrder,
              updatedBy: session.user.id,
              updatedAt: Date.now(),
            },
          });
      });
    } catch {
      return NextResponse.json(
        { error: 'Failed to update pillar definition' },
        { status: 500 }
      );
    }

    const ctx = await getRequestContext();
    await logAuditEvent({
      userId: session.user.id,
      action: 'pillar_definition.update',
      resourceType: 'pillar_definition',
      resourceId: body.pillarKey,
      metadata: { from: fromLabel, to: label },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    return NextResponse.json({ success: true });
  }

  // ---- Branch: page-copy update ---------------------------------------
  if (body.kind === 'pageCopy') {
    const heading = nonEmpty(body.heading);
    const intro = nonEmpty(body.intro);
    if (!heading || !intro) {
      return NextResponse.json(
        { error: 'Missing or invalid fields' },
        { status: 400 }
      );
    }

    const [prev] = await db.select().from(pillarPageCopy).limit(1);
    const beforeHeadingHash = prev?.heading ? shortHash(prev.heading) : null;
    const afterHeadingHash = shortHash(heading);
    const beforeIntroHash = prev?.intro ? shortHash(prev.intro) : null;
    const afterIntroHash = shortHash(intro);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.transaction(async (tx: any) => {
        if (prev) {
          await tx
            .update(pillarPageCopy)
            .set({
              heading,
              intro,
              updatedBy: session.user.id,
              updatedAt: Date.now(),
            })
            .where(eq(pillarPageCopy.id, prev.id));
        } else {
          // Defensive — runMigrations seeds one row, so this branch is normally unreachable.
          await tx.insert(pillarPageCopy).values({
            heading,
            intro,
            updatedBy: session.user.id,
            updatedAt: Date.now(),
          });
        }
      });
    } catch {
      return NextResponse.json(
        { error: 'Failed to update page copy' },
        { status: 500 }
      );
    }

    const ctx = await getRequestContext();
    await logAuditEvent({
      userId: session.user.id,
      action: 'pillar_page_copy.update',
      resourceType: 'pillar_page_copy',
      resourceId: 'default',
      metadata: {
        before_heading_hash: beforeHeadingHash,
        after_heading_hash: afterHeadingHash,
        before_intro_hash: beforeIntroHash,
        after_intro_hash: afterIntroHash,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown kind' }, { status: 400 });
}
