import type { SectionNumber } from '@/types/assessment';

/**
 * Required fields per section. A section is "complete" when all its required
 * fields have a non-null, non-empty value. Sections 5-10 are data/measurement
 * sections — they're considered complete when at least one field has data.
 */
const REQUIRED_FIELDS: Partial<Record<SectionNumber, string[]>> = {
  1: ['clientName', 'clientGender', 'assessmentDate'],
  2: ['sleepHours', 'stressLevel', 'energyLevel', 'sorenessLevel'],
  3: ['chestPain', 'dizziness', 'heartCondition', 'uncontrolledBP', 'recentSurgery'],
  4: ['consentAgree', 'clientSignature', 'coachSignature'],
};

/** Minimum number of filled fields for data-heavy sections (5-10) */
const MIN_FILLED: Partial<Record<SectionNumber, number>> = {
  5: 1,
  6: 1,
  7: 1,
  8: 1,
  9: 1,
  10: 1,
};

function hasValue(v: unknown): boolean {
  if (v === null || v === undefined || v === '') return false;
  if (v === false) return false;
  return true;
}

export function isSectionComplete(section: SectionNumber, data: Record<string, unknown>): boolean {
  if (section === 11) return false; // Report section — not applicable

  const required = REQUIRED_FIELDS[section];
  if (required) {
    return required.every((field) => hasValue(data[field]));
  }

  const minFilled = MIN_FILLED[section];
  if (minFilled !== undefined) {
    const filled = Object.values(data).filter(hasValue).length;
    return filled >= minFilled;
  }

  return false;
}
