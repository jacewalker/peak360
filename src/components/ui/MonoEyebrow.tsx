'use client';

import type { ReactNode } from 'react';

interface MonoEyebrowProps {
  children: ReactNode;
  /**
   * Visual mode for the eyebrow.
   * - `hero` (default): gold-brand colour, 0.18em letter-spacing — used above
   *   page heroes, sidebar logo, role chips, login footer.
   * - `meta`: text-faint colour, 0.16em letter-spacing — used for meta labels,
   *   sidebar role tags, table column headers.
   */
  variant?: 'hero' | 'meta';
  /** Render as inline `<span>` (default) or block `<div>`. */
  as?: 'span' | 'div';
  /** Additional Tailwind utilities (layout / spacing) appended after variant classes. */
  className?: string;
}

/**
 * Phase 9 single-responsibility presentation primitive — a JetBrains Mono 11px
 * uppercase eyebrow used wherever the design calls for it (sidebar logo, role
 * chip, page heroes, auto-save labels, login footer, etc.).
 *
 * Two visual modes share the same role (one typographic size, two colours +
 * letter-spacings) per UI-SPEC §Typography "Eyebrow / Meta" row.
 *
 * Renders plain React children only — no raw-HTML injection.
 */
export default function MonoEyebrow({
  children,
  variant = 'hero',
  as = 'span',
  className = '',
}: MonoEyebrowProps) {
  const variantClasses =
    variant === 'hero'
      ? 'font-mono text-[11px] uppercase tracking-[0.18em] text-gold-brand'
      : 'font-mono text-[11px] uppercase tracking-[0.16em] text-text-faint';

  const composed = className ? `${variantClasses} ${className}` : variantClasses;

  if (as === 'div') {
    return <div className={composed}>{children}</div>;
  }
  return <span className={composed}>{children}</span>;
}
