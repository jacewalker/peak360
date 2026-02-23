'use client';

import { SECTION_TITLES, TOTAL_SECTIONS, type SectionNumber } from '@/types/assessment';

interface ProgressBarProps {
  currentSection: number;
  completedSections?: number[];
}

export default function ProgressBar({ currentSection, completedSections = [] }: ProgressBarProps) {
  const progress = ((currentSection - 1) / (TOTAL_SECTIONS - 1)) * 100;

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
          {Array.from({ length: TOTAL_SECTIONS }, (_, i) => i + 1).map((num) => (
            <div
              key={num}
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-semibold transition-all ${
                num === currentSection
                  ? 'bg-gold text-navy shadow-sm scale-110'
                  : num < currentSection || completedSections.includes(num)
                  ? 'bg-navy text-white'
                  : 'bg-surface-alt text-muted'
              }`}
            >
              {num}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-1.5 sm:hidden text-center">
          {SECTION_TITLES[currentSection as SectionNumber]}
        </p>
      </div>
    </div>
  );
}
