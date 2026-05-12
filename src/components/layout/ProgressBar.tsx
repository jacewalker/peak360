'use client';

import Link from 'next/link';
import MonoEyebrow from '@/components/ui/MonoEyebrow';
import { SECTION_TITLES, VISIBLE_SECTIONS, type SectionNumber } from '@/types/assessment';

interface ProgressBarProps {
  currentSection: number;
  assessmentId: string;
  completedSections?: number[];
}

export default function ProgressBar({ currentSection, assessmentId, completedSections = [] }: ProgressBarProps) {
  const visibleCompleted = completedSections.filter((s) => VISIBLE_SECTIONS.includes(s));
  const completedCount = visibleCompleted.length;
  const progress = (completedCount / (VISIBLE_SECTIONS.length - 1)) * 100; // Section 11 is a report

  return (
    <div className="bg-bg-2 border-b border-line px-4 sm:px-6 py-3">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <MonoEyebrow variant="hero">
            Section {VISIBLE_SECTIONS.indexOf(currentSection) + 1} of {VISIBLE_SECTIONS.length}
          </MonoEyebrow>
          <span className="text-[13px] font-medium text-text-dim hidden sm:block">
            {SECTION_TITLES[currentSection as SectionNumber]}
          </span>
        </div>
        <div className="w-full bg-line h-1 overflow-hidden">
          <div
            className="bg-gold-brand h-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-2.5 overflow-x-auto scrollbar-hide gap-1 sm:gap-0">
          {VISIBLE_SECTIONS.map((num, idx) => {
            const displayNum = idx + 1;
            const isCurrent = num === currentSection;
            const isCompleted = completedSections.includes(num);

            return (
              <Link
                key={num}
                href={`/portal/assessment/${assessmentId}/section/${num}`}
                className={`
                  group relative w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shrink-0
                  text-[11px] font-semibold transition-all duration-300 hover:scale-110
                  ${isCurrent
                    ? 'bg-gold-brand text-bg scale-110'
                    : isCompleted
                      ? 'bg-bg-3 text-text border border-line-2'
                      : 'bg-transparent text-text-dim border border-line hover:border-gold-brand'
                  }
                `}
              >
                {isCompleted && !isCurrent ? (
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  <span>{displayNum}</span>
                )}
              </Link>
            );
          })}
        </div>
        <p className="text-[13px] text-text-dim mt-1.5 sm:hidden text-center">
          {SECTION_TITLES[currentSection as SectionNumber]}
        </p>
      </div>
    </div>
  );
}
