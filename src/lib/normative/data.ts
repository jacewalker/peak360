import type { NormativeData } from '@/types/normative';

export const normativeData: NormativeData = {
  blood_tests: {
    cholesterol_total: {
      unit: 'mmol/L',
      note: 'Targets for general adult population (not individualized medical advice).',
      poor: { min: 6.2, max: 99 },
      cautious: { min: 5.2, max: 6.19 },
      normal: { min: 4.0, max: 5.19 },
      great: { min: 3.5, max: 3.99 },
      elite: { min: 0.0, max: 3.49 },
    },
    ldl_cholesterol: {
      unit: 'mmol/L',
      poor: { min: 4.1, max: 99 },
      cautious: { min: 3.4, max: 4.09 },
      normal: { min: 2.6, max: 3.39 },
      great: { min: 1.8, max: 2.59 },
      elite: { min: 0.0, max: 1.79 },
    },
    hdl_cholesterol: {
      unit: 'mmol/L',
      note: 'Higher is generally better.',
      poor: { min: 0.0, max: 0.99 },
      cautious: { min: 1.0, max: 1.19 },
      normal: { min: 1.2, max: 1.49 },
      great: { min: 1.5, max: 1.79 },
      elite: { min: 1.8, max: 99 },
    },
    triglycerides: {
      unit: 'mmol/L',
      poor: { min: 2.3, max: 99 },
      cautious: { min: 1.7, max: 2.29 },
      normal: { min: 1.0, max: 1.69 },
      great: { min: 0.7, max: 0.99 },
      elite: { min: 0.0, max: 0.69 },
    },
    fasting_glucose: {
      unit: 'mmol/L',
      poor: { min: 7.0, max: 99 },
      cautious: { min: 5.6, max: 6.99 },
      normal: { min: 4.0, max: 5.59 },
      great: { min: 3.7, max: 3.99 },
      elite: { min: 0.0, max: 3.69 },
    },
    hba1c: {
      unit: '%',
      poor: { min: 6.5, max: 99 },
      cautious: { min: 5.7, max: 6.49 },
      normal: { min: 5.0, max: 5.69 },
      great: { min: 4.7, max: 4.99 },
      elite: { min: 0.0, max: 4.69 },
    },
    crp_hs: {
      unit: 'mg/L',
      note: 'Lower is generally better (systemic inflammation marker).',
      poor: { min: 3.0, max: 99 },
      cautious: { min: 1.1, max: 2.99 },
      normal: { min: 0.6, max: 1.09 },
      great: { min: 0.3, max: 0.59 },
      elite: { min: 0.0, max: 0.29 },
    },
    vitamin_d_25oh: {
      unit: 'nmol/L',
      note: 'Reference targets vary by lab and context.',
      poor: { min: 0.0, max: 49 },
      cautious: { min: 50, max: 74 },
      normal: { min: 75, max: 124 },
      great: { min: 125, max: 149 },
      elite: { min: 150, max: 300 },
    },
  },

  body_comp: {
    bmi: {
      unit: 'kg/m\u00B2',
      note: 'BMI is a blunt tool; interpret with body fat, waist, and context.',
      poor: { min: 35.0, max: 99 },
      cautious: { min: 30.0, max: 34.99 },
      normal: { min: 18.5, max: 29.99 },
      great: { min: 20.0, max: 24.99 },
      elite: { min: 21.0, max: 23.99 },
    },

    bwi: {
      unit: '/10',
      note: 'Evolt 360 Bio Wellness Index — a composite body composition score.',
      poor: { min: 0, max: 3.99 },
      cautious: { min: 4.0, max: 5.99 },
      normal: { min: 6.0, max: 7.49 },
      great: { min: 7.5, max: 8.49 },
      elite: { min: 8.5, max: 10 },
    },

    body_fat_percent: {
      unit: '%',
      note: 'Age + sex bucketed. Lower isn\'t always better; interpret with health/performance goals.',
      male: {
        '20-39': {
          poor: { min: 25, max: 99 },
          cautious: { min: 20, max: 24.99 },
          normal: { min: 14, max: 19.99 },
          great: { min: 10, max: 13.99 },
          elite: { min: 0, max: 9.99 },
        },
        '40-59': {
          poor: { min: 28, max: 99 },
          cautious: { min: 23, max: 27.99 },
          normal: { min: 16, max: 22.99 },
          great: { min: 12, max: 15.99 },
          elite: { min: 0, max: 11.99 },
        },
        '60+': {
          poor: { min: 30, max: 99 },
          cautious: { min: 25, max: 29.99 },
          normal: { min: 18, max: 24.99 },
          great: { min: 14, max: 17.99 },
          elite: { min: 0, max: 13.99 },
        },
      },
      female: {
        '20-39': {
          poor: { min: 35, max: 99 },
          cautious: { min: 30, max: 34.99 },
          normal: { min: 22, max: 29.99 },
          great: { min: 18, max: 21.99 },
          elite: { min: 0, max: 17.99 },
        },
        '40-59': {
          poor: { min: 38, max: 99 },
          cautious: { min: 33, max: 37.99 },
          normal: { min: 25, max: 32.99 },
          great: { min: 20, max: 24.99 },
          elite: { min: 0, max: 19.99 },
        },
        '60+': {
          poor: { min: 40, max: 99 },
          cautious: { min: 35, max: 39.99 },
          normal: { min: 28, max: 34.99 },
          great: { min: 23, max: 27.99 },
          elite: { min: 0, max: 22.99 },
        },
      },
    },

    waist_to_hip: {
      unit: 'ratio',
      male: {
        poor: { min: 1.00, max: 2.00 },
        cautious: { min: 0.95, max: 0.99 },
        normal: { min: 0.90, max: 0.94 },
        great: { min: 0.85, max: 0.89 },
        elite: { min: 0.00, max: 0.84 },
      },
      female: {
        poor: { min: 0.90, max: 2.00 },
        cautious: { min: 0.86, max: 0.89 },
        normal: { min: 0.80, max: 0.85 },
        great: { min: 0.75, max: 0.79 },
        elite: { min: 0.00, max: 0.74 },
      },
    },
  },

  fitness: {
    vo2max: {
      unit: 'ml/kg/min',
      note: 'Simple 5-tier buckets; adjust to your preferred reference set.',
      male: {
        '18-25': { poor: { min: 0, max: 41.9 }, cautious: { min: 42, max: 46.9 }, normal: { min: 47, max: 52.9 }, great: { min: 53, max: 57.9 }, elite: { min: 58, max: 99 } },
        '26-35': { poor: { min: 0, max: 39.9 }, cautious: { min: 40, max: 44.9 }, normal: { min: 45, max: 50.9 }, great: { min: 51, max: 55.9 }, elite: { min: 56, max: 99 } },
        '36-45': { poor: { min: 0, max: 36.9 }, cautious: { min: 37, max: 41.9 }, normal: { min: 42, max: 47.9 }, great: { min: 48, max: 52.9 }, elite: { min: 53, max: 99 } },
        '46-55': { poor: { min: 0, max: 32.9 }, cautious: { min: 33, max: 36.9 }, normal: { min: 37, max: 41.9 }, great: { min: 42, max: 45.9 }, elite: { min: 46, max: 99 } },
        '56-65': { poor: { min: 0, max: 29.9 }, cautious: { min: 30, max: 32.9 }, normal: { min: 33, max: 36.9 }, great: { min: 37, max: 40.9 }, elite: { min: 41, max: 99 } },
        '66+': { poor: { min: 0, max: 25.9 }, cautious: { min: 26, max: 28.9 }, normal: { min: 29, max: 31.9 }, great: { min: 32, max: 34.9 }, elite: { min: 35, max: 99 } },
      },
      female: {
        '18-25': { poor: { min: 0, max: 36.9 }, cautious: { min: 37, max: 41.9 }, normal: { min: 42, max: 46.9 }, great: { min: 47, max: 51.9 }, elite: { min: 52, max: 99 } },
        '26-35': { poor: { min: 0, max: 34.9 }, cautious: { min: 35, max: 38.9 }, normal: { min: 39, max: 43.9 }, great: { min: 44, max: 48.9 }, elite: { min: 49, max: 99 } },
        '36-45': { poor: { min: 0, max: 31.9 }, cautious: { min: 32, max: 35.9 }, normal: { min: 36, max: 40.9 }, great: { min: 41, max: 45.9 }, elite: { min: 46, max: 99 } },
        '46-55': { poor: { min: 0, max: 27.9 }, cautious: { min: 28, max: 31.9 }, normal: { min: 32, max: 35.9 }, great: { min: 36, max: 39.9 }, elite: { min: 40, max: 99 } },
        '56-65': { poor: { min: 0, max: 24.9 }, cautious: { min: 25, max: 27.9 }, normal: { min: 28, max: 31.9 }, great: { min: 32, max: 34.9 }, elite: { min: 35, max: 99 } },
        '66+': { poor: { min: 0, max: 21.9 }, cautious: { min: 22, max: 24.9 }, normal: { min: 25, max: 27.9 }, great: { min: 28, max: 30.9 }, elite: { min: 31, max: 99 } },
      },
    },

    resting_hr: {
      unit: 'bpm',
      note: 'Lower is generally better; interpret with symptoms/med history.',
      poor: { min: 90, max: 220 },
      cautious: { min: 80, max: 89 },
      normal: { min: 60, max: 79 },
      great: { min: 50, max: 59 },
      elite: { min: 30, max: 49 },
    },

    blood_pressure_systolic: {
      unit: 'mmHg',
      note: 'General adult categories; verify with clinical guidelines.',
      poor: { min: 140, max: 300 },
      cautious: { min: 130, max: 139 },
      normal: { min: 110, max: 129 },
      great: { min: 100, max: 109 },
      elite: { min: 0, max: 99 },
    },
  },

  mobility: {
    hip_mobility_left: {
      unit: 'cm',
      note: 'Higher is better (example scale). Replace with your test\'s real scoring.',
      poor: { min: 0, max: 4.9 },
      cautious: { min: 5, max: 7.9 },
      normal: { min: 8, max: 10.9 },
      great: { min: 11, max: 13.9 },
      elite: { min: 14, max: 99 },
    },
    hip_mobility_right: {
      unit: 'cm',
      note: 'Higher is better (example scale). Replace with your test\'s real scoring.',
      poor: { min: 0, max: 4.9 },
      cautious: { min: 5, max: 7.9 },
      normal: { min: 8, max: 10.9 },
      great: { min: 11, max: 13.9 },
      elite: { min: 14, max: 99 },
    },
  },
};
