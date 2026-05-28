import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { AuthSession } from '@/lib/auth-helpers';
import EditMarkerForm from './EditMarkerForm';

/**
 * Phase 12 - Admin SSR-gated edit-marker page (D-12, D-13, D-15).
 *
 * Server-side admin gate prevents non-admins from loading the client form;
 * the form itself wires the GET / PUT / DELETE /api/admin/markers/[testKey]
 * routes (also admin-gated server-side) for actual data ops.
 */
export default async function EditMarkerPage({
  params,
}: {
  params: Promise<{ testKey: string }>;
}) {
  const rawSession = await auth.api.getSession({ headers: await headers() });
  if (!rawSession?.user) redirect('/login');
  const session = rawSession as unknown as AuthSession;
  if (session.user.role !== 'admin') redirect('/portal');

  const { testKey } = await params;
  return <EditMarkerForm testKey={testKey} />;
}
