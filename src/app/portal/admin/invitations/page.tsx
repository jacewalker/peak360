import { redirect } from 'next/navigation';

/**
 * 260510-osn: /portal/admin/invitations was merged into the unified People
 * page at /portal/admin/users. Any saved bookmark or in-product link now
 * server-redirects to the inline invite form anchor on that page.
 *
 * Next.js's redirect() issues a 307 — the URL fragment (#invite) is preserved
 * by the browser since fragments are client-only.
 *
 * Phase 9: this route is sovereign-redirect — the mono eyebrow "ADMIN ·
 * INVITATIONS" specified by UI-SPEC §Copywriting is rendered by the
 * destination page (/portal/admin/users — see Pending invitations group
 * heading "Pending") since this file never renders DOM.
 */
export default function AdminInvitationsRedirect() {
  redirect('/portal/admin/users#invite');
}
