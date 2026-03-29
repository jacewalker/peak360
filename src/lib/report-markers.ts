export interface MarkerDef {
  testKey: string;
  label: string;
  section: number;
  dataKey: string;
  category: string;
  subcategory?: string;
  fallbackUnit?: string;
  hasNorms: boolean;
}

export const REPORT_MARKERS: MarkerDef[] = [
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
  { testKey: 'uric_acid', label: 'Uric Acid', section: 5, dataKey: 'uricAcid', category: 'Blood Tests & Biomarkers', subcategory: 'Inflammation', fallbackUnit: 'mg/dL', hasNorms: true },
  // Vitamins & Minerals
  { testKey: 'vitamin_d_25oh', label: 'Vitamin D', section: 5, dataKey: 'vitaminD', category: 'Blood Tests & Biomarkers', subcategory: 'Vitamins & Minerals', hasNorms: true },
  { testKey: 'vitamin_b12', label: 'Vitamin B12', section: 5, dataKey: 'vitaminB12', category: 'Blood Tests & Biomarkers', subcategory: 'Vitamins & Minerals', fallbackUnit: 'pg/mL', hasNorms: false },
  { testKey: 'folate', label: 'Folate', section: 5, dataKey: 'folate', category: 'Blood Tests & Biomarkers', subcategory: 'Vitamins & Minerals', fallbackUnit: 'ng/mL', hasNorms: false },
  { testKey: 'magnesium', label: 'Magnesium', section: 5, dataKey: 'magnesium', category: 'Blood Tests & Biomarkers', subcategory: 'Vitamins & Minerals', fallbackUnit: 'mg/dL', hasNorms: false },
  { testKey: 'zinc', label: 'Zinc', section: 5, dataKey: 'zinc', category: 'Blood Tests & Biomarkers', subcategory: 'Vitamins & Minerals', fallbackUnit: 'ug/dL', hasNorms: false },
  // Iron Studies
  { testKey: 'serum_iron', label: 'Serum Iron', section: 5, dataKey: 'serumIron', category: 'Blood Tests & Biomarkers', subcategory: 'Iron Studies', fallbackUnit: 'ug/dL', hasNorms: true },
  { testKey: 'tibc', label: 'TIBC', section: 5, dataKey: 'tibc', category: 'Blood Tests & Biomarkers', subcategory: 'Iron Studies', fallbackUnit: 'ug/dL', hasNorms: false },
  { testKey: 'transferrin_sat', label: 'Transferrin Sat', section: 5, dataKey: 'transferrinSat', category: 'Blood Tests & Biomarkers', subcategory: 'Iron Studies', fallbackUnit: '%', hasNorms: false },
  { testKey: 'ferritin', label: 'Ferritin', section: 5, dataKey: 'ferritin', category: 'Blood Tests & Biomarkers', subcategory: 'Iron Studies', fallbackUnit: 'ng/mL', hasNorms: true },
  // Thyroid
  { testKey: 'tsh', label: 'TSH', section: 5, dataKey: 'tsh', category: 'Blood Tests & Biomarkers', subcategory: 'Thyroid', fallbackUnit: 'mIU/L', hasNorms: false },
  { testKey: 'ft3', label: 'FT3', section: 5, dataKey: 'ft3', category: 'Blood Tests & Biomarkers', subcategory: 'Thyroid', fallbackUnit: 'pg/mL', hasNorms: false },
  { testKey: 'ft4', label: 'FT4', section: 5, dataKey: 'ft4', category: 'Blood Tests & Biomarkers', subcategory: 'Thyroid', fallbackUnit: 'ng/dL', hasNorms: false },
  { testKey: 'tgab', label: 'Thyroglobulin Ab', section: 5, dataKey: 'tgab', category: 'Blood Tests & Biomarkers', subcategory: 'Thyroid', fallbackUnit: 'IU/mL', hasNorms: false },
  { testKey: 'tpo', label: 'Thyroperoxidase Ab', section: 5, dataKey: 'tpo', category: 'Blood Tests & Biomarkers', subcategory: 'Thyroid', fallbackUnit: 'IU/mL', hasNorms: false },
  // Hormones
  { testKey: 'total_testosterone', label: 'Total Testosterone', section: 5, dataKey: 'totalTestosterone', category: 'Blood Tests & Biomarkers', subcategory: 'Hormones', fallbackUnit: 'ng/dL', hasNorms: true },
  { testKey: 'free_testosterone', label: 'Free Testosterone', section: 5, dataKey: 'freeTestosterone', category: 'Blood Tests & Biomarkers', subcategory: 'Hormones', fallbackUnit: 'pg/mL', hasNorms: true },
  { testKey: 'oestradiol', label: 'Oestradiol (E2)', section: 5, dataKey: 'oestradiol', category: 'Blood Tests & Biomarkers', subcategory: 'Hormones', fallbackUnit: 'pg/mL', hasNorms: true },
  { testKey: 'shbg', label: 'SHBG', section: 5, dataKey: 'shbg', category: 'Blood Tests & Biomarkers', subcategory: 'Hormones', fallbackUnit: 'nmol/L', hasNorms: true },
  { testKey: 'cortisol', label: 'Cortisol', section: 5, dataKey: 'cortisol', category: 'Blood Tests & Biomarkers', subcategory: 'Hormones', fallbackUnit: 'ug/dL', hasNorms: false },
  { testKey: 'dheas', label: 'DHEAS', section: 5, dataKey: 'dheas', category: 'Blood Tests & Biomarkers', subcategory: 'Hormones', fallbackUnit: 'ug/dL', hasNorms: true },
  { testKey: 'igf1', label: 'IGF-1', section: 5, dataKey: 'igf1', category: 'Blood Tests & Biomarkers', subcategory: 'Hormones', fallbackUnit: 'ng/mL', hasNorms: false },
  { testKey: 'fsh', label: 'FSH', section: 5, dataKey: 'fsh', category: 'Blood Tests & Biomarkers', subcategory: 'Hormones', fallbackUnit: 'mIU/mL', hasNorms: true },
  { testKey: 'lh', label: 'LH', section: 5, dataKey: 'lh', category: 'Blood Tests & Biomarkers', subcategory: 'Hormones', fallbackUnit: 'mIU/mL', hasNorms: true },
  { testKey: 'prolactin', label: 'Prolactin', section: 5, dataKey: 'prolactin', category: 'Blood Tests & Biomarkers', subcategory: 'Hormones', fallbackUnit: 'ng/mL', hasNorms: false },
  { testKey: 'progesterone', label: 'Progesterone', section: 5, dataKey: 'progesterone', category: 'Blood Tests & Biomarkers', subcategory: 'Hormones', fallbackUnit: 'ng/mL', hasNorms: false },
  // Full Blood Count
  { testKey: 'hemoglobin', label: 'Hemoglobin', section: 5, dataKey: 'hemoglobin', category: 'Blood Tests & Biomarkers', subcategory: 'Full Blood Count', fallbackUnit: 'g/dL', hasNorms: true },
  { testKey: 'rbc', label: 'RBC', section: 5, dataKey: 'rbc', category: 'Blood Tests & Biomarkers', subcategory: 'Full Blood Count', fallbackUnit: 'M/mcL', hasNorms: true },
  { testKey: 'hematocrit', label: 'Hematocrit', section: 5, dataKey: 'hematocrit', category: 'Blood Tests & Biomarkers', subcategory: 'Full Blood Count', fallbackUnit: '%', hasNorms: true },
  { testKey: 'wbc', label: 'WBC', section: 5, dataKey: 'wbc', category: 'Blood Tests & Biomarkers', subcategory: 'Full Blood Count', fallbackUnit: 'cells/mcL', hasNorms: false },
  { testKey: 'platelet', label: 'Platelets', section: 5, dataKey: 'platelet', category: 'Blood Tests & Biomarkers', subcategory: 'Full Blood Count', fallbackUnit: 'cells/mcL', hasNorms: false },
  { testKey: 'mcv', label: 'MCV', section: 5, dataKey: 'mcv', category: 'Blood Tests & Biomarkers', subcategory: 'Full Blood Count', fallbackUnit: 'fL', hasNorms: false },
  { testKey: 'mch', label: 'MCH', section: 5, dataKey: 'mch', category: 'Blood Tests & Biomarkers', subcategory: 'Full Blood Count', fallbackUnit: 'pg', hasNorms: false },
  // Kidney & Electrolytes
  { testKey: 'creatinine', label: 'Creatinine', section: 5, dataKey: 'creatinine', category: 'Blood Tests & Biomarkers', subcategory: 'Kidney & Electrolytes', fallbackUnit: 'mg/dL', hasNorms: true },
  { testKey: 'egfr', label: 'eGFR', section: 5, dataKey: 'egfr', category: 'Blood Tests & Biomarkers', subcategory: 'Kidney & Electrolytes', fallbackUnit: 'mL/min', hasNorms: true },
  { testKey: 'bun', label: 'BUN', section: 5, dataKey: 'bun', category: 'Blood Tests & Biomarkers', subcategory: 'Kidney & Electrolytes', fallbackUnit: 'mg/dL', hasNorms: false },
  { testKey: 'sodium', label: 'Sodium', section: 5, dataKey: 'sodium', category: 'Blood Tests & Biomarkers', subcategory: 'Kidney & Electrolytes', fallbackUnit: 'mmol/L', hasNorms: false },
  { testKey: 'potassium', label: 'Potassium', section: 5, dataKey: 'potassium', category: 'Blood Tests & Biomarkers', subcategory: 'Kidney & Electrolytes', fallbackUnit: 'mmol/L', hasNorms: false },
  { testKey: 'chloride', label: 'Chloride', section: 5, dataKey: 'chloride', category: 'Blood Tests & Biomarkers', subcategory: 'Kidney & Electrolytes', fallbackUnit: 'mmol/L', hasNorms: false },
  { testKey: 'bicarbonate', label: 'Bicarbonate', section: 5, dataKey: 'bicarbonate', category: 'Blood Tests & Biomarkers', subcategory: 'Kidney & Electrolytes', fallbackUnit: 'mmol/L', hasNorms: false },
  // Liver Function
  { testKey: 'alt', label: 'ALT', section: 5, dataKey: 'alt', category: 'Blood Tests & Biomarkers', subcategory: 'Liver Function', fallbackUnit: 'U/L', hasNorms: true },
  { testKey: 'ast', label: 'AST', section: 5, dataKey: 'ast', category: 'Blood Tests & Biomarkers', subcategory: 'Liver Function', fallbackUnit: 'U/L', hasNorms: true },
  { testKey: 'alp', label: 'ALP', section: 5, dataKey: 'alp', category: 'Blood Tests & Biomarkers', subcategory: 'Liver Function', fallbackUnit: 'U/L', hasNorms: false },
  { testKey: 'ggt', label: 'GGT', section: 5, dataKey: 'ggt', category: 'Blood Tests & Biomarkers', subcategory: 'Liver Function', fallbackUnit: 'U/L', hasNorms: true },
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

export const REPORT_CATEGORIES = [...new Set(REPORT_MARKERS.map((m) => m.category))];
