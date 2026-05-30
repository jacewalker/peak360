import type { RatingTier } from '@/types/normative';

/**
 * Phase 8 — Peak Living pillar typings.
 *
 * Pillar keys follow camelCase (CLAUDE.md §Key Patterns).
 * Sources of truth:
 * - DB schema: src/lib/db/schema.ts pillarDefinitions / pillarPageCopy / pillarPrescriptions
 * - User-facing copy: 08-UI-SPEC.md (seeded into DB at migration time)
 */

export type PillarKey =
  | 'cardiometabolic'
  | 'bodyComposition'
  | 'strength'
  | 'balance'
  | 'vo2';

export const PILLAR_KEYS: readonly PillarKey[] = [
  'cardiometabolic',
  'bodyComposition',
  'strength',
  'balance',
  'vo2',
] as const;

/**
 * Human-friendly pillar labels for admin form dropdowns (create + edit marker).
 * The canonical display labels live in the pillar_definitions DB table (Phase 8);
 * these are a static mirror so the admin forms do not need an async fetch.
 */
export const PILLAR_LABELS: Record<PillarKey, string> = {
  cardiometabolic: 'Cardiometabolic',
  bodyComposition: 'Body Composition',
  strength: 'Strength',
  balance: 'Balance',
  vo2: 'Aerobic Fitness (VO2)',
};

export type PillarStatus = 'red' | 'amber' | 'green' | 'pending';

export interface PillarDefinition {
  pillarKey: PillarKey;
  label: string;
  shortSummary: string;
  plainMeaning: string;
  sortOrder: number;
  updatedBy: string;
  updatedAt: number;
}

export interface PillarPageCopy {
  heading: string;
  intro: string;
  updatedBy: string;
  updatedAt: number;
}

export interface PillarPrescription {
  pillarKey: PillarKey;
  summary: string;
  bullets?: string[] | null;
  fullPlanHref?: string | null;
  updatedBy?: { id: string; name?: string };
  updatedAt?: number;
}

export interface PillarScoreResult {
  score: number | null;
  status: PillarStatus;
  contributingCount: number;
  // Per-tier counts inside the contributing set; useful for Score breakdown UI
  tierCounts: Record<RatingTier, number>;
}
