export type RatingTier = 'poor' | 'cautious' | 'normal' | 'great' | 'elite';

export interface TierRange {
  min: number;
  max: number;
}

export type TierRanges = Record<RatingTier, TierRange>;

export interface SimpleMarker extends TierRanges {
  unit: string;
  note?: string;
}

export interface GenderedAgeMarker {
  unit: string;
  note?: string;
  male: Record<string, TierRanges>;
  female: Record<string, TierRanges>;
}

export interface GenderedMarker {
  unit: string;
  note?: string;
  male: TierRanges;
  female: TierRanges;
}

export type NormativeMarker = SimpleMarker | GenderedAgeMarker | GenderedMarker;

export interface NormativeData {
  blood_tests: Record<string, SimpleMarker>;
  body_comp: {
    bmi: SimpleMarker;
    bwi: SimpleMarker;
    body_fat_percent: GenderedAgeMarker;
    waist_to_hip: GenderedMarker;
  };
  fitness: {
    vo2max: GenderedAgeMarker;
    resting_hr: SimpleMarker;
    blood_pressure_systolic: SimpleMarker;
  };
  mobility: Record<string, SimpleMarker>;
  strength: Record<string, SimpleMarker | GenderedMarker | GenderedAgeMarker>;
}

export interface RatingResult {
  tier: RatingTier;
  value: number;
  unit: string;
  note?: string;
}

export const TIER_COLORS: Record<RatingTier, string> = {
  elite: 'text-emerald-700 bg-emerald-100 border-emerald-300',
  great: 'text-blue-700 bg-blue-100 border-blue-300',
  normal: 'text-gray-700 bg-gray-100 border-gray-300',
  cautious: 'text-amber-700 bg-amber-100 border-amber-300',
  poor: 'text-red-700 bg-red-100 border-red-300',
};

export const TIER_BG_STRONG: Record<RatingTier, string> = {
  elite: 'bg-emerald-500 text-white',
  great: 'bg-blue-500 text-white',
  normal: 'bg-gray-400 text-white',
  cautious: 'bg-amber-400 text-white',
  poor: 'bg-red-500 text-white',
};

export const TIER_BORDER: Record<RatingTier, string> = {
  elite: 'border-l-emerald-500',
  great: 'border-l-blue-500',
  normal: 'border-l-gray-400',
  cautious: 'border-l-amber-400',
  poor: 'border-l-red-500',
};

export const TIER_LABELS: Record<RatingTier, string> = {
  elite: 'Elite',
  great: 'Great',
  normal: 'Normal',
  cautious: 'Cautious',
  poor: 'Poor',
};

export interface NormativeRangeRow {
  id: number;
  testKey: string;
  category: string;
  gender: string | null;
  ageGroup: string | null;
  unit: string | null;
  note: string | null;
  tiers: TierRanges | null;
  severityWeight: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Shape of the JSON stored in normative_versions.ranges_json.
 *  Each testKey maps to its unit/note metadata and an array of variants
 *  (one per gender/ageGroup combination). Used by getStandardsFromSnapshot
 *  in ratings.ts and mergeDbWithHardcoded in versioning.ts.
 */
export interface NormativeVersionVariant {
  gender: string | null;
  ageGroup: string | null;
  tiers: TierRanges;
}

export interface NormativeVersionMarker {
  unit?: string | null;
  note?: string | null;
  severityWeight?: number | null;
  variants: NormativeVersionVariant[];
}

export type NormativeVersionSnapshot = Record<string, NormativeVersionMarker>;
