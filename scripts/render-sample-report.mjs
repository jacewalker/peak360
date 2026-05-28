// Visual-QA smoke test for the pillar-based Section 11 PDF.
//
// Builds a representative synthetic ReportData fixture (a 48yo male client with
// ~11 cardiometabolic markers spanning all five tiers, a couple of markers for
// each other pillar, a multi-panel blood draw, prescriptions for three pillars,
// and readiness / medical / consent context) and renders the report to
// /tmp/sample-report.pdf so we can eyeball every page against
// mockups/pdf-pillar-report.html without seeding a database.
//
// Run:
//   node scripts/render-sample-report.mjs
//
// It bundles the report entry with esbuild first (resolving the @/ alias to
// ./src, keeping node_modules external) because the report imports TS/TSX via
// the @/ path alias. The fixture below is also useful for future visual QA.

import { build } from 'esbuild';
import path from 'node:path';
import { writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
// Emit the bundle inside the repo so node resolves the external node_modules
// packages (react, @react-pdf/renderer, ...) from the project at runtime.
const OUT = path.join(ROOT, 'node_modules', '.cache', 'peak360-report-bundle.mjs');

// 1. Bundle the report + react-pdf into a single ESM module we can import.
await build({
  entryPoints: [path.join(ROOT, 'scripts/_render-entry.tsx')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: OUT,
  jsx: 'automatic',
  // Leave every node_modules package external (resolved by node at runtime);
  // only our own TS/TSX is bundled so the @/ alias resolves at build time.
  packages: 'external',
  alias: { '@': path.join(ROOT, 'src') },
  logLevel: 'warning',
});

const { renderSample } = await import(pathToFileURL(OUT).href);

// 2. Build the synthetic fixture.
const fixture = buildFixture();

// 3. Render.
const buffer = await renderSample(fixture);
writeFileSync('/tmp/sample-report.pdf', buffer);
rmSync(OUT, { force: true });
const kb = (buffer.length / 1024).toFixed(1);
console.log(`Wrote /tmp/sample-report.pdf (${buffer.length} bytes, ${kb} KB)`);
if (buffer.length < 5000) {
  console.error('WARNING: PDF is suspiciously small - render may have failed.');
  process.exit(1);
}

// ---------------------------------------------------------------------------

function m(key, label, value, tier, unit, category, subcategory) {
  return { key, label, value, tier, unit, category, subcategory, hasNorms: true, resolvedStandards: null };
}

function buildFixture() {
  const markers = [
    // Cardiometabolic - blood (lipids / glucose / inflammation) + BP
    m('apob', 'ApoB', 1.18, 'poor', 'g/L', 'Blood Tests & Biomarkers', 'Lipid Panel'),
    m('hs_crp', 'hs-CRP', 3.4, 'poor', 'mg/L', 'Blood Tests & Biomarkers', 'Inflammation'),
    m('ldl', 'LDL Cholesterol', 3.7, 'cautious', 'mmol/L', 'Blood Tests & Biomarkers', 'Lipid Panel'),
    m('triglycerides', 'Triglycerides', 1.9, 'cautious', 'mmol/L', 'Blood Tests & Biomarkers', 'Lipid Panel'),
    m('fasting_insulin', 'Fasting Insulin', 11, 'cautious', 'mIU/L', 'Blood Tests & Biomarkers', 'Glucose & Metabolic'),
    m('hba1c', 'HbA1c', 5.4, 'normal', '%', 'Blood Tests & Biomarkers', 'Glucose & Metabolic'),
    m('fasting_glucose', 'Fasting Glucose', 5.3, 'normal', 'mmol/L', 'Blood Tests & Biomarkers', 'Glucose & Metabolic'),
    m('blood_pressure_systolic', 'Blood Pressure (Systolic)', 128, 'normal', 'mmHg', 'Cardiovascular Fitness', 'Resting'),
    m('total_cholesterol', 'Total Cholesterol', 4.6, 'great', 'mmol/L', 'Blood Tests & Biomarkers', 'Lipid Panel'),
    m('hdl', 'HDL Cholesterol', 1.7, 'elite', 'mmol/L', 'Blood Tests & Biomarkers', 'Lipid Panel'),
    m('non_hdl', 'Non-HDL Cholesterol', 2.9, 'cautious', 'mmol/L', 'Blood Tests & Biomarkers', 'Lipid Panel'),

    // Supporting cardio blood (excluded from cardio score, shown in blood panel)
    m('total_testosterone', 'Total Testosterone', 9.1, 'poor', 'nmol/L', 'Blood Tests & Biomarkers', 'Hormones'),
    m('free_testosterone', 'Free Testosterone', 180, 'cautious', 'pmol/L', 'Blood Tests & Biomarkers', 'Hormones'),
    m('shbg', 'SHBG', 38, 'normal', 'nmol/L', 'Blood Tests & Biomarkers', 'Hormones'),
    m('tsh', 'TSH', 2.1, 'normal', 'mIU/L', 'Blood Tests & Biomarkers', 'Thyroid'),
    m('free_t3', 'Free T3', 4.6, 'great', 'pmol/L', 'Blood Tests & Biomarkers', 'Thyroid'),
    m('vitamin_d', 'Vitamin D', 62, 'normal', 'nmol/L', 'Blood Tests & Biomarkers', 'Vitamins & Minerals'),
    m('ferritin', 'Ferritin', 95, 'great', 'ug/L', 'Blood Tests & Biomarkers', 'Iron Studies'),
    m('homocysteine', 'Homocysteine', 9.8, 'normal', 'umol/L', 'Blood Tests & Biomarkers', 'Inflammation'),

    // VO2 / aerobic
    m('vo2max', 'VO2 Max', 34, 'cautious', 'ml/kg/min', 'Cardiovascular Fitness', 'Aerobic capacity'),
    m('resting_hr', 'Resting Heart Rate', 64, 'normal', 'bpm', 'Cardiovascular Fitness', 'Resting'),

    // Body composition
    m('visceral_fat', 'Visceral Fat', 14, 'poor', 'level', 'Body Composition', 'Body Composition'),
    m('waist_to_hip', 'Waist-to-Hip Ratio', 0.98, 'poor', '', 'Body Composition', 'Body Composition'),
    m('body_fat_percent', 'Body Fat', 26, 'cautious', '%', 'Body Composition', 'Body Composition'),
    m('bmi', 'Body Mass Index', 27.4, 'normal', 'kg/m2', 'Body Composition', 'Body Composition'),
    m('skeletal_muscle', 'Skeletal Muscle Mass', 34, 'normal', 'kg', 'Body Composition', 'Body Composition'),
    m('lean_body_mass', 'Lean Body Mass', 62, 'great', 'kg', 'Body Composition', 'Body Composition'),
    m('bmr', 'Basal Metabolic Rate', 1780, 'elite', 'kcal', 'Body Composition', 'Body Composition'),

    // Strength
    m('pushups', 'Push-ups', 18, 'cautious', 'reps', 'Strength Testing', 'Endurance'),
    m('plank', 'Plank Hold', 75, 'normal', 's', 'Strength Testing', 'Core'),
    m('grip_left', 'Grip Strength (Left)', 44, 'great', 'kg', 'Strength Testing', 'Grip'),
    m('grip_right', 'Grip Strength (Right)', 52, 'elite', 'kg', 'Strength Testing', 'Grip'),

    // Balance (regex-classified)
    m('single_leg_balance_left', 'Single-Leg Balance (Left)', 38, 'great', 's', 'Strength Testing', 'Stability'),
    m('single_leg_balance_right', 'Single-Leg Balance (Right)', 45, 'elite', 's', 'Strength Testing', 'Stability'),

    // Single-Leg Balance Eyes Closed (Vald CoP, no norms yet so tier null - render only on reference page)
    m('single_leg_balance_ec_left_ml', 'SL Balance EC - ML (Left)', 12, null, 'mm', 'Strength Testing', 'Stability'),
    m('single_leg_balance_ec_left_ap', 'SL Balance EC - AP (Left)', 18, null, 'mm', 'Strength Testing', 'Stability'),
    m('single_leg_balance_ec_right_ml', 'SL Balance EC - ML (Right)', 10, null, 'mm', 'Strength Testing', 'Stability'),
    m('single_leg_balance_ec_right_ap', 'SL Balance EC - AP (Right)', 15, null, 'mm', 'Strength Testing', 'Stability'),

    // Mobility & Flexibility (hip flex norm-rated; FABER pass/fail and distance)
    m('hip_mobility_left', 'Hip Mobility (Left)', 115, 'normal', 'deg', 'Mobility & Flexibility', undefined),
    m('hip_mobility_right', 'Hip Mobility (Right)', 118, 'great', 'deg', 'Mobility & Flexibility', undefined),
    m('faber_outcome_left', 'FABER Outcome (Left)', 1, null, '', 'Mobility & Flexibility', undefined),
    m('faber_distance_left', 'FABER Distance (Left)', 4.2, null, 'cm', 'Mobility & Flexibility', undefined),
    m('faber_outcome_right', 'FABER Outcome (Right)', 0, null, '', 'Mobility & Flexibility', undefined),
    m('faber_distance_right', 'FABER Distance (Right)', 9.8, null, 'cm', 'Mobility & Flexibility', undefined),
  ];

  const definitions = [
    def('cardiometabolic', 'Cardiometabolic', 1),
    def('vo2', 'Aerobic Fitness', 2),
    def('bodyComposition', 'Body Composition', 3),
    def('strength', 'Strength', 4),
    def('balance', 'Balance', 5),
  ];

  const prescriptions = [
    {
      pillarKey: 'cardiometabolic',
      summary:
        'This is your highest-leverage pillar right now. Testosterone, hs-CRP and ApoB all flag - together pointing at inflammation and visceral fat as the common root. Win here and the whole pillar lifts.',
      bullets: [
        'Resistance-train 3-4x/week, protect 7-9 h sleep, and shift saturated fat toward olive oil and oily fish.',
        'Re-test ApoB, hs-CRP and testosterone together in 12 weeks to confirm the trend.',
      ],
    },
    {
      pillarKey: 'vo2',
      summary:
        'A VO2 max of 34 is workable but below where we want you for your age. The good news: it is one of the most trainable numbers in this whole report.',
      bullets: [
        'Add two zone-2 sessions a week (45-60 min, conversational pace) to build your aerobic base.',
        'Layer in one short interval session (e.g. 4x4 min hard) once the base is established.',
      ],
    },
    {
      pillarKey: 'strength',
      summary:
        'This is a strong pillar - grip and lower-body power are excellent for your age. The one gap is upper-body pushing endurance.',
      bullets: ['Add a dedicated push progression twice a week to lift push-ups.'],
    },
  ];

  const tierCounts = { elite: 0, great: 0, normal: 0, cautious: 0, poor: 0 };
  for (const mk of markers) if (mk.tier) tierCounts[mk.tier] += 1;

  return {
    assessmentId: 'sample-fixture',
    clientName: 'John Smith',
    clientAge: 52,
    clientGender: 'male',
    clientEmail: 'john.smith@example.com',
    clientDob: '1974-05-28',
    assessmentDate: '2026-05-28',
    readiness: {
      sleepHours: 7,
      stressLevel: 4,
      energyLevel: 6,
      sorenessLevel: 3,
      caffeineToday: 'low',
      alcoholLast48: 'none',
    },
    medical: {
      heartCondition: 'no',
      chestPain: 'no',
      dizziness: 'no',
      medication: 'yes',
      recentSurgery: 'no',
    },
    consent: {
      clientSignatureName: 'John Smith',
      clientSignatureDate: '28 May 2026',
      clientSignature: 'data:image/png;base64,xxx',
      coachSignatureName: 'J. Walker',
      coachSignatureDate: '28 May 2026',
      coachSignature: 'data:image/png;base64,xxx',
    },
    markers,
    insights: [],
    tierCounts,
    totalRated: Object.values(tierCounts).reduce((a, b) => a + b, 0),
    definitions,
    pageCopy: null,
    prescriptions,
  };
}

function def(pillarKey, label, sortOrder) {
  return {
    pillarKey,
    label,
    shortSummary: '',
    plainMeaning: '',
    sortOrder,
    updatedBy: 'fixture',
    updatedAt: Date.now(),
  };
}
