import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema';
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

  const [rows, countResult] = await Promise.all([
    db.select().from(auditLogs)
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
