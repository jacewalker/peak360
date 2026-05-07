import { db } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema';
import { v4 as uuid } from 'uuid';
import { headers } from 'next/headers';

export type AuditAction =
  | 'assessment.view'
  | 'section.edit'
  | 'report.export'
  | 'file.upload'
  | 'normative.update'
  | 'user.manage'
  | 'user.role.changed'
  | 'user.role.rollback';

export async function logAuditEvent(params: {
  userId: string;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      id: uuid(),
      userId: params.userId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      metadata: params.metadata ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // Audit logging must NEVER break the main operation (fire-and-forget)
    console.error('[audit] Failed to write audit log');
  }
}

/**
 * Extract IP address and user agent from current request headers.
 * Call from within API route handlers.
 */
export async function getRequestContext(): Promise<{
  ipAddress: string | null;
  userAgent: string | null;
}> {
  const h = await headers();
  return {
    ipAddress: h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null,
    userAgent: h.get('user-agent') ?? null,
  };
}
