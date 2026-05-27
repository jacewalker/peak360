import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import ImpersonationBanner from '@/components/portal/ImpersonationBanner';
import { getValidSession } from '@/lib/auth-helpers';

// Server-side session validation. Middleware only checks for cookie presence
// (optimistic), so an expired or otherwise-invalid cookie would let a request
// reach this layout. Validate the session against Better Auth here and bounce
// to /login if it doesn't resolve to a real user.
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getValidSession();
  if (!session) {
    redirect('/login');
  }

  // The runtime session carries impersonatedBy (the DB column exists) even
  // though the shared AuthSession type doesn't model it — widen via a local
  // cast rather than editing the shared type. While impersonating, the cookie
  // was rotated so session.user IS the impersonated user (correct name/role).
  const impersonatedBy = (
    session.session as { impersonatedBy?: string | null }
  ).impersonatedBy;

  return (
    <div className="theme-dark">
      <Sidebar />
      <div className="lg:pl-56">
        {impersonatedBy ? (
          <ImpersonationBanner
            name={session.user.name}
            role={session.user.role}
          />
        ) : null}
        {children}
      </div>
    </div>
  );
}
