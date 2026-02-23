import { describe, it, expect, beforeEach } from 'vitest';
import { useAssessmentStore } from '@/lib/store/assessment-store';

describe('useAssessmentStore', () => {
  beforeEach(() => {
    useAssessmentStore.getState().reset();
  });

  it('has correct initial state', () => {
    const state = useAssessmentStore.getState();
    expect(state.assessmentId).toBeNull();
    expect(state.currentSection).toBe(1);
    expect(state.sectionData).toEqual({});
    expect(state.isDirty).toBe(false);
    expect(state.isSaving).toBe(false);
    expect(state.lastSaved).toBeNull();
  });

  it('sets assessment ID', () => {
    useAssessmentStore.getState().setAssessmentId('test-123');
    expect(useAssessmentStore.getState().assessmentId).toBe('test-123');
  });

  it('sets current section', () => {
    useAssessmentStore.getState().setCurrentSection(5);
    expect(useAssessmentStore.getState().currentSection).toBe(5);
  });

  it('sets section data and marks dirty', () => {
    useAssessmentStore.getState().setSectionData(1, { clientName: 'John' } as Record<string, unknown>);
    const state = useAssessmentStore.getState();
    expect(state.sectionData[1]).toEqual({ clientName: 'John' });
    expect(state.isDirty).toBe(true);
  });

  it('updates individual section field', () => {
    useAssessmentStore.getState().setSectionData(1, { clientName: 'John' } as Record<string, unknown>);
    useAssessmentStore.getState().updateSectionField(1, 'clientEmail', 'john@test.com');
    const section = useAssessmentStore.getState().sectionData[1] as Record<string, unknown>;
    expect(section.clientName).toBe('John');
    expect(section.clientEmail).toBe('john@test.com');
  });

  it('creates section data when updating field on empty section', () => {
    useAssessmentStore.getState().updateSectionField(3, 'chestPain', 'no');
    const section = useAssessmentStore.getState().sectionData[3] as Record<string, unknown>;
    expect(section.chestPain).toBe('no');
  });

  it('sets saving state', () => {
    useAssessmentStore.getState().setIsSaving(true);
    expect(useAssessmentStore.getState().isSaving).toBe(true);
    useAssessmentStore.getState().setIsSaving(false);
    expect(useAssessmentStore.getState().isSaving).toBe(false);
  });

  it('sets last saved time and clears dirty flag', () => {
    useAssessmentStore.getState().setSectionData(1, { clientName: 'John' } as Record<string, unknown>);
    expect(useAssessmentStore.getState().isDirty).toBe(true);

    useAssessmentStore.getState().setLastSaved('10:30:00 AM');
    expect(useAssessmentStore.getState().lastSaved).toBe('10:30:00 AM');
    expect(useAssessmentStore.getState().isDirty).toBe(false);
  });

  it('marks clean', () => {
    useAssessmentStore.getState().setSectionData(1, { clientName: 'John' } as Record<string, unknown>);
    expect(useAssessmentStore.getState().isDirty).toBe(true);
    useAssessmentStore.getState().markClean();
    expect(useAssessmentStore.getState().isDirty).toBe(false);
  });

  it('resets all state', () => {
    useAssessmentStore.getState().setAssessmentId('test-123');
    useAssessmentStore.getState().setCurrentSection(5);
    useAssessmentStore.getState().setSectionData(1, { clientName: 'John' } as Record<string, unknown>);

    useAssessmentStore.getState().reset();
    const state = useAssessmentStore.getState();
    expect(state.assessmentId).toBeNull();
    expect(state.currentSection).toBe(1);
    expect(state.sectionData).toEqual({});
    expect(state.isDirty).toBe(false);
  });
});
