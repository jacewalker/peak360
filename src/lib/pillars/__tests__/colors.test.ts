import { describe, it, expect } from 'vitest';
import { TRAFFIC_LIGHT_HEX, PILLAR_THRESHOLDS, STATUS_LABEL } from '@/lib/pillars/colors';

describe('TRAFFIC_LIGHT_HEX', () => {
  it('exposes all 4 status keys', () => {
    expect(Object.keys(TRAFFIC_LIGHT_HEX).sort()).toEqual(['amber', 'green', 'pending', 'red']);
  });
  it('green is locked to #10b981', () => expect(TRAFFIC_LIGHT_HEX.green).toBe('#10b981'));
  it('amber is locked to #f59e0b', () => expect(TRAFFIC_LIGHT_HEX.amber).toBe('#f59e0b'));
  it('red is locked to #ef4444', () => expect(TRAFFIC_LIGHT_HEX.red).toBe('#ef4444'));
});

describe('PILLAR_THRESHOLDS (D-10 locked)', () => {
  it('green threshold is 70', () => expect(PILLAR_THRESHOLDS.green).toBe(70));
  it('amber threshold is 40', () => expect(PILLAR_THRESHOLDS.amber).toBe(40));
});

describe('STATUS_LABEL (UI-SPEC §Pillar card)', () => {
  it('green → Strong', () => expect(STATUS_LABEL.green).toBe('Strong'));
  it('amber → Needs improvement', () => expect(STATUS_LABEL.amber).toBe('Needs improvement'));
  it('red → Priority', () => expect(STATUS_LABEL.red).toBe('Priority'));
  it('pending → Data pending', () => expect(STATUS_LABEL.pending).toBe('Data pending'));
});
