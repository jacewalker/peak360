import { describe, it, expect } from 'vitest';
import { getPeak360Rating, normalizeRating, getStandards, tierScore } from '@/lib/normative/ratings';

describe('normalizeRating', () => {
  it('maps exact tier names correctly', () => {
    expect(normalizeRating('poor').tier).toBe('poor');
    expect(normalizeRating('cautious').tier).toBe('cautious');
    expect(normalizeRating('normal').tier).toBe('normal');
    expect(normalizeRating('great').tier).toBe('great');
    expect(normalizeRating('elite').tier).toBe('elite');
  });

  it('maps synonyms to correct tiers', () => {
    expect(normalizeRating('very poor').tier).toBe('poor');
    expect(normalizeRating('below standards').tier).toBe('poor');
    expect(normalizeRating('fair').tier).toBe('cautious');
    expect(normalizeRating('borderline').tier).toBe('cautious');
    expect(normalizeRating('average').tier).toBe('cautious');
    expect(normalizeRating('good').tier).toBe('great');
    expect(normalizeRating('optimal').tier).toBe('great');
    expect(normalizeRating('athlete').tier).toBe('elite');
    expect(normalizeRating('superior').tier).toBe('elite');
  });

  it('handles case-insensitive input', () => {
    expect(normalizeRating('POOR').tier).toBe('poor');
    expect(normalizeRating('Elite').tier).toBe('elite');
    expect(normalizeRating('GREAT').tier).toBe('great');
  });

  it('defaults to normal for unknown values', () => {
    expect(normalizeRating('unknown').tier).toBe('normal');
    expect(normalizeRating('').tier).toBe('normal');
  });
});

describe('tierScore', () => {
  it('returns correct numeric scores', () => {
    expect(tierScore('poor')).toBe(1);
    expect(tierScore('cautious')).toBe(2);
    expect(tierScore('normal')).toBe(3);
    expect(tierScore('great')).toBe(4);
    expect(tierScore('elite')).toBe(5);
  });
});

describe('getStandards', () => {
  it('returns standards for blood test markers', () => {
    const result = getStandards('cholesterol_total');
    expect(result.standards).not.toBeNull();
    expect(result.unit).toBe('mmol/L');
  });

  it('returns standards for fitness markers with age/gender', () => {
    const result = getStandards('vo2max', 30, 'male');
    expect(result.standards).not.toBeNull();
    expect(result.unit).toBe('ml/kg/min');
  });

  it('returns standards for body comp markers', () => {
    const result = getStandards('bmi');
    expect(result.standards).not.toBeNull();
  });

  it('returns standards for body_fat_percent with age/gender', () => {
    const result = getStandards('body_fat_percent', 35, 'male');
    expect(result.standards).not.toBeNull();
  });

  it('returns standards for waist_to_hip with gender', () => {
    const maleResult = getStandards('waist_to_hip', null, 'male');
    const femaleResult = getStandards('waist_to_hip', null, 'female');
    expect(maleResult.standards).not.toBeNull();
    expect(femaleResult.standards).not.toBeNull();
  });

  it('returns standards for mobility markers', () => {
    const result = getStandards('hip_mobility_left');
    expect(result.standards).not.toBeNull();
  });

  it('returns null for unknown markers', () => {
    const result = getStandards('nonexistent_marker');
    expect(result.standards).toBeNull();
  });
});

describe('getPeak360Rating', () => {
  it('returns null for null/undefined/empty values', () => {
    expect(getPeak360Rating('cholesterol_total', null)).toBeNull();
    expect(getPeak360Rating('cholesterol_total', undefined)).toBeNull();
    expect(getPeak360Rating('cholesterol_total', '')).toBeNull();
  });

  it('returns null for NaN values', () => {
    expect(getPeak360Rating('cholesterol_total', 'abc')).toBeNull();
  });

  it('rates cholesterol_total correctly', () => {
    // Normal range is typically 3.5-5.0 mmol/L
    const normalResult = getPeak360Rating('cholesterol_total', 4.5);
    expect(normalResult).not.toBeNull();
    expect(normalResult!.tier).toBeDefined();
    expect(normalResult!.unit).toBe('mmol/L');

    // High cholesterol should be cautious or poor
    const highResult = getPeak360Rating('cholesterol_total', 7.5);
    expect(highResult).not.toBeNull();
    expect(['cautious', 'poor']).toContain(highResult!.tier);
  });

  it('rates VO2 max with age and gender', () => {
    // Good VO2 max for a 30-year-old male
    const result = getPeak360Rating('vo2max', 50, 30, 'male');
    expect(result).not.toBeNull();
    expect(result!.unit).toBe('ml/kg/min');
  });

  it('rates body_fat_percent with age and gender', () => {
    const maleResult = getPeak360Rating('body_fat_percent', 15, 30, 'male');
    expect(maleResult).not.toBeNull();

    const femaleResult = getPeak360Rating('body_fat_percent', 25, 30, 'female');
    expect(femaleResult).not.toBeNull();
  });

  it('rates resting heart rate', () => {
    const goodHR = getPeak360Rating('resting_hr', 55);
    expect(goodHR).not.toBeNull();
    expect(goodHR!.unit).toBe('bpm');

    const highHR = getPeak360Rating('resting_hr', 100);
    expect(highHR).not.toBeNull();
    expect(['cautious', 'poor']).toContain(highHR!.tier);
  });

  it('rates blood pressure systolic', () => {
    const normalBP = getPeak360Rating('blood_pressure_systolic', 115);
    expect(normalBP).not.toBeNull();
    expect(normalBP!.unit).toBe('mmHg');
  });

  it('rates fasting glucose', () => {
    const result = getPeak360Rating('fasting_glucose', 5.0);
    expect(result).not.toBeNull();
    expect(result!.unit).toBe('mmol/L');
  });

  it('returns null for unknown test key', () => {
    expect(getPeak360Rating('nonexistent', 42)).toBeNull();
  });

  it('accepts string values and parses them', () => {
    const result = getPeak360Rating('cholesterol_total', '4.5');
    expect(result).not.toBeNull();
    expect(result!.value).toBe(4.5);
  });
});
