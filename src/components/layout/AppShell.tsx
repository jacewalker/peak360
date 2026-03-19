'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAssessmentPage = /^\/assessment\/[^/]+\/section\//.test(pathname);

  return (
    <>
      {!isAssessmentPage && <Sidebar />}
      <div className={isAssessmentPage ? '' : 'lg:pl-56'}>
        {children}
      </div>
    </>
  );
}
