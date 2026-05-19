import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auditLogs, user } from '@/lib/db/schema';
import { desc, eq, and, gte, lte, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') ?? '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 100);
  const offset = (page - 1) * limit;

  const userId = url.searchParams.get('userId');
  const action = url.searchParams.get('action');
  const dateFrom = url.searchParams.get('dateFrom');
  const dateTo = url.searchParams.get('dateTo');
  const resourceType = url.searchParams.get('resourceType');

  const conditions = [];
  if (userId) conditions.push(eq(auditLogs.userId, userId));
  if (action) conditions.push(eq(auditLogs.action, action));
  if (resourceType) conditions.push(eq(auditLogs.resourceType, resourceType));
  if (dateFrom) conditions.push(gte(auditLogs.createdAt, dateFrom));
  if (dateTo) conditions.push(lte(auditLogs.createdAt, dateTo));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Left-join the actor so the UI can show a readable name/email instead of
  // the opaque user id (e.g. "6BbYcPRjPJCniu5J"). Deleted users still render
  // with the bare id since the join produces NULL.
  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        metadata: auditLogs.metadata,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        createdAt: auditLogs.createdAt,
        userName: user.name,
        userEmail: user.email,
      })
      .from(auditLogs)
      .leftJoin(user, eq(auditLogs.userId, user.id))
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(where),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      logs: rows,
      pagination: {
        page,
        limit,
        total: Number(countResult[0]?.count ?? 0),
        totalPages: Math.ceil(Number(countResult[0]?.count ?? 0) / limit),
      },
    },
  });
}
