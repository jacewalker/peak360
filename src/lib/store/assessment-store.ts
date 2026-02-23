import { create } from 'zustand';
import type { SectionData, SectionNumber } from '@/types/assessment';

interface AssessmentStore {
  assessmentId: string | null;
  currentSection: SectionNumber;
  sectionData: Partial<Record<SectionNumber, SectionData>>;
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: string | null;

  setAssessmentId: (id: string) => void;
  setCurrentSection: (section: SectionNumber) => void;
  setSectionData: (section: SectionNumber, data: SectionData) => void;
  updateSectionField: (section: SectionNumber, field: string, value: unknown) => void;
  setIsSaving: (saving: boolean) => void;
  setLastSaved: (time: string) => void;
  markClean: () => void;
  reset: () => void;
}

export const useAssessmentStore = create<AssessmentStore>((set) => ({
  assessmentId: null,
  currentSection: 1,
  sectionData: {},
  isDirty: false,
  isSaving: false,
  lastSaved: null,

  setAssessmentId: (id) => set({ assessmentId: id }),

  setCurrentSection: (section) => set({ currentSection: section }),

  setSectionData: (section, data) =>
    set((state) => ({
      sectionData: { ...state.sectionData, [section]: data },
      isDirty: true,
    })),

  updateSectionField: (section, field, value) =>
    set((state) => {
      const current = (state.sectionData[section] || {}) as Record<string, unknown>;
      return {
        sectionData: {
          ...state.sectionData,
          [section]: { ...current, [field]: value },
        },
        isDirty: true,
      };
    }),

  setIsSaving: (saving) => set({ isSaving: saving }),

  setLastSaved: (time) => set({ lastSaved: time, isDirty: false }),

  markClean: () => set({ isDirty: false }),

  reset: () =>
    set({
      assessmentId: null,
      currentSection: 1,
      sectionData: {},
      isDirty: false,
      isSaving: false,
      lastSaved: null,
    }),
}));
