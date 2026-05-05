'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

const LANDING_HOSTNAMES = new Set(
  (process.env.NEXT_PUBLIC_LANDING_HOSTNAMES ?? 'peak360.com.au,www.peak360.com.au,landing.localhost').split(',')
);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isLandingHost, setIsLandingHost] = useState(false);

  useEffect(() => {
    setIsLandingHost(LANDING_HOSTNAMES.has(window.location.hostname));
  }, []);

  const isAssessmentPage = /^\/assessment\/[^/]+\/section\//.test(pathname);
  const isLoginPage = pathname === '/login';
  const isLandingPage = pathname.startsWith('/landing');
  const showSidebar = !isAssessmentPage && !isLoginPage && !isLandingPage && !isLandingHost;

  return (
    <>
      {showSidebar && <Sidebar />}
      <div className={showSidebar ? 'lg:pl-56' : ''}>
        {children}
      </div>
    </>
  );
}
