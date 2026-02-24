'use client';

import Link from 'next/link';
import { SECTION_TITLES, TOTAL_SECTIONS, type SectionNumber } from '@/types/assessment';

interface ProgressBarProps {
  currentSection: number;
  assessmentId: string;
  completedSections?: number[];
}

export default function ProgressBar({ currentSection, assessmentId, completedSections = [] }: ProgressBarProps) {
  const completedCount = completedSections.length;
  const progress = (completedCount / (TOTAL_SECTIONS - 1)) * 100; // Section 11 is a report

  return (
    <div className="bg-white border-b border-border px-4 sm:px-6 py-3 shadow-sm">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-navy">
            Section {currentSection} of {TOTAL_SECTIONS}
          </span>
          <span className="text-sm font-medium text-muted hidden sm:block">
            {SECTION_TITLES[currentSection as SectionNumber]}
          </span>
        </div>
        <div className="w-full bg-surface-alt rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-gold-dark to-gold h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2.5">
          {Array.from({ length: TOTAL_SECTIONS }, (_, i) => i + 1).map((num) => {
            const isCurrent = num === currentSection;
            const isCompleted = completedSections.includes(num);

            return (
              <Link
                key={num}
                href={`/assessment/${assessmentId}/section/${num}`}
                className={`
                  group relative w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center
                  text-[10px] sm:text-xs font-semibold transition-all duration-300 hover:scale-110
                  ${isCurrent
                    ? 'bg-gold text-navy shadow-[0_0_0_3px_rgba(245,166,35,0.2)] scale-110'
                    : isCompleted
                      ? 'bg-navy text-white shadow-sm'
                      : 'bg-transparent text-muted border-2 border-gray-300 hover:border-navy/40'
                  }
                `}
              >
                {isCompleted && !isCurrent ? (
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  <span>{num}</span>
                )}
              </Link>
            );
          })}
        </div>
        <p className="text-xs text-muted mt-1.5 sm:hidden text-center">
          {SECTION_TITLES[currentSection as SectionNumber]}
        </p>
      </div>
    </div>
  );
}
