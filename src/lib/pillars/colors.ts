import type { PillarStatus } from '@/lib/pillars/types';

/**
 * Phase 8 — Traffic-light palette for pillar status.
 *
 * D-28 single-source-of-truth: this file is the ONLY place where these
 * hex values are declared. Both portal CSS (Tailwind arbitrary values)
 * and PDF colour constants (`src/lib/pdf/colors.ts`) import from here.
 *
 * D-11 anti-pattern: do NOT reuse the 5-tier marker palette
 * (`TIER_COLORS_PDF` / `TIER_COLORS`) for pillar status. The 5-tier and
 * 3-state palettes are deliberately separate.
 */

export const TRAFFIC_LIGHT_HEX: Record<PillarStatus, string> = {
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  // 'pending' uses border colour as the fill marker on dashed-border cards
  pending: '#e2e8f0',
};

export const TRAFFIC_LIGHT_TEXT: Record<PillarStatus, string> = {
  green: '#ffffff',
  amber: '#1a202c',
  red: '#ffffff',
  pending: '#64748b',
};

/**
 * D-10 traffic-light thresholds. Locked for v1.
 * Lifted into a single named-export so a future phase can swap to per-coach
 * config without changing UI components.
 */
export const PILLAR_THRESHOLDS = {
  // score >= green → 'green'; score >= amber → 'amber'; else 'red'
  green: 70,
  amber: 40,
} as const;

export const STATUS_LABEL: Record<PillarStatus, string> = {
  green: 'Strong',
  amber: 'Needs improvement',
  red: 'Priority',
  pending: 'Data pending',
};
