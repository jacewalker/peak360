import type { RatingTier, TierRanges } from '@/types/normative';
import type { PillarDefinition, PillarPageCopy, PillarPrescription } from '@/lib/pillars/types';

export interface ReportMarker {
  key: string;
  label: string;
  value: number | null;
  tier: RatingTier | null;
  unit: string;
  category: string;
  subcategory?: string;
  hasNorms: boolean;
  resolvedStandards?: TierRanges | null;
}

export interface Insight {
  /**
   * Test key of the marker that triggered this insight. Routes the insight
   * into the matching pillar modal in the portal view; ignored by PDF rendering.
   */
  markerKey: string;
  title: string;
  why: string;
  doNow: string[];
}

export interface ReportData {
  assessmentId: string;
  clientName: string;
  clientAge: number | null;
  clientGender: string | null;
  clientEmail: string | null;
  clientDob: string | null;
  assessmentDate: string;
  readiness: Record<string, unknown>;
  medical: Record<string, unknown>;
  consent: Record<string, unknown>;
  markers: ReportMarker[];
  insights: Insight[];
  tierCounts: Record<RatingTier, number>;
  totalRated: number;
  // Phase 8 — Peak Living pillars data
  definitions: PillarDefinition[];
  pageCopy: PillarPageCopy | null;
  prescriptions: PillarPrescription[];
}
