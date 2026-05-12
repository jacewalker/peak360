'use client';

import { VISIBLE_SECTIONS } from '@/types/assessment';

interface NavigationButtonsProps {
  currentSection: number;
  onPrev: () => void;
  onNext: () => void;
  onComplete?: () => void;
  onSaveExit?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
  lastSaved?: string | null;
  isDirty?: boolean;
}

function SaveStatus({
  isSaving,
  lastSaved,
  isDirty,
}: {
  isSaving?: boolean;
  lastSaved?: string | null;
  isDirty?: boolean;
}) {
  if (isSaving) {
    return (
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-dim flex items-center gap-2">
        <span
          className="w-1.5 h-1.5 rounded-full bg-gold-brand"
          style={{ animation: 'pulse-gold 2s ease-out infinite' }}
        />
        Saving…
      </span>
    );
  }
  if (lastSaved) {
    return (
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-dim flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-status-good" />
        Saved · {lastSaved}
      </span>
    );
  }
  // Derived proxy state per RESEARCH §Assumption A5: dirty + never saved.
  if (isDirty) {
    return (
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-danger flex items-center gap-2">
        Unsaved changes
      </span>
    );
  }
  return null;
}

export default function NavigationButtons({
  currentSection,
  onPrev,
  onNext,
  onComplete,
  onSaveExit,
  onCancel,
  isSaving,
  lastSaved,
  isDirty,
}: NavigationButtonsProps) {
  const isLastSection = currentSection === VISIBLE_SECTIONS[VISIBLE_SECTIONS.length - 1];
  const isFirstSection = currentSection === VISIBLE_SECTIONS[0];
  const prevIdx = VISIBLE_SECTIONS.indexOf(currentSection) - 1;
  const prevSection = prevIdx >= 0 ? VISIBLE_SECTIONS[prevIdx] : null;
  const prevLabel = isFirstSection || prevSection === null
    ? 'Back to dashboard'
    : `Back to section ${prevSection}`;
  const nextLabel = isLastSection ? 'Complete assessment' : 'Save & continue';

  return (
    <div className="bg-bg-2 border-t border-line px-4 sm:px-6 py-3 sm:py-4 no-print">
      <div className="max-w-6xl mx-auto">
        {/* Save status — visible on mobile too */}
        <div className="flex items-center justify-center gap-2 mb-2 sm:hidden">
          <SaveStatus isSaving={isSaving} lastSaved={lastSaved} isDirty={isDirty} />
        </div>

        <div className="flex items-center justify-between gap-2">
          {/* Left: Prev + Cancel */}
          <div className="flex items-center gap-2">
            <button
              onClick={onPrev}
              disabled={isFirstSection && !onCancel}
              className="px-4 sm:px-6 py-3 sm:py-2.5 rounded-lg text-[13px] font-medium tracking-[0.02em] transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-transparent border border-line-2 text-text hover:border-gold-brand hover:text-gold-brand"
            >
              {prevLabel}
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                className="hidden sm:block px-4 py-2.5 rounded-lg text-[13px] font-medium tracking-[0.02em] text-text-dim hover:text-danger hover:bg-line transition-all"
              >
                Cancel & discard
              </button>
            )}
          </div>

          {/* Center: Save status — desktop only */}
          <div className="hidden sm:flex items-center gap-2">
            <SaveStatus isSaving={isSaving} lastSaved={lastSaved} isDirty={isDirty} />
          </div>

          {/* Right: Save & Exit + Next/Complete */}
          <div className="flex items-center gap-2">
            {onSaveExit && (
              <button
                onClick={onSaveExit}
                className="hidden sm:block px-4 py-2.5 rounded-lg text-[13px] font-medium tracking-[0.02em] bg-transparent border border-line-2 text-text hover:border-gold-brand hover:text-gold-brand transition-all"
              >
                Save & exit
              </button>
            )}
            <button
              onClick={isLastSection && onComplete ? onComplete : onNext}
              className="px-4 sm:px-6 py-3 sm:py-2.5 rounded-lg text-[13px] font-medium tracking-[0.02em] transition-all bg-gold-brand text-bg hover:bg-champagne disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {nextLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
