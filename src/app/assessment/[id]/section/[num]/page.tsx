'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProgressBar from '@/components/layout/ProgressBar';
import NavigationButtons from '@/components/layout/NavigationButtons';
import { useAssessmentStore } from '@/lib/store/assessment-store';
import { TOTAL_SECTIONS, type SectionNumber, type SectionData } from '@/types/assessment';
import Section1 from '@/components/sections/Section1';
import Section2 from '@/components/sections/Section2';
import Section3 from '@/components/sections/Section3';
import Section4 from '@/components/sections/Section4';
import Section5 from '@/components/sections/Section5';
import Section6 from '@/components/sections/Section6';
import Section7 from '@/components/sections/Section7';
import Section8 from '@/components/sections/Section8';
import Section9 from '@/components/sections/Section9';
import Section10 from '@/components/sections/Section10';
import Section11 from '@/components/sections/Section11';

const sectionComponents: Record<number, React.ComponentType<SectionProps>> = {
  1: Section1,
  2: Section2,
  3: Section3,
  4: Section4,
  5: Section5,
  6: Section6,
  7: Section7,
  8: Section8,
  9: Section9,
  10: Section10,
};

export interface SectionProps {
  data: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
  assessmentId: string;
}

export default function SectionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const num = parseInt(params.num as string) as SectionNumber;

  const store = useAssessmentStore();
  const [loaded, setLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load section data from API
  useEffect(() => {
    store.setAssessmentId(id);
    store.setCurrentSection(num);

    fetch(`/api/assessments/${id}/sections/${num}`)
      .then((r) => r.json())
      .then(({ data }) => {
        if (data) {
          store.setSectionData(num, data as SectionData);
        }
        store.markClean();
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, num]);

  // Save section data to API
  const saveSection = useCallback(async () => {
    const sectionData = store.sectionData[num];
    if (!sectionData) return;

    store.setIsSaving(true);
    try {
      await fetch(`/api/assessments/${id}/sections/${num}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: sectionData }),
      });
      store.setLastSaved(new Date().toLocaleTimeString());
    } finally {
      store.setIsSaving(false);
    }
  }, [id, num, store]);

  // Auto-save on change with 1s debounce
  useEffect(() => {
    if (!store.isDirty || !loaded) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(saveSection, 1000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [store.isDirty, store.sectionData, saveSection, loaded]);

  // Save on page unload
  useEffect(() => {
    const onUnload = () => {
      if (store.isDirty) {
        const sectionData = store.sectionData[num];
        if (sectionData) {
          navigator.sendBeacon(
            `/api/assessments/${id}/sections/${num}`,
            new Blob([JSON.stringify({ data: sectionData })], { type: 'application/json' })
          );
        }
      }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [id, num, store]);

  const handleChange = useCallback(
    (field: string, value: unknown) => {
      store.updateSectionField(num, field, value);
    },
    [num, store]
  );

  const navigate = useCallback(
    async (direction: 'prev' | 'next') => {
      await saveSection();
      const target = direction === 'next' ? num + 1 : num - 1;
      if (target >= 1 && target <= TOTAL_SECTIONS) {
        router.push(`/assessment/${id}/section/${target}`);
      }
    },
    [id, num, router, saveSection]
  );

  if (!loaded) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted">Loading section...</p>
        </div>
      </div>
    );
  }

  // Section 11 is special (report)
  if (num === 11) {
    return (
      <>
        <ProgressBar currentSection={num} />
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
          <Section11 assessmentId={id} />
        </main>
        <NavigationButtons
          currentSection={num}
          onPrev={() => navigate('prev')}
          onNext={() => navigate('next')}
          isSaving={store.isSaving}
          lastSaved={store.lastSaved}
        />
      </>
    );
  }

  const SectionComponent = sectionComponents[num];
  const sectionData = (store.sectionData[num] || {}) as Record<string, unknown>;

  return (
    <>
      <ProgressBar currentSection={num} />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        {SectionComponent && (
          <SectionComponent data={sectionData} onChange={handleChange} assessmentId={id} />
        )}
      </main>
      <NavigationButtons
        currentSection={num}
        onPrev={() => navigate('prev')}
        onNext={() => navigate('next')}
        isSaving={store.isSaving}
        lastSaved={store.lastSaved}
      />
    </>
  );
}
