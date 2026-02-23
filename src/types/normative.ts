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
    body_fat_percent: GenderedAgeMarker;
    waist_to_hip: GenderedMarker;
  };
  fitness: {
    vo2max: GenderedAgeMarker;
    resting_hr: SimpleMarker;
    blood_pressure_systolic: SimpleMarker;
  };
  mobility: Record<string, SimpleMarker>;
}

export interface RatingResult {
  tier: RatingTier;
  value: number;
  unit: string;
  note?: string;
}

export const TIER_COLORS: Record<RatingTier, string> = {
  elite: 'text-rating-elite bg-emerald-50 border-emerald-200',
  great: 'text-rating-great bg-blue-50 border-blue-200',
  normal: 'text-rating-normal bg-gray-50 border-gray-200',
  cautious: 'text-rating-cautious bg-amber-50 border-amber-200',
  poor: 'text-rating-poor bg-red-50 border-red-200',
};

export const TIER_LABELS: Record<RatingTier, string> = {
  elite: 'Elite',
  great: 'Great',
  normal: 'Normal',
  cautious: 'Cautious',
  poor: 'Poor',
};
