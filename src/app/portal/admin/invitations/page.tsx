import { redirect } from 'next/navigation';

/**
 * 260510-osn: /portal/admin/invitations was merged into the unified People
 * page at /portal/admin/users. Any saved bookmark or in-product link now
 * server-redirects to the inline invite form anchor on that page.
 *
 * Next.js's redirect() issues a 307 — the URL fragment (#invite) is preserved
 * by the browser since fragments are client-only.
 */
export default function AdminInvitationsRedirect() {
  redirect('/portal/admin/users#invite');
}
