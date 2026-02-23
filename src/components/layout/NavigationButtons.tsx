'use client';

import { TOTAL_SECTIONS } from '@/types/assessment';

interface NavigationButtonsProps {
  currentSection: number;
  onPrev: () => void;
  onNext: () => void;
  isSaving?: boolean;
  lastSaved?: string | null;
}

export default function NavigationButtons({
  currentSection,
  onPrev,
  onNext,
  isSaving,
  lastSaved,
}: NavigationButtonsProps) {
  return (
    <div className="bg-white border-t border-border px-4 sm:px-6 py-3 sm:py-4 no-print shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        <button
          onClick={onPrev}
          disabled={currentSection === 1}
          className="px-4 sm:px-6 py-2.5 rounded-lg font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-surface-alt text-navy hover:bg-border hover:shadow-sm text-sm sm:text-base"
        >
          {'\u2190'} <span className="hidden sm:inline">Previous</span><span className="sm:hidden">Prev</span>
        </button>

        <div className="text-xs text-muted flex items-center gap-2">
          {isSaving ? (
            <>
              <span className="w-3 h-3 border-2 border-gold border-t-transparent rounded-full animate-spin" />
              <span className="text-gold font-medium hidden sm:inline">Saving...</span>
            </>
          ) : lastSaved ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-rating-elite" />
              <span className="hidden sm:inline">Saved at {lastSaved}</span>
            </>
          ) : null}
        </div>

        <button
          onClick={onNext}
          className={`px-4 sm:px-6 py-2.5 rounded-lg font-medium transition-all hover:shadow-md hover:-translate-y-px text-sm sm:text-base ${
            currentSection === TOTAL_SECTIONS
              ? 'bg-gold text-navy hover:bg-gold-light'
              : 'bg-navy text-white hover:bg-navy-light'
          }`}
        >
          {currentSection === TOTAL_SECTIONS ? 'Complete' : <>Next {'\u2192'}</>}
        </button>
      </div>
    </div>
  );
}
