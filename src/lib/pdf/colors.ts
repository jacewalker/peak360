import type { RatingTier } from '@/types/normative';

/**
 * Phase 10.1 - PDF brand language: full dark portal palette.
 *
 * The PDF was previously a light/paper artefact (white pages, navy ink) that
 * diverged from the dark in-app Section 11 / /report once they went dark.
 * We bake the dark-portal vocabulary into the PDF so both surfaces read as
 * the same brand. Cover stays navy (already dark), body pages now render
 * dark with cream ink + gold accents.
 *
 * Values are pre-blended onto the dominant body-page surface (`bgLight` =
 * `#0e0e10`, the equivalent of in-app `--color-bg-2`) so that opacity-style
 * tokens (text-dim 62%, line 10%) come through as solid hexes that
 * @react-pdf/renderer can render reliably. Cover (`navy`) keeps `white`
 * text via direct hex - preserved verbatim per the cover-sovereignty rule.
 *
 * Tier and status palettes (TIER_COLORS_PDF, TRAFFIC_LIGHT_HEX, etc.) stay
 * sovereign per D-16 - same hues, dark-tinted backgrounds where they sit.
 */
export const COLORS = {
  // Cover + accent (preserved - cover is sovereign navy + gold-brand)
  navy: '#1a365d',
  navyDark: '#0f2440',
  navyLight: '#2d5986',
  gold: '#c9a24a',       // Phase 9 gold-brand
  goldDark: '#e8d6a8',   // Phase 9 champagne (used as gold-darker accent)

  // Body-page surfaces (DARK - equivalents of in-app --color-bg / --color-bg-2 / --color-bg-3)
  page: '#0a0a0b',       // outer page bg (--color-bg)
  bgLight: '#0e0e10',    // primary content surface (--color-bg-2)
  bgLighter: '#131316',  // elevated content surface (--color-bg-3)

  // Ink (cream, pre-blended onto bgLight)
  textPrimary: '#ece5d3',    // full cream (in-app --color-text)
  textSecondary: '#97938a',  // cream @ 62% baked (--color-text-dim)
  textMuted: '#716e67',      // cream @ 45% baked (between dim and faint, AA-safe at body sizes)
  textFaint: '#454340',      // cream @ 25% baked (decorative only - fails AA at body, OK for ornaments)

  // Lines / dividers (gold-tinted 10% baked, matches --color-line)
  border: '#23221f',
  borderLight: '#131316',    // same hex as bgLighter - used as the "lighter divider" surface

  // Foreground white (kept for cover text, tier-pill / status-chip foregrounds)
  white: '#ffffff',
};

/**
 * Solid tier dot/border colors - sovereign per D-16. Identical to the
 * in-app TIER_DOT in Section 11.
 */
export const TIER_COLORS_PDF: Record<RatingTier, string> = {
  elite: '#10b981',
  great: '#3b82f6',
  normal: '#6b7280',
  cautious: '#f59e0b',
  poor: '#ef4444',
};

/**
 * Tier row backgrounds - pre-blended (tier hue @ 15% on `bgLight` #0e0e10),
 * matching the in-app `bg-{tier}-500/15` Tailwind classes used in Section 11
 * and DetailedMarkerResultsDisclosure. Visually identical to the on-screen
 * marker rows.
 */
export const TIER_ROW_BG_PDF: Record<RatingTier, string> = {
  elite: '#0e2821',
  great: '#151f33',
  normal: '#1c1d20',
  cautious: '#30240f',
  poor: '#2f1617',
};

/**
 * Left-border accent on marker rows - solid status hue, sovereign.
 */
export const TIER_BORDER_PDF: Record<RatingTier, string> = {
  elite: '#10b981',
  great: '#3b82f6',
  normal: '#9ca3af',
  cautious: '#f59e0b',
  poor: '#ef4444',
};

/**
 * Tier text - brightened 300-shade equivalents for legibility on dark bg.
 * Was 700/800 dark shades for light bg; same hue family.
 */
export const TIER_TEXT_PDF: Record<RatingTier, string> = {
  elite: '#6ee7b7',    // emerald-300
  great: '#93c5fd',    // blue-300
  normal: '#d1d5db',   // gray-300
  cautious: '#fcd34d', // amber-300
  poor: '#fca5a5',     // red-300
};

/**
 * Phase 8 - D-28 single-source-of-truth re-export.
 * The PDF mirror page (`src/lib/pdf/components/PillarsPage.tsx`) imports
 * traffic-light colours from this module so PDF-side hex values can never
 * drift from portal-side hex values. The actual constants live in
 * `src/lib/pillars/colors.ts`.
 */
export { TRAFFIC_LIGHT_HEX, TRAFFIC_LIGHT_TEXT, PILLAR_THRESHOLDS, STATUS_LABEL } from '@/lib/pillars/colors';
