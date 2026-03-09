'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { getPeak360Rating } from '@/lib/normative/ratings';
import { generatePeak360Insights } from '@/lib/normative/insights';
import type { RatingTier } from '@/types/normative';
import { TIER_LABELS } from '@/types/normative';

interface ReportMarker {
  key: string;
  label: string;
  value: number | null;
  tier: RatingTier | null;
  unit: string;
  category: string;
  subcategory?: string;
  hasNorms: boolean;
}

interface Insight {
  title: string;
  why: string;
  doNow: string[];
}

interface Section11Props {
  assessmentId: string;
}

const TIER_DOT: Record<RatingTier, string> = {
  elite: '#10b981',
  great: '#3b82f6',
  normal: '#6b7280',
  cautious: '#f59e0b',
  poor: '#ef4444',
};

const TIER_ROW_BG: Record<RatingTier, string> = {
  elite: 'bg-emerald-50/80',
  great: 'bg-blue-50/80',
  normal: 'bg-gray-50/60',
  cautious: 'bg-amber-50/80',
  poor: 'bg-red-50/80',
};

const TIER_ROW_BORDER: Record<RatingTier, string> = {
  elite: 'border-l-emerald-500',
  great: 'border-l-blue-500',
  normal: 'border-l-gray-300',
  cautious: 'border-l-amber-500',
  poor: 'border-l-red-500',
};

const TIER_TEXT: Record<RatingTier, string> = {
  elite: 'text-emerald-700',
  great: 'text-blue-700',
  normal: 'text-gray-600',
  cautious: 'text-amber-700',
  poor: 'text-red-700',
};

// ─── REPORT MARKERS ───────────────────────────────────────────────────────────
// hasNorms: true = has normative thresholds, false = display value+unit only
// Non-norm markers with no value are hidden from the report to avoid clutter.

interface MarkerDef {
  testKey: string;
  label: string;
  section: number;
  dataKey: string;
  category: string;
  subcategory?: string;
  fallbackUnit?: string;
  hasNorms: boolean;
}

