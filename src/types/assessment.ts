// Section 1: Client Information
export interface ClientInfo {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientDob: string;
  clientAge: number | null;
  clientGender: 'male' | 'female' | '';
  coachName: string;
  assessmentDate: string;
  location: string;
}

// Section 2: Daily Readiness
export interface DailyReadiness {
  sleepQuality: number; // 1-10
  stressLevel: number; // 1-10
  energyLevel: number; // 1-10
  hydration: string;
  lastMeal: string;
}

// Section 3: Medical Screening
export interface MedicalScreening {
  heartCondition: 'yes' | 'no' | '';
  chestPain: 'yes' | 'no' | '';
  dizziness: 'yes' | 'no' | '';
  boneJoint: 'yes' | 'no' | '';
  medication: 'yes' | 'no' | '';
  medicalConditions: string;
  injuries: string;
  surgeries: string;
  allergies: string;
  additionalNotes: string;
}

// Section 4: Informed Consent
export interface InformedConsent {
  consentAgreed: boolean;
  clientSignature: string; // base64 data URL
  clientSignatureName: string;
  clientSignatureDate: string;
  coachSignature: string;
  coachSignatureName: string;
  coachSignatureDate: string;
}

// Section 5: Body Composition
export interface BodyComposition {
  height: number | null;
  weight: number | null;
  bmi: number | null;
  bodyFatPercent: number | null;
  leanMassMass: number | null;
  waistCircumference: number | null;
  hipCircumference: number | null;
  waistToHipRatio: number | null;
}

// Section 6: Blood Tests & Biomarkers
export interface BloodTests {
  // Lipid Panel
  cholesterolTotal: number | null;
  ldlCholesterol: number | null;
  hdlCholesterol: number | null;
  triglycerides: number | null;
  // Glucose / Metabolic
  fastingGlucose: number | null;
  hba1c: number | null;
  insulin: number | null;
  // Inflammation
  crpHs: number | null;
  homocysteine: number | null;
  esr: number | null;
  // Thyroid
  tsh: number | null;
  freeT3: number | null;
  freeT4: number | null;
  // Hormones
  testosterone: number | null;
  estradiol: number | null;
  cortisol: number | null;
  dheas: number | null;
  igf1: number | null;
  // Vitamins & Minerals
  vitaminD25oh: number | null;
  vitaminB12: number | null;
  folate: number | null;
  ferritin: number | null;
  iron: number | null;
  magnesium: number | null;
  zinc: number | null;
  // Liver
  alt: number | null;
  ast: number | null;
  ggt: number | null;
  albumin: number | null;
  // Kidney
  creatinine: number | null;
  egfr: number | null;
  bun: number | null;
  uricAcid: number | null;
  // Blood Count
  wbc: number | null;
  rbc: number | null;
  hemoglobin: number | null;
  hematocrit: number | null;
  platelets: number | null;
  // Advanced
  apoB: number | null;
  lpa: number | null;
  omega3Index: number | null;
}

// Section 7: Cardiovascular Fitness
export interface CardiovascularFitness {
  testType: 'vo2max' | '6min_walk' | '';
  vo2max: number | null;
  sixMinWalkDistance: number | null;
  restingHr: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
}

// Section 8: Strength Testing
export interface StrengthTesting {
  gripStrengthLeft: number | null;
  gripStrengthRight: number | null;
  legPress: number | null;
  chestPress: number | null;
  seatedRow: number | null;
  deadlift: number | null;
  squat: number | null;
  pushUps: number | null;
}

// Section 9: Mobility & Flexibility
export interface MobilityFlexibility {
  sitAndReach: number | null;
  shoulderFlexionLeft: number | null;
  shoulderFlexionRight: number | null;
  hipMobilityLeft: number | null;
  hipMobilityRight: number | null;
  ankleDorsiflexionLeft: number | null;
  ankleDorsiflexionRight: number | null;
  thoracicRotation: number | null;
}

// Section 10: Balance & Power
export interface BalancePower {
  singleLegBalanceLeft: number | null;
  singleLegBalanceRight: number | null;
  verticalJump: number | null;
  broadJump: number | null;
}

// Combined assessment data
export interface AssessmentData {
  section1?: ClientInfo;
  section2?: DailyReadiness;
  section3?: MedicalScreening;
  section4?: InformedConsent;
  section5?: BodyComposition;
  section6?: BloodTests;
  section7?: CardiovascularFitness;
  section8?: StrengthTesting;
  section9?: MobilityFlexibility;
  section10?: BalancePower;
}

export type SectionNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export type SectionData =
  | ClientInfo
  | DailyReadiness
  | MedicalScreening
  | InformedConsent
  | BodyComposition
  | BloodTests
  | CardiovascularFitness
  | StrengthTesting
  | MobilityFlexibility
  | BalancePower;

export interface Assessment {
  id: string;
  clientName: string | null;
  clientEmail: string | null;
  clientDob: string | null;
  clientGender: string | null;
  assessmentDate: string | null;
  currentSection: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const SECTION_TITLES: Record<SectionNumber, string> = {
  1: 'Client Information',
  2: 'Daily Readiness',
  3: 'Medical Screening',
  4: 'Informed Consent',
  5: 'Blood Tests & Biomarkers',
  6: 'Body Composition',
  7: 'Cardiovascular Fitness',
  8: 'Strength Testing',
  9: 'Mobility & Flexibility',
  10: 'Balance & Power',
  11: 'Complete Longevity Analysis',
};

export const TOTAL_SECTIONS = 11;
