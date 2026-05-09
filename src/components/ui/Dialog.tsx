'use client';

import { useEffect, useRef } from 'react';

/**
 * Phase 8 — Hand-rolled Dialog primitive.
 *
 * Implements the WAI-ARIA Authoring Practices Modal Dialog pattern:
 * - Dialog role + modal flag + ariaLabel for the overlay element
 * - Backdrop click and the escape key both invoke onClose
 * - Body scroll lock while open
 * - Focus trap with bidirectional Tab cycling (and wrap)
 * - Initial focus on the first child carrying the autofocus marker, otherwise first tabbable
 * - Focus restoration to the previously-focused element on unmount
 * - Mode auto: bottom-sheet on mobile, centred dialog from the md breakpoint
 * - prefers-reduced-motion respected via Tailwind motion-safe variant
 *
 * No new npm dependency; no portal — caller controls mount lifecycle via `open`.
 */

interface DialogProps {
  open: boolean;
  onClose: () => void;
  mode?: 'centered' | 'bottom-sheet' | 'auto';
  ariaLabel: string;
  children: React.ReactNode;
}

const ESCAPE_KEY = 'Escape';

const TABBABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getTabbables(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR));
  // Filter out hidden elements
  return nodes.filter((el) => el.offsetParent !== null);
}

export default function Dialog({
  open,
  onClose,
  mode = 'auto',
  ariaLabel,
  children,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Body scroll lock + initial focus + focus restoration on unmount
  useEffect(() => {
    if (!open) return;

    // Capture previously-focused element so we can restore on close
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    // Lock body scroll
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move initial focus: first autofocus-marked descendant inside panel, else first tabbable, else panel itself
    const panel = panelRef.current;
    if (panel) {
      const autofocusTarget = panel.querySelector<HTMLElement>('[data-autofocus]');
      if (autofocusTarget) {
        autofocusTarget.focus();
      } else {
        const tabbables = getTabbables(panel);
        if (tabbables.length > 0) {
          tabbables[0].focus();
        } else {
          panel.focus();
        }
      }
    }

    return () => {
      // Restore body overflow
      document.body.style.overflow = previousOverflow;
      // Restore focus to the originating element
      previousFocusRef.current?.focus();
    };
  }, [open]);

  // Keydown handler: escape close + Tab focus trap (with backward branch)
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ESCAPE_KEY) {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const tabbables = getTabbables(panelRef.current);
        if (tabbables.length === 0) {
          e.preventDefault();
          panelRef.current?.focus();
          return;
        }
        const first = tabbables[0];
        const last = tabbables[tabbables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          // Backward: wrap from first → last
          if (active === first || !panelRef.current?.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          // Forward: wrap from last → first
          if (active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  // Overlay layout from mode (CSS handles the breakpoint switch in auto mode — no JS match-media)
  const overlayLayoutClass =
    mode === 'centered'
      ? 'flex items-center justify-center'
      : mode === 'bottom-sheet'
      ? 'flex items-end justify-center'
      : 'flex items-end justify-center md:items-center';

  // Panel chrome from mode
  const panelClass =
    mode === 'centered'
      ? 'max-w-[640px] w-full mx-4 rounded-2xl bg-white p-6 md:p-8 max-h-[90vh] overflow-y-auto'
      : mode === 'bottom-sheet'
      ? 'w-full rounded-t-2xl bg-white p-6 max-h-[90vh] overflow-y-auto'
      : 'w-full md:max-w-[640px] md:mx-4 md:rounded-2xl rounded-t-2xl bg-white p-6 md:p-8 max-h-[90vh] overflow-y-auto';

  // Drag handle: only for auto + bottom-sheet modes, mobile only (hidden md+)
  const showDragHandle = mode !== 'centered';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className={`fixed inset-0 z-50 bg-black/50 motion-safe:transition-opacity ${overlayLayoutClass}`}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative outline-none ${panelClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {showDragHandle && (
          <div
            aria-hidden="true"
            className="md:hidden mx-auto mb-3 h-1 w-9 rounded-full bg-gray-300"
          />
        )}
        {children}
      </div>
    </div>
  );
}