const REPORT_MARKERS: MarkerDef[] = [
  // ── Blood Tests & Biomarkers ──
  // Lipid Panel
  { testKey: 'cholesterol_total', label: 'Total Cholesterol', section: 5, dataKey: 'cholesterolTotal', category: 'Blood Tests & Biomarkers', subcategory: 'Lipid Panel', hasNorms: true },
  { testKey: 'ldl_cholesterol', label: 'LDL Cholesterol', section: 5, dataKey: 'ldl', category: 'Blood Tests & Biomarkers', subcategory: 'Lipid Panel', hasNorms: true },
  { testKey: 'hdl_cholesterol', label: 'HDL Cholesterol', section: 5, dataKey: 'hdl', category: 'Blood Tests & Biomarkers', subcategory: 'Lipid Panel', hasNorms: true },
  { testKey: 'triglycerides', label: 'Triglycerides', section: 5, dataKey: 'triglycerides', category: 'Blood Tests & Biomarkers', subcategory: 'Lipid Panel', hasNorms: true },
  { testKey: 'apob', label: 'ApoB', section: 5, dataKey: 'apoB', category: 'Blood Tests & Biomarkers', subcategory: 'Lipid Panel', fallbackUnit: 'mg/dL', hasNorms: false },
  { testKey: 'lpa', label: 'Lp(a)', section: 5, dataKey: 'lpa', category: 'Blood Tests & Biomarkers', subcategory: 'Lipid Panel', fallbackUnit: 'mg/dL', hasNorms: false },
  // Glucose & Metabolic
  { testKey: 'fasting_glucose', label: 'Fasting Glucose', section: 5, dataKey: 'glucose', category: 'Blood Tests & Biomarkers', subcategory: 'Glucose & Metabolic', hasNorms: true },
  { testKey: 'hba1c', label: 'HbA1c', section: 5, dataKey: 'hba1c', category: 'Blood Tests & Biomarkers', subcategory: 'Glucose & Metabolic', hasNorms: true },
  { testKey: 'insulin', label: 'Insulin', section: 5, dataKey: 'insulin', category: 'Blood Tests & Biomarkers', subcategory: 'Glucose & Metabolic', fallbackUnit: 'uU/mL', hasNorms: false },
  // Inflammation
  { testKey: 'crp_hs', label: 'hs-CRP', section: 5, dataKey: 'hsCRP', category: 'Blood Tests & Biomarkers', subcategory: 'Inflammation', hasNorms: true },
  { testKey: 'homocysteine', label: 'Homocysteine', section: 5, dataKey: 'homocysteine', category: 'Blood Tests & Biomarkers', subcategory: 'Inflammation', fallbackUnit: 'umol/L', hasNorms: false },
  { testKey: 'ck', label: 'Creatine Kinase', section: 5, dataKey: 'ck', category: 'Blood Tests & Biomarkers', subcategory: 'Inflammation', fallbackUnit: 'U/L', hasNorms: false },
  { testKey: 'uric_acid', label: 'Uric Acid', section: 5, dataKey: 'uricAcid', category: 'Blood Tests & Biomarkers', subcategory: 'Inflammation', fallbackUnit: 'mg/dL', hasNorms: false },
  // Vitamins & Minerals
  { testKey: 'vitamin_d_25oh', label: 'Vitamin D', section: 5, dataKey: 'vitaminD', category: 'Blood Tests & Biomarkers', subcategory: 'Vitamins & Minerals', hasNorms: true },
  { testKey: 'vitamin_b12', label: 'Vitamin B12', section: 5, dataKey: 'vitaminB12', category: 'Blood Tests & Biomarkers', subcategory: 'Vitamins & Minerals', fallbackUnit: 'pg/mL', hasNorms: false },
  { testKey: 'folate', label: 'Folate', section: 5, dataKey: 'folate', category: 'Blood Tests & Biomarkers', subcategory: 'Vitamins & Minerals', fallbackUnit: 'ng/mL', hasNorms: false },
  { testKey: 'magnesium', label: 'Magnesium', section: 5, dataKey: 'magnesium', category: 'Blood Tests & Biomarkers', subcategory: 'Vitamins & Minerals', fallbackUnit: 'mg/dL', hasNorms: false },
  { testKey: 'zinc', label: 'Zinc', section: 5, dataKey: 'zinc', category: 'Blood Tests & Biomarkers', subcategory: 'Vitamins & Minerals', fallbackUnit: 'ug/dL', hasNorms: false },
  // Iron Studies
  { testKey: 'serum_iron', label: 'Serum Iron', section: 5, dataKey: 'serumIron', category: 'Blood Tests & Biomarkers', subcategory: 'Iron Studies', fallbackUnit: 'ug/dL', hasNorms: false },
  { testKey: 'tibc', label: 'TIBC', section: 5, dataKey: 'tibc', category: 'Blood Tests & Biomarkers', subcategory: 'Iron Studies', fallbackUnit: 'ug/dL', hasNorms: false },
  { testKey: 'transferrin_sat', label: 'Transferrin Sat', section: 5, dataKey: 'transferrinSat', category: 'Blood Tests & Biomarkers', subcategory: 'Iron Studies', fallbackUnit: '%', hasNorms: false },
  { testKey: 'ferritin', label: 'Ferritin', section: 5, dataKey: 'ferritin', category: 'Blood Tests & Biomarkers', subcategory: 'Iron Studies', fallbackUnit: 'ng/mL', hasNorms: false },
  // Thyroid
  { testKey: 'tsh', label: 'TSH', section: 5, dataKey: 'tsh', category: 'Blood Tests & Biomarkers', subcategory: 'Thyroid', fallbackUnit: 'mIU/L', hasNorms: false },
  { testKey: 'ft3', label: 'FT3', section: 5, dataKey: 'ft3', category: 'Blood Tests & Biomarkers', subcategory: 'Thyroid', fallbackUnit: 'pg/mL', hasNorms: false },
  { testKey: 'ft4', label: 'FT4', section: 5, dataKey: 'ft4', category: 'Blood Tests & Biomarkers', subcategory: 'Thyroid', fallbackUnit: 'ng/dL', hasNorms: false },
  { testKey: 'tgab', label: 'Thyroglobulin Ab', section: 5, dataKey: 'tgab', category: 'Blood Tests & Biomarkers', subcategory: 'Thyroid', fallbackUnit: 'IU/mL', hasNorms: false },
  { testKey: 'tpo', label: 'Thyroperoxidase Ab', section: 5, dataKey: 'tpo', category: 'Blood Tests & Biomarkers', subcategory: 'Thyroid', fallbackUnit: 'IU/mL', hasNorms: false },
  // Hormones
  { testKey: 'total_testosterone', label: 'Total Testosterone', section: 5, dataKey: 'totalTestosterone', category: 'Blood Tests & Biomarkers', subcategory: 'Hormones', fallbackUnit: 'ng/dL', hasNorms: false },
  { testKey: 'free_testosterone', label: 'Free Testosterone', section: 5, dataKey: 'freeTestosterone', category: 'Blood Tests & Biomarkers', subcategory: 'Hormones', fallbackUnit: 'pg/mL', hasNorms: false },
  { testKey: 'oestradiol', label: 'Oestradiol (E2)', section: 5, dataKey: 'oestradiol', category: 'Blood Tests & Biomarkers', subcategory: 'Hormones', fallbackUnit: 'pg/mL', hasNorms: false },
  { testKey: 'shbg', label: 'SHBG', section: 5, dataKey: 'shbg', category: 'Blood Tests & Biomarkers', subcategory: 'Hormones', fallbackUnit: 'nmol/L', hasNorms: false },
  { testKey: 'cortisol', label: 'Cortisol', section: 5, dataKey: 'cortisol', category: 'Blood Tests & Biomarkers', subcategory: 'Hormones', fallbackUnit: 'ug/dL', hasNorms: false },
  { testKey: 'dheas', label: 'DHEAS', section: 5, dataKey: 'dheas', category: 'Blood Tests & Biomarkers', subcategory: 'Hormones', fallbackUnit: 'ug/dL', hasNorms: false },
  { testKey: 'igf1', label: 'IGF-1', section: 5, dataKey: 'igf1', category: 'Blood Tests & Biomarkers', subcategory: 'Hormones', fallbackUnit: 'ng/mL', hasNorms: false },
  { testKey: 'fsh', label: 'FSH', section: 5, dataKey: 'fsh', category: 'Blood Tests & Biomarkers', subcategory: 'Hormones', fallbackUnit: 'mIU/mL', hasNorms: false },
  { testKey: 'lh', label: 'LH', section: 5, dataKey: 'lh', category: 'Blood Tests & Biomarkers', subcategory: 'Hormones', fallbackUnit: 'mIU/mL', hasNorms: false },
  { testKey: 'prolactin', label: 'Prolactin', section: 5, dataKey: 'prolactin', category: 'Blood Tests & Biomarkers', subcategory: 'Hormones', fallbackUnit: 'ng/mL', hasNorms: false },
  { testKey: 'progesterone', label: 'Progesterone', section: 5, dataKey: 'progesterone', category: 'Blood Tests & Biomarkers', subcategory: 'Hormones', fallbackUnit: 'ng/mL', hasNorms: false },
  // Full Blood Count
  { testKey: 'hemoglobin', label: 'Hemoglobin', section: 5, dataKey: 'hemoglobin', category: 'Blood Tests & Biomarkers', subcategory: 'Full Blood Count', fallbackUnit: 'g/dL', hasNorms: false },
  { testKey: 'rbc', label: 'RBC', section: 5, dataKey: 'rbc', category: 'Blood Tests & Biomarkers', subcategory: 'Full Blood Count', fallbackUnit: 'M/mcL', hasNorms: false },
  { testKey: 'hematocrit', label: 'Hematocrit', section: 5, dataKey: 'hematocrit', category: 'Blood Tests & Biomarkers', subcategory: 'Full Blood Count', fallbackUnit: '%', hasNorms: false },
  { testKey: 'wbc', label: 'WBC', section: 5, dataKey: 'wbc', category: 'Blood Tests & Biomarkers', subcategory: 'Full Blood Count', fallbackUnit: 'cells/mcL', hasNorms: false },
  { testKey: 'platelet', label: 'Platelets', section: 5, dataKey: 'platelet', category: 'Blood Tests & Biomarkers', subcategory: 'Full Blood Count', fallbackUnit: 'cells/mcL', hasNorms: false },
  { testKey: 'mcv', label: 'MCV', section: 5, dataKey: 'mcv', category: 'Blood Tests & Biomarkers', subcategory: 'Full Blood Count', fallbackUnit: 'fL', hasNorms: false },
  { testKey: 'mch', label: 'MCH', section: 5, dataKey: 'mch', category: 'Blood Tests & Biomarkers', subcategory: 'Full Blood Count', fallbackUnit: 'pg', hasNorms: false },
  // Kidney & Electrolytes
  { testKey: 'creatinine', label: 'Creatinine', section: 5, dataKey: 'creatinine', category: 'Blood Tests & Biomarkers', subcategory: 'Kidney & Electrolytes', fallbackUnit: 'mg/dL', hasNorms: false },
  { testKey: 'egfr', label: 'eGFR', section: 5, dataKey: 'egfr', category: 'Blood Tests & Biomarkers', subcategory: 'Kidney & Electrolytes', fallbackUnit: 'mL/min', hasNorms: false },
  { testKey: 'bun', label: 'BUN', section: 5, dataKey: 'bun', category: 'Blood Tests & Biomarkers', subcategory: 'Kidney & Electrolytes', fallbackUnit: 'mg/dL', hasNorms: false },
  { testKey: 'sodium', label: 'Sodium', section: 5, dataKey: 'sodium', category: 'Blood Tests & Biomarkers', subcategory: 'Kidney & Electrolytes', fallbackUnit: 'mmol/L', hasNorms: false },
  { testKey: 'potassium', label: 'Potassium', section: 5, dataKey: 'potassium', category: 'Blood Tests & Biomarkers', subcategory: 'Kidney & Electrolytes', fallbackUnit: 'mmol/L', hasNorms: false },
  { testKey: 'chloride', label: 'Chloride', section: 5, dataKey: 'chloride', category: 'Blood Tests & Biomarkers', subcategory: 'Kidney & Electrolytes', fallbackUnit: 'mmol/L', hasNorms: false },
  { testKey: 'bicarbonate', label: 'Bicarbonate', section: 5, dataKey: 'bicarbonate', category: 'Blood Tests & Biomarkers', subcategory: 'Kidney & Electrolytes', fallbackUnit: 'mmol/L', hasNorms: false },
  // Liver Function
  { testKey: 'alt', label: 'ALT', section: 5, dataKey: 'alt', category: 'Blood Tests & Biomarkers', subcategory: 'Liver Function', fallbackUnit: 'U/L', hasNorms: false },
  { testKey: 'ast', label: 'AST', section: 5, dataKey: 'ast', category: 'Blood Tests & Biomarkers', subcategory: 'Liver Function', fallbackUnit: 'U/L', hasNorms: false },
  { testKey: 'alp', label: 'ALP', section: 5, dataKey: 'alp', category: 'Blood Tests & Biomarkers', subcategory: 'Liver Function', fallbackUnit: 'U/L', hasNorms: false },
  { testKey: 'ggt', label: 'GGT', section: 5, dataKey: 'ggt', category: 'Blood Tests & Biomarkers', subcategory: 'Liver Function', fallbackUnit: 'U/L', hasNorms: false },
  { testKey: 'bilirubin', label: 'Total Bilirubin', section: 5, dataKey: 'bilirubin', category: 'Blood Tests & Biomarkers', subcategory: 'Liver Function', fallbackUnit: 'mg/dL', hasNorms: false },
  { testKey: 'albumin', label: 'Albumin', section: 5, dataKey: 'albumin', category: 'Blood Tests & Biomarkers', subcategory: 'Liver Function', fallbackUnit: 'g/dL', hasNorms: false },
  { testKey: 'total_protein', label: 'Total Protein', section: 5, dataKey: 'totalProtein', category: 'Blood Tests & Biomarkers', subcategory: 'Liver Function', fallbackUnit: 'g/dL', hasNorms: false },
  // Heavy Metals
  { testKey: 'lead', label: 'Lead', section: 5, dataKey: 'lead', category: 'Blood Tests & Biomarkers', subcategory: 'Heavy Metals', fallbackUnit: 'ug/dL', hasNorms: false },
  { testKey: 'mercury', label: 'Mercury', section: 5, dataKey: 'mercury', category: 'Blood Tests & Biomarkers', subcategory: 'Heavy Metals', fallbackUnit: 'ug/L', hasNorms: false },
  { testKey: 'arsenic', label: 'Arsenic', section: 5, dataKey: 'arsenic', category: 'Blood Tests & Biomarkers', subcategory: 'Heavy Metals', fallbackUnit: 'ug/L', hasNorms: false },
  { testKey: 'cadmium', label: 'Cadmium', section: 5, dataKey: 'cadmium', category: 'Blood Tests & Biomarkers', subcategory: 'Heavy Metals', fallbackUnit: 'ug/L', hasNorms: false },

  // ── Body Composition ──
  { testKey: 'bwi', label: 'Evolt360 BWI', section: 6, dataKey: 'bwi', category: 'Body Composition', hasNorms: true },
  { testKey: 'body_fat_percent', label: 'Body Fat %', section: 6, dataKey: 'bodyFatPercentage', category: 'Body Composition', hasNorms: true },
  { testKey: 'waist_to_hip', label: 'Waist-to-Hip Ratio', section: 6, dataKey: 'waistToHipRatio', category: 'Body Composition', hasNorms: true },
  { testKey: 'lean_mass', label: 'Lean Mass', section: 6, dataKey: 'leanMass', category: 'Body Composition', fallbackUnit: 'kg', hasNorms: false },
  { testKey: 'skeletal_muscle_mass', label: 'Skeletal Muscle Mass', section: 6, dataKey: 'skeletalMuscleMass', category: 'Body Composition', fallbackUnit: 'kg', hasNorms: false },
  { testKey: 'fat_mass', label: 'Fat Mass', section: 6, dataKey: 'fatMass', category: 'Body Composition', fallbackUnit: 'kg', hasNorms: false },
  { testKey: 'visceral_fat', label: 'Visceral Fat Rating', section: 6, dataKey: 'visceralFatRating', category: 'Body Composition', fallbackUnit: '', hasNorms: false },
  { testKey: 'bmr', label: 'BMR', section: 6, dataKey: 'bmr', category: 'Body Composition', fallbackUnit: 'kcal/day', hasNorms: false },

  // ── Cardiovascular Fitness ──
  { testKey: 'vo2max', label: 'VO2 Max', section: 7, dataKey: 'vo2max', category: 'Cardiovascular Fitness', hasNorms: true },
  { testKey: 'resting_hr', label: 'Resting Heart Rate', section: 7, dataKey: 'restingHR', category: 'Cardiovascular Fitness', hasNorms: true },
  { testKey: 'blood_pressure_systolic', label: 'BP (Systolic)', section: 7, dataKey: 'bpSystolic', category: 'Cardiovascular Fitness', hasNorms: true },
  { testKey: 'bp_diastolic', label: 'BP (Diastolic)', section: 7, dataKey: 'bpDiastolic', category: 'Cardiovascular Fitness', fallbackUnit: 'mmHg', hasNorms: false },
  { testKey: 'six_min_walk', label: '6-Min Walk Distance', section: 7, dataKey: 'sixMinWalk', category: 'Cardiovascular Fitness', fallbackUnit: 'm', hasNorms: false },

  // ── Strength Testing ──
  { testKey: 'grip_strength_left', label: 'Grip Strength (Left)', section: 8, dataKey: 'gripStrengthLeft', category: 'Strength Testing', hasNorms: true },
  { testKey: 'grip_strength_right', label: 'Grip Strength (Right)', section: 8, dataKey: 'gripStrengthRight', category: 'Strength Testing', hasNorms: true },
  { testKey: 'cmj_left', label: 'CMJ (Left)', section: 8, dataKey: 'cmjLeft', category: 'Strength Testing', hasNorms: true },
  { testKey: 'cmj_right', label: 'CMJ (Right)', section: 8, dataKey: 'cmjRight', category: 'Strength Testing', hasNorms: true },
  { testKey: 'imtp_max_force', label: 'IMTP Max Force', section: 8, dataKey: 'imtpMaxForce', category: 'Strength Testing', hasNorms: true },
  { testKey: 'single_leg_hop_left', label: 'Single Leg Hop (Left)', section: 8, dataKey: 'singleLegHopLeft', category: 'Strength Testing', hasNorms: true },
  { testKey: 'single_leg_hop_right', label: 'Single Leg Hop (Right)', section: 8, dataKey: 'singleLegHopRight', category: 'Strength Testing', hasNorms: true },
  { testKey: 'single_leg_balance_left', label: 'SL Balance (Left)', section: 8, dataKey: 'singleLegBalanceLeft', category: 'Strength Testing', hasNorms: true },
  { testKey: 'single_leg_balance_right', label: 'SL Balance (Right)', section: 8, dataKey: 'singleLegBalanceRight', category: 'Strength Testing', hasNorms: true },
  { testKey: 'shoulder_iso_y_left', label: 'Shoulder Iso-Y (Left)', section: 8, dataKey: 'shoulderIsoYLeft', category: 'Strength Testing', hasNorms: true },
  { testKey: 'shoulder_iso_y_right', label: 'Shoulder Iso-Y (Right)', section: 8, dataKey: 'shoulderIsoYRight', category: 'Strength Testing', hasNorms: true },
  { testKey: 'pushups_max', label: 'Push-Up Max', section: 8, dataKey: 'pushupsMax', category: 'Strength Testing', hasNorms: true },
  { testKey: 'dead_man_hang', label: 'Dead Man Hang', section: 8, dataKey: 'deadManHang', category: 'Strength Testing', hasNorms: true },
  { testKey: 'farmers_carry_distance', label: 'Farmers Carry', section: 8, dataKey: 'farmersCarryDistance', category: 'Strength Testing', hasNorms: true },

  // ── Mobility & Flexibility ──
  { testKey: 'hip_mobility_left', label: 'Hip Mobility (Left)', section: 9, dataKey: 'hipMobilityLeft', category: 'Mobility & Flexibility', hasNorms: true },
  { testKey: 'hip_mobility_right', label: 'Hip Mobility (Right)', section: 9, dataKey: 'hipMobilityRight', category: 'Mobility & Flexibility', hasNorms: true },
  { testKey: 'overhead_reach_left', label: 'Overhead Reach (Left)', section: 9, dataKey: 'overheadReachLeft', category: 'Mobility & Flexibility', fallbackUnit: 'cm', hasNorms: false },
  { testKey: 'overhead_reach_right', label: 'Overhead Reach (Right)', section: 9, dataKey: 'overheadReachRight', category: 'Mobility & Flexibility', fallbackUnit: 'cm', hasNorms: false },
  { testKey: 'shoulder_mobility_left', label: 'Shoulder Mobility (Left)', section: 9, dataKey: 'shoulderMobilityLeft', category: 'Mobility & Flexibility', fallbackUnit: 'cm', hasNorms: false },
  { testKey: 'shoulder_mobility_right', label: 'Shoulder Mobility (Right)', section: 9, dataKey: 'shoulderMobilityRight', category: 'Mobility & Flexibility', fallbackUnit: 'cm', hasNorms: false },
  { testKey: 'ankle_dorsiflexion_left', label: 'Ankle Dorsiflexion (Left)', section: 9, dataKey: 'ankleDorsiflexionLeft', category: 'Mobility & Flexibility', fallbackUnit: 'cm', hasNorms: false },
  { testKey: 'ankle_dorsiflexion_right', label: 'Ankle Dorsiflexion (Right)', section: 9, dataKey: 'ankleDorsiflexionRight', category: 'Mobility & Flexibility', fallbackUnit: 'cm', hasNorms: false },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const CAFFEINE_LABELS: Record<string, string> = {
  none: 'None', '1-cup': '1 Cup', '2-cups': '2 Cups', '3-plus': '3+ Cups', 'energy-drink': 'Energy Drink',
};
const ALCOHOL_LABELS: Record<string, string> = {
  none: 'None', '1-2-drinks': '1-2 Drinks', '3-4-drinks': '3-4 Drinks', '5-plus': '5+ Drinks',
};

function TierPill({ tier }: { tier: RatingTier }) {
  const bg: Record<RatingTier, string> = {
    elite: 'bg-emerald-600',
    great: 'bg-blue-600',
    normal: 'bg-gray-500',
    cautious: 'bg-amber-500',
    poor: 'bg-red-600',
  };
  return (
    <span className={`report-tier-pill inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase text-white ${bg[tier]}`}>
      {TIER_LABELS[tier]}
    </span>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-1 h-6 bg-[#F5A623] rounded-full" />
      <h2 className="text-lg font-bold text-[#1a365d] tracking-tight">{children}</h2>
    </div>
  );
}

function ContextCell({ label, value, warn }: { label: string; value: string | number | null | undefined; warn?: boolean }) {
  const display = value != null && value !== '' ? String(value) : '—';
  return (
    <div className="py-2">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[#64748b] mb-0.5">{label}</p>
      <p className={`text-[13px] font-semibold ${warn ? 'text-red-600' : 'text-[#1a202c]'}`}>{display}</p>
    </div>
  );
}

function YesNoDot({ value }: { value: unknown }) {
  const isYes = String(value).toLowerCase() === 'yes';
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${isYes ? 'bg-red-500' : 'bg-emerald-500'}`} />
      <span className={`text-[12px] font-medium ${isYes ? 'text-red-700' : 'text-[#64748b]'}`}>
        {isYes ? 'Yes' : 'No'}
      </span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Section11({ assessmentId }: Section11Props) {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [clientInfo, setClientInfo] = useState<Record<string, unknown>>({});
  const [readiness, setReadiness] = useState<Record<string, unknown>>({});
  const [medical, setMedical] = useState<Record<string, unknown>>({});
  const [consent, setConsent] = useState<Record<string, unknown>>({});
  const [markers, setMarkers] = useState<ReportMarker[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [tierCounts, setTierCounts] = useState<Record<RatingTier, number>>({
    elite: 0, great: 0, normal: 0, cautious: 0, poor: 0,
  });
  const reportRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  // ── PDF Export ──────────────────────────────────────────────────────────────

  const exportPdf = useCallback(async () => {
    if (!reportRef.current || exporting) return;
    setExporting(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas-pro'),
        import('jspdf'),
      ]);

      if (actionsRef.current) actionsRef.current.style.display = 'none';

      const container = reportRef.current;
      const containerWidth = container.getBoundingClientRect().width;
      const pageHeightPx = (297 / 210) * containerWidth;
      const spacers: HTMLElement[] = [];

      container.querySelectorAll('[data-pdf-break]').forEach((el) => {
        const elTop = (el as HTMLElement).getBoundingClientRect().top - container.getBoundingClientRect().top;
        const currentPage = Math.floor(elTop / pageHeightPx);
        const nextPageTop = (currentPage + 1) * pageHeightPx;
        const gap = nextPageTop - elTop;
        if (gap > 0 && gap < pageHeightPx) {
          const spacer = document.createElement('div');
          spacer.style.height = `${gap}px`;
          spacer.dataset.pdfSpacer = 'true';
          el.parentNode?.insertBefore(spacer, el);
          spacers.push(spacer);
        }
      });

      const canvas = await html2canvas(container, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
      });

      spacers.forEach((s) => s.remove());
      if (actionsRef.current) actionsRef.current.style.display = '';

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');

      let heightLeft = imgHeight;
      let position = 0;
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const clientName = ((clientInfo.clientName as string) || 'Client').replace(/\s+/g, '_');
      pdf.save(`Peak360_Report_${clientName}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  }, [exporting, clientInfo]);

  // ── Data Loading ────────────────────────────────────────────────────────────

  useEffect(() => {
    const loadReport = async () => {
      const sections: Record<number, Record<string, unknown>> = {};
      const fetches = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(async (num) => {
        const res = await fetch(`/api/assessments/${assessmentId}/sections/${num}`);
        const { data } = await res.json();
        sections[num] = (data || {}) as Record<string, unknown>;
      });
      await Promise.all(fetches);

      const info = sections[1] || {};
      setClientInfo(info);
      setReadiness(sections[2] || {});
      setMedical(sections[3] || {});
      setConsent(sections[4] || {});

      const age = info.clientAge as number || null;
      const gender = info.clientGender as string || null;

      const evaluated: ReportMarker[] = [];
      const counts: Record<RatingTier, number> = { elite: 0, great: 0, normal: 0, cautious: 0, poor: 0 };

      for (const m of REPORT_MARKERS) {
        const sectionData = sections[m.section] || {};
        const rawValue = sectionData[m.dataKey];
        const value = rawValue != null ? Number(rawValue) : null;

        if (value === null || isNaN(value)) {
          evaluated.push({ key: m.testKey, label: m.label, value: null, tier: null, unit: m.fallbackUnit || '', category: m.category, subcategory: m.subcategory, hasNorms: m.hasNorms });
          continue;
        }

        const rating = getPeak360Rating(m.testKey, value, age, gender);
        const tier = rating?.tier || null;
        if (tier) counts[tier]++;

        evaluated.push({
          key: m.testKey,
          label: m.label,
          value,
          tier,
          unit: rating?.unit || m.fallbackUnit || '',
          category: m.category,
          subcategory: m.subcategory,
          hasNorms: m.hasNorms,
        });
      }

      setMarkers(evaluated);
      setTierCounts(counts);

      const insightMarkers = evaluated
        .filter((m) => m.value !== null)
        .map((m) => ({ testKey: m.key, label: m.label, value: m.value }));
      const generatedInsights = generatePeak360Insights({ age, gender, markers: insightMarkers });
      setInsights(generatedInsights);
      setLoading(false);
    };

    loadReport();
  }, [assessmentId]);

  // ── Loading State ───────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-3 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
          <div>
            <p className="text-navy font-semibold">Generating Report</p>
            <p className="text-sm text-muted mt-1">Analyzing assessment data...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Derived Values ──────────────────────────────────────────────────────────

  const totalRated = Object.values(tierCounts).reduce((a, b) => a + b, 0);
  const categories = [...new Set(REPORT_MARKERS.map((m) => m.category))];
  const reportDate = clientInfo.assessmentDate
    ? new Date(clientInfo.assessmentDate as string).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  const hasMedicalFlags = ['chestPain', 'dizziness', 'heartCondition', 'uncontrolledBP', 'recentSurgery']
    .some((k) => String(medical[k]).toLowerCase() === 'yes');

  const consentSigned = consent.consentAgree === true || consent.consentAgree === 'true';
  const clientSigCaptured = !!consent.clientSignature;
  const coachSigCaptured = !!consent.coachSignature;

  // ── Render Marker Row ───────────────────────────────────────────────────────

  const renderMarkerRow = (m: ReportMarker, i: number) => (
    <div
      key={m.key}
      className={`report-marker-row flex items-center justify-between py-2 px-4 border-l-[3px] ${
        m.tier ? `${TIER_ROW_BG[m.tier]} ${TIER_ROW_BORDER[m.tier]}` : 'bg-gray-50/40 border-l-gray-200'
      } ${i > 0 ? 'border-t border-gray-100' : ''}`}
    >
      <span className="text-[13px] font-medium text-[#1a202c]">{m.label}</span>
      <div className="flex items-center gap-3">
        {m.value !== null ? (
          <>
            <span className="text-[13px] font-semibold text-[#1a202c] tabular-nums tracking-tight">
              {m.value}
              <span className="text-[11px] font-normal text-[#64748b] ml-1">{m.unit}</span>
            </span>
            {m.tier && <TierPill tier={m.tier} />}
          </>
        ) : (
          <span className="text-[11px] text-[#94a3b8] italic">Not recorded</span>
        )}
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div ref={reportRef} className="report-container bg-white">
      {/* ─── REPORT COVER / HEADER ─── */}
      <div className="report-header relative overflow-hidden rounded-2xl print:rounded-none bg-gradient-to-br from-[#0f2440] via-[#1a365d] to-[#2d5986] text-white p-8 sm:p-10">
        <div className="absolute top-0 right-0 w-72 h-72 opacity-[0.07]" style={{
          background: 'radial-gradient(circle at 70% 30%, #F5A623 0%, transparent 60%)',
        }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 opacity-[0.05]" style={{
          background: 'radial-gradient(circle at 30% 70%, #F5A623 0%, transparent 60%)',
        }} />
        <div className="absolute top-6 right-8 w-20 h-[2px] bg-gradient-to-r from-[#F5A623] to-transparent" />
        <div className="absolute bottom-6 left-8 w-16 h-[2px] bg-gradient-to-r from-[#F5A623] to-transparent" />

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <img src="/logo.png" alt="Peak360" className="h-10 sm:h-12 w-auto object-contain drop-shadow-[0_2px_8px_rgba(255,255,255,0.15)]" />
            <div className="h-8 w-[1px] bg-white/20" />
            <span className="text-xs tracking-[0.25em] uppercase text-white/60 font-medium">Longevity Assessment Report</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight mb-1">
            Complete Longevity Analysis
          </h1>
          <div className="h-1 w-16 bg-[#F5A623] rounded-full mt-3 mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-0.5">Client</p>
              <p className="text-sm font-semibold">{(clientInfo.clientName as string) || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-0.5">Date</p>
              <p className="text-sm font-semibold">{reportDate}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-0.5">Age</p>
              <p className="text-sm font-semibold">{(clientInfo.clientAge as number) || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-white/50 mb-0.5">Gender</p>
              <p className="text-sm font-semibold capitalize">{(clientInfo.clientGender as string) || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── REPORT BODY ─── */}
      <div className="px-6">

      {/* ─── SECTION 2: DAILY READINESS ─── */}
      <div className="report-section mt-8 print:mt-6">
        <SectionHeading>Assessment Day Readiness</SectionHeading>
        <div className="rounded-xl border border-gray-100 bg-[#f8fafc] overflow-hidden">
          <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-gray-100">
            <div className="px-4"><ContextCell label="Sleep" value={readiness.sleepHours != null ? `${readiness.sleepHours} hrs` : null} /></div>
            <div className="px-4"><ContextCell label="Stress" value={readiness.stressLevel != null ? `${readiness.stressLevel}/10` : null} /></div>
            <div className="px-4"><ContextCell label="Energy" value={readiness.energyLevel != null ? `${readiness.energyLevel}/10` : null} /></div>
            <div className="px-4"><ContextCell label="Soreness" value={readiness.sorenessLevel != null ? `${readiness.sorenessLevel}/10` : null} /></div>
            <div className="px-4"><ContextCell label="Caffeine" value={CAFFEINE_LABELS[readiness.caffeineToday as string] || null} /></div>
            <div className="px-4"><ContextCell label="Alcohol (48h)" value={ALCOHOL_LABELS[readiness.alcoholLast48 as string] || null} /></div>
          </div>
        </div>
      </div>

      {/* ─── SECTION 3: MEDICAL SCREENING ─── */}
      <div className="report-section mt-6 print:mt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-6 bg-[#F5A623] rounded-full" />
          <h2 className="text-lg font-bold text-[#1a365d] tracking-tight">Medical Screening</h2>
          {hasMedicalFlags && (
            <span className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-300 text-[10px] font-bold uppercase tracking-wide text-amber-800">
              Flag(s) Detected
            </span>
          )}
        </div>
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          {/* Safety screening */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-4 gap-y-2 px-4 py-3 bg-[#f8fafc]">
            {([
              { key: 'chestPain', label: 'Chest Pain' },
              { key: 'dizziness', label: 'Dizziness' },
              { key: 'heartCondition', label: 'Heart Condition' },
              { key: 'uncontrolledBP', label: 'Uncontrolled BP' },
              { key: 'recentSurgery', label: 'Recent Surgery' },
            ] as const).map((item) => {
              const val = medical[item.key];
              return (
                <div key={item.key} className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[#64748b]">{item.label}</span>
                  {val != null ? (
                    <YesNoDot value={val} />
                  ) : (
                    <span className="text-[11px] text-[#94a3b8] italic">—</span>
                  )}
                </div>
              );
            })}
          </div>
          {/* Surgery details */}
          {String(medical.recentSurgery ?? '').toLowerCase() === 'yes' && !!medical.surgeryDetailsText && (
            <div className="px-4 py-2 border-t border-gray-100 bg-red-50/50">
              <p className="text-[10px] uppercase tracking-wide text-[#64748b] mb-0.5">Surgery / Injury Details</p>
              <p className="text-[12px] text-[#1a202c]">{String(medical.surgeryDetailsText)}</p>
            </div>
          )}
          {/* Additional medical info */}
          {!!(medical.currentMedications || medical.diagnosedConditions || medical.otherConcerns) && (
            <div className="px-4 py-3 border-t border-gray-100 space-y-2">
              {medical.currentMedications ? (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-[#64748b] mb-0.5">Medications</p>
                  <p className="text-[12px] text-[#1a202c]">{String(medical.currentMedications)}</p>
                </div>
              ) : null}
              {medical.diagnosedConditions ? (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-[#64748b] mb-0.5">Diagnosed Conditions</p>
                  <p className="text-[12px] text-[#1a202c]">{String(medical.diagnosedConditions)}</p>
                </div>
              ) : null}
              {medical.otherConcerns ? (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-[#64748b] mb-0.5">Other Concerns</p>
                  <p className="text-[12px] text-[#1a202c]">{String(medical.otherConcerns)}</p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* ─── SECTION 4: CONSENT STATUS ─── */}
      <div className="report-section mt-6 print:mt-4">
        <div className="flex items-center gap-4 px-4 py-3 bg-[#f8fafc] rounded-lg border border-gray-100 text-[12px]">
          <div className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${consentSigned ? 'bg-emerald-500' : 'bg-gray-300'}`} />
            <span className="font-medium text-[#1a202c]">{consentSigned ? 'Consent Provided' : 'Consent Not Recorded'}</span>
          </div>
          <div className="h-4 w-px bg-gray-200" />
          <span className="text-[#64748b]">
            Client: {consent.clientSignatureName ? `${consent.clientSignatureName}` : '—'}
            {consent.clientSignatureDate ? ` (${consent.clientSignatureDate})` : ''}
            {clientSigCaptured ? ' — Signed' : ''}
          </span>
          <div className="h-4 w-px bg-gray-200" />
          <span className="text-[#64748b]">
            Coach: {consent.coachSignatureName ? `${consent.coachSignatureName}` : '—'}
            {consent.coachSignatureDate ? ` (${consent.coachSignatureDate})` : ''}
            {coachSigCaptured ? ' — Signed' : ''}
          </span>
        </div>
      </div>

      {/* ─── TIER SUMMARY ─── */}
      <div className="report-section mt-8 print:mt-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-6 bg-[#F5A623] rounded-full" />
          <h2 className="text-lg font-bold text-[#1a365d] tracking-tight">Results Overview</h2>
          {totalRated > 0 && (
            <span className="text-xs text-[#64748b] ml-auto">{totalRated} markers evaluated</span>
          )}
        </div>

        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {(['elite', 'great', 'normal', 'cautious', 'poor'] as RatingTier[]).map((tier) => {
            const pct = totalRated > 0 ? Math.round((tierCounts[tier] / totalRated) * 100) : 0;
            return (
              <div key={tier} className="report-tier-card relative overflow-hidden rounded-xl border border-gray-100 bg-white p-3 sm:p-4 text-center">
                <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: TIER_DOT[tier] }} />
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] mt-1 mb-1" style={{ color: TIER_DOT[tier] }}>
                  {TIER_LABELS[tier]}
                </p>
                <p className="text-3xl sm:text-4xl font-black text-[#1a365d] leading-none">
                  {tierCounts[tier]}
                </p>
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: TIER_DOT[tier] }}
                  />
                </div>
                <p className="text-[10px] text-[#64748b] mt-1 font-medium">{pct}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── DETAILED RESULTS BY CATEGORY ─── */}
      <div className="report-section mt-8 print:mt-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-6 bg-[#F5A623] rounded-full" />
          <h2 className="text-lg font-bold text-[#1a365d] tracking-tight">Detailed Results</h2>
        </div>

        <div className="space-y-5">
          {categories.map((cat) => {
            const catMarkers = markers.filter((m) => m.category === cat);
            // Filter: show rated markers always, show non-rated only if they have a value
            const visibleMarkers = catMarkers.filter((m) => m.hasNorms || m.value !== null);
            if (visibleMarkers.length === 0) return null;

            const isBloodTests = cat === 'Blood Tests & Biomarkers';
            const subcategories = isBloodTests
              ? [...new Set(visibleMarkers.map((m) => m.subcategory).filter(Boolean))]
              : [];

            return (
              <div key={cat} className="report-category" {...(cat === 'Strength Testing' ? { 'data-pdf-break': true } : {})}>
                {/* Category header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#1a365d]/70">{cat}</span>
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-[#e2e8f0] to-transparent" />
                </div>

                {isBloodTests ? (
                  // Blood tests: grouped by subcategory
                  <div className="rounded-lg overflow-hidden border border-gray-100">
                    {subcategories.map((sub, si) => {
                      const subMarkers = visibleMarkers.filter((m) => m.subcategory === sub);
                      if (subMarkers.length === 0) return null;
                      return (
                        <div key={sub}>
                          <div className={`text-[10px] font-bold uppercase tracking-[0.1em] text-[#64748b] px-4 py-1.5 bg-[#f1f5f9] ${si > 0 ? 'border-t border-gray-200' : ''}`}>
                            {sub}
                          </div>
                          {subMarkers.map((m, i) => renderMarkerRow(m, i))}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // All other categories: flat list
                  <div className="rounded-lg overflow-hidden border border-gray-100">
                    {visibleMarkers.map((m, i) => renderMarkerRow(m, i))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── TIER LEGEND ─── */}
      <div className="report-section mt-6 print:mt-4">
        <div className="flex items-center justify-center gap-5 py-3 px-4 bg-[#f8fafc] rounded-lg border border-gray-100">
          {(['elite', 'great', 'normal', 'cautious', 'poor'] as RatingTier[]).map((tier) => (
            <div key={tier} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TIER_DOT[tier] }} />
              <span className={`text-[10px] font-bold uppercase tracking-wide ${TIER_TEXT[tier]}`}>
                {TIER_LABELS[tier]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── INSIGHTS & RECOMMENDATIONS ─── */}
      {insights.length > 0 && (
        <div className="report-section report-insights mt-8 print:mt-6">
          <SectionHeading>Insights & Recommendations</SectionHeading>

          <div className="space-y-4">
            {insights.map((insight, i) => (
              <div key={i} className="report-insight-card relative bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#F5A623] to-[#d4891a]" />
                <div className="pl-5 pr-5 py-4">
                  <h4 className="text-sm font-bold text-[#1a365d] mb-1.5">{insight.title}</h4>
                  <p className="text-[12px] leading-relaxed text-[#64748b] mb-3">{insight.why}</p>
                  {insight.doNow.length > 0 && (
                    <div className="space-y-1.5">
                      {insight.doNow.map((item, j) => (
                        <div key={j} className="flex items-start gap-2">
                          <div className="w-1 h-1 rounded-full bg-[#F5A623] mt-[7px] shrink-0" />
                          <p className="text-[12px] leading-relaxed text-[#1a202c]">{item}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── REPORT FOOTER ─── */}
      <div className="report-footer mt-10 pt-5 border-t border-gray-200 print:mt-6">
        <div className="flex items-center justify-between text-[10px] text-[#94a3b8]">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Peak360" className="h-5 w-auto object-contain opacity-40" />
            <span>Generated by Peak360 Longevity Program</span>
          </div>
          <span>{reportDate}</span>
        </div>
        <p className="text-[9px] text-[#cbd5e1] mt-2 leading-relaxed">
          This report is for informational purposes only and does not constitute medical advice.
          Always consult with a qualified healthcare professional before making changes to your health regimen.
        </p>
      </div>

      </div>{/* end px-6 report body wrapper */}

      {/* ─── ACTION BUTTONS (hidden in PDF) ─── */}
      <div ref={actionsRef} className="flex flex-col sm:flex-row gap-3 justify-center pt-8 pb-4">
        <button
          onClick={exportPdf}
          disabled={exporting}
          className="group px-8 py-3 bg-[#1a365d] text-white rounded-xl font-semibold hover:bg-[#2d5986] transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-60"
        >
          <span className="flex items-center justify-center gap-2">
            {exporting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export PDF
              </>
            )}
          </span>
        </button>
        <button
          onClick={async () => {
            await fetch(`/api/assessments/${assessmentId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'completed' }),
            });
            window.location.href = '/';
          }}
          className="px-8 py-3 bg-[#F5A623] text-[#1a365d] rounded-xl font-semibold hover:bg-[#f7bc5a] transition-all hover:shadow-lg active:scale-[0.98]"
        >
          Save & Complete Assessment
        </button>
      </div>
    </div>
  );
}
