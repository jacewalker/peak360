'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAssessmentPage = /^\/assessment\/[^/]+\/section\//.test(pathname);
  const isLoginPage = pathname === '/login';
  const showSidebar = !isAssessmentPage && !isLoginPage;

  return (
    <>
      {showSidebar && <Sidebar />}
      <div className={showSidebar ? 'lg:pl-56' : ''}>
        {children}
      </div>
    </>
  );
}
