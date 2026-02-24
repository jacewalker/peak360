import { create } from 'zustand';
import type { SectionData, SectionNumber } from '@/types/assessment';

interface AssessmentStore {
  assessmentId: string | null;
  currentSection: SectionNumber;
  sectionData: Partial<Record<SectionNumber, SectionData>>;
  completedSections: SectionNumber[];
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: string | null;

  setAssessmentId: (id: string) => void;
  setCurrentSection: (section: SectionNumber) => void;
  setSectionData: (section: SectionNumber, data: SectionData) => void;
  updateSectionField: (section: SectionNumber, field: string, value: unknown) => void;
  setCompletedSections: (sections: SectionNumber[]) => void;
  markSectionCompleted: (section: SectionNumber) => void;
  markSectionIncomplete: (section: SectionNumber) => void;
  setIsSaving: (saving: boolean) => void;
  setLastSaved: (time: string) => void;
  markClean: () => void;
  reset: () => void;
}

export const useAssessmentStore = create<AssessmentStore>((set) => ({
  assessmentId: null,
  currentSection: 1,
  sectionData: {},
  completedSections: [],
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

  setCompletedSections: (sections) => set({ completedSections: sections }),

  markSectionCompleted: (section) =>
    set((state) => ({
      completedSections: state.completedSections.includes(section)
        ? state.completedSections
        : [...state.completedSections, section],
    })),

  markSectionIncomplete: (section) =>
    set((state) => ({
      completedSections: state.completedSections.filter((s) => s !== section),
    })),

  setIsSaving: (saving) => set({ isSaving: saving }),

  setLastSaved: (time) => set({ lastSaved: time, isDirty: false }),

  markClean: () => set({ isDirty: false }),

  reset: () =>
    set({
      assessmentId: null,
      currentSection: 1,
      sectionData: {},
      completedSections: [],
      isDirty: false,
      isSaving: false,
      lastSaved: null,
    }),
}));
