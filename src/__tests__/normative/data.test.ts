import { describe, it, expect } from 'vitest';
import { normativeData } from '@/lib/normative/data';

describe('normativeData completeness', () => {
  describe('blood_tests', () => {
    const requiredMarkers = [
      'cholesterol_total', 'ldl_cholesterol', 'hdl_cholesterol', 'triglycerides',
      'fasting_glucose', 'hba1c', 'crp_hs', 'vitamin_d_25oh',
    ];

    it('has all required blood test markers', () => {
      for (const marker of requiredMarkers) {
        expect(normativeData.blood_tests[marker], `Missing blood test: ${marker}`).toBeDefined();
      }
    });

    it('each blood test has all 5 tiers', () => {
      const tiers = ['poor', 'cautious', 'normal', 'great', 'elite'];
      for (const [key, marker] of Object.entries(normativeData.blood_tests)) {
        for (const tier of tiers) {
          expect((marker as Record<string, unknown>)[tier], `Missing tier ${tier} in ${key}`).toBeDefined();
        }
        expect(marker.unit, `Missing unit in ${key}`).toBeDefined();
      }
    });

    it('each tier range has min and max', () => {
      const tiers = ['poor', 'cautious', 'normal', 'great', 'elite'];
      for (const [key, marker] of Object.entries(normativeData.blood_tests)) {
        for (const tier of tiers) {
          const range = (marker as Record<string, { min: number; max: number }>)[tier];
          expect(typeof range.min, `Missing min in ${key}.${tier}`).toBe('number');
          expect(typeof range.max, `Missing max in ${key}.${tier}`).toBe('number');
        }
      }
    });
  });

  describe('body_comp', () => {
    it('has bmi marker', () => {
      expect(normativeData.body_comp.bmi).toBeDefined();
      expect(normativeData.body_comp.bmi.unit).toBeDefined();
    });

    it('has body_fat_percent with gender/age buckets', () => {
      const bf = normativeData.body_comp.body_fat_percent;
      expect(bf).toBeDefined();
      expect(bf.male).toBeDefined();
      expect(bf.female).toBeDefined();
    });

    it('has waist_to_hip with gender split', () => {
      const wth = normativeData.body_comp.waist_to_hip;
      expect(wth).toBeDefined();
      expect(wth.male).toBeDefined();
      expect(wth.female).toBeDefined();
    });
  });

  describe('fitness', () => {
    it('has vo2max with gender/age buckets', () => {
      const vo2 = normativeData.fitness.vo2max;
      expect(vo2).toBeDefined();
      expect(vo2.male).toBeDefined();
      expect(vo2.female).toBeDefined();
      expect(vo2.unit).toBe('ml/kg/min');
    });

    it('has resting_hr marker', () => {
      expect(normativeData.fitness.resting_hr).toBeDefined();
      expect(normativeData.fitness.resting_hr.unit).toBe('bpm');
    });

    it('has blood_pressure_systolic marker', () => {
      expect(normativeData.fitness.blood_pressure_systolic).toBeDefined();
      expect(normativeData.fitness.blood_pressure_systolic.unit).toBe('mmHg');
    });
  });

  describe('mobility', () => {
    it('has hip mobility markers', () => {
      expect(normativeData.mobility.hip_mobility_left).toBeDefined();
      expect(normativeData.mobility.hip_mobility_right).toBeDefined();
    });
  });
});
