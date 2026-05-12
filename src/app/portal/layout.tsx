import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
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

  return (
    <div className="theme-dark">
      <Sidebar />
      <div className="lg:pl-56">{children}</div>
    </div>
  );
}
