import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import ImpersonationBanner from '@/components/portal/ImpersonationBanner';
import { getValidSession } from '@/lib/auth-helpers';

const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://portal.peak360.com.au';
const TITLE = 'Peak360 Portal';
const DESCRIPTION = 'Coach and client portal for Peak360 longevity assessments.';
const OG_IMAGE = {
  url: '/landing/peak360-logo.png',
  width: 1230,
  height: 367,
  alt: 'Peak360',
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: 'Peak360',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: 'summary',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE.url],
  },
  icons: { icon: '/landing/peak360-logo.png' },
};

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
