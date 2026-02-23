import { describe, it, expect } from 'vitest';
import { SECTION_TITLES, TOTAL_SECTIONS } from '@/types/assessment';

describe('Assessment Types & Constants', () => {
  it('has 11 total sections', () => {
    expect(TOTAL_SECTIONS).toBe(11);
  });

  it('has titles for all 11 sections', () => {
    for (let i = 1; i <= 11; i++) {
      expect(SECTION_TITLES[i as keyof typeof SECTION_TITLES]).toBeDefined();
      expect(SECTION_TITLES[i as keyof typeof SECTION_TITLES].length).toBeGreaterThan(0);
    }
  });

  it('has correct section titles', () => {
    expect(SECTION_TITLES[1]).toBe('Client Information');
    expect(SECTION_TITLES[2]).toBe('Daily Readiness');
    expect(SECTION_TITLES[3]).toBe('Medical Screening');
    expect(SECTION_TITLES[4]).toBe('Informed Consent');
    expect(SECTION_TITLES[5]).toBe('Blood Tests & Biomarkers');
    expect(SECTION_TITLES[6]).toBe('Body Composition');
    expect(SECTION_TITLES[7]).toBe('Cardiovascular Fitness');
    expect(SECTION_TITLES[8]).toBe('Strength Testing');
    expect(SECTION_TITLES[9]).toBe('Mobility & Flexibility');
    expect(SECTION_TITLES[10]).toBe('Balance & Power');
    expect(SECTION_TITLES[11]).toBe('Complete Longevity Analysis');
  });
});
