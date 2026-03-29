'use client';

import { VISIBLE_SECTIONS } from '@/types/assessment';

interface NavigationButtonsProps {
  currentSection: number;
  onPrev: () => void;
  onNext: () => void;
  onSaveExit?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
  lastSaved?: string | null;
}

export default function NavigationButtons({
  currentSection,
  onPrev,
  onNext,
  onSaveExit,
  onCancel,
  isSaving,
  lastSaved,
}: NavigationButtonsProps) {
  return (
    <div className="bg-white border-t border-border px-4 sm:px-6 py-3 sm:py-4 no-print shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
      <div className="max-w-6xl mx-auto">
        {/* Save status - visible on mobile too */}
        <div className="text-xs text-muted flex items-center justify-center gap-2 mb-2 sm:hidden">
          {isSaving ? (
            <>
              <span className="w-3 h-3 border-2 border-gold border-t-transparent rounded-full animate-spin" />
              <span className="text-gold font-medium">Saving...</span>
            </>
          ) : lastSaved ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-rating-elite" />
              <span>Saved at {lastSaved}</span>
            </>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2">
          {/* Left: Prev + Cancel */}
          <div className="flex items-center gap-2">
            <button
              onClick={onPrev}
              disabled={currentSection === VISIBLE_SECTIONS[0]}
              className="px-4 sm:px-6 py-3 sm:py-2.5 rounded-lg font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-surface-alt text-navy hover:bg-border hover:shadow-sm text-sm sm:text-base"
            >
              {'\u2190'} <span className="hidden sm:inline">Previous</span><span className="sm:hidden">Prev</span>
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="hidden sm:block px-4 py-2.5 rounded-lg font-medium text-sm text-muted hover:text-red-600 hover:bg-red-50 transition-all"
              >
                Cancel & Discard
              </button>
            )}
          </div>

          {/* Center: Save status - desktop only */}
          <div className="text-xs text-muted hidden sm:flex items-center gap-2">
            {isSaving ? (
              <>
                <span className="w-3 h-3 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                <span className="text-gold font-medium">Saving...</span>
              </>
            ) : lastSaved ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-rating-elite" />
                <span>Saved at {lastSaved}</span>
              </>
            ) : null}
          </div>

          {/* Right: Save & Exit + Next */}
          <div className="flex items-center gap-2">
            {onSaveExit && (
              <button
                onClick={onSaveExit}
                className="hidden sm:block px-4 py-2.5 rounded-lg font-medium text-sm bg-surface-alt text-navy hover:bg-border hover:shadow-sm transition-all"
              >
                Save & Exit
              </button>
            )}
            <button
              onClick={onNext}
              className={`px-4 sm:px-6 py-3 sm:py-2.5 rounded-lg font-medium transition-all hover:shadow-md hover:-translate-y-px text-sm sm:text-base ${
                currentSection === VISIBLE_SECTIONS[VISIBLE_SECTIONS.length - 1]
                  ? 'bg-gold text-navy hover:bg-gold-light'
                  : 'bg-navy text-white hover:bg-navy-light'
              }`}
            >
              {currentSection === VISIBLE_SECTIONS[VISIBLE_SECTIONS.length - 1] ? 'Complete' : <>Next {'\u2192'}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
