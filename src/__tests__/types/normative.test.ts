import { describe, it, expect } from 'vitest';
import { TIER_COLORS, TIER_LABELS } from '@/types/normative';

describe('Normative Types & Constants', () => {
  it('has all 5 tier colors', () => {
    expect(TIER_COLORS.poor).toBeDefined();
    expect(TIER_COLORS.cautious).toBeDefined();
    expect(TIER_COLORS.normal).toBeDefined();
    expect(TIER_COLORS.great).toBeDefined();
    expect(TIER_COLORS.elite).toBeDefined();
  });

  it('has all 5 tier labels', () => {
    expect(TIER_LABELS.poor).toBe('Poor');
    expect(TIER_LABELS.cautious).toBe('Cautious');
    expect(TIER_LABELS.normal).toBe('Normal');
    expect(TIER_LABELS.great).toBe('Great');
    expect(TIER_LABELS.elite).toBe('Elite');
  });

  it('tier colors contain expected CSS classes', () => {
    expect(TIER_COLORS.elite).toContain('emerald');
    expect(TIER_COLORS.great).toContain('blue');
    expect(TIER_COLORS.cautious).toContain('amber');
    expect(TIER_COLORS.poor).toContain('red');
  });
});
