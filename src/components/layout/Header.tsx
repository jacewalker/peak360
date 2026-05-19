'use client';

import { usePathname } from 'next/navigation';
import { useAssessmentStore } from '@/lib/store/assessment-store';
import MonoEyebrow from '@/components/ui/MonoEyebrow';

export default function Header() {
  const pathname = usePathname();
  const sectionData = useAssessmentStore((s) => s.sectionData);
  const currentSection = useAssessmentStore((s) => s.currentSection);

  // Pitfall 9: suppress CLIENT eyebrow on /report route (Phase 8 PillarsDisplay
  // already renders its own gold mono eyebrow inside the light report card).
  const onReportRoute = pathname?.endsWith('/report') ?? false;

  // Source clientName from Section 1 in the Zustand store (auto-saved Section 1
  // form data is the canonical client-name source while the form is being filled).
  const section1 = (sectionData[1] || {}) as Record<string, unknown>;
  const clientName = typeof section1.clientName === 'string' ? section1.clientName.trim() : '';

  const showClientEyebrow = !onReportRoute && clientName.length > 0;

  return (
    <header className="bg-bg-2 border-b border-line text-text h-14">
      {/* Logo intentionally removed — the sidebar already renders the
          Peak360 wordmark and the report body has its own logo block,
          so this header just carries the client eyebrow + logout. */}
      <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-end">
        <div className="flex items-center gap-4">
          {showClientEyebrow && (
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <MonoEyebrow variant="hero" as="span">
                CLIENT · {clientName.toUpperCase()}
              </MonoEyebrow>
              <span className="text-[13px] text-text-dim mt-0.5">Section {currentSection} of 11</span>
            </div>
          )}

          <button
            onClick={() => {
              fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
                window.location.href = '/login';
              });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium text-text-dim hover:text-text hover:bg-line transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
