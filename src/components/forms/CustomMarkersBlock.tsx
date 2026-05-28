'use client';

import { useEffect, useState } from 'react';
import FormField from '@/components/forms/FormField';
import FormRow from '@/components/forms/FormRow';

type FetchedMarker = {
  testKey: string;
  label: string;
  section: number;
  dataKey: string;
  fallbackUnit?: string | null;
  source: 'seed' | 'db';
};

interface CustomMarkersBlockProps {
  section: number;
  data: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
}

/**
 * Phase 12 D-08 - Shared Section-form block that fetches admin-managed DB markers
 * from /api/markers, filters to `source === 'db' && section === props.section`, and
 * renders one numeric <FormField> per marker. Self-hides when no DB markers exist
 * for the section, or when the fetch fails (graceful degradation - the section form
 * stays usable for the hardcoded fields).
 *
 * NOTE on dataKey collisions with seeded markers: the create-marker form should
 * auto-derive dataKey from label; if an admin manually enters a dataKey that
 * collides with a seeded MarkerDef.dataKey, two inputs in the same section will
 * write to the same sectionData JSON key. Server-side uniqueness is enforced on
 * testKey but NOT on dataKey today; surfaced as a known v1 limitation (CONTEXT
 * threat T-12-14).
 */
export default function CustomMarkersBlock({ section, data, onChange }: CustomMarkersBlockProps) {
  const [markers, setMarkers] = useState<FetchedMarker[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/markers')
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j && j.success && j.data && Array.isArray(j.data.markers)) {
          const filtered = (j.data.markers as FetchedMarker[]).filter(
            (m) => m.source === 'db' && m.section === section,
          );
          setMarkers(filtered);
        }
      })
      .catch(() => {
        // self-hide on network/auth failure; the section form stays usable
        if (!cancelled) setMarkers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [section]);

  if (markers.length === 0) return null;

  const n = (field: string) => (v: string) => onChange(field, v === '' ? null : Number(v));

  return (
    <div className="bg-bg-3 rounded-xl border border-line p-4 sm:p-6 space-y-4">
      <h3 className="text-[14px] font-medium text-text">Custom markers</h3>
      <FormRow>
        {markers.map((m) => (
          <FormField
            key={m.testKey}
            id={m.dataKey}
            label={`${m.label}${m.fallbackUnit ? ` (${m.fallbackUnit})` : ''}`}
            type="number"
            value={data[m.dataKey] as number | undefined}
            onChange={n(m.dataKey)}
            step={0.01}
          />
        ))}
      </FormRow>
    </div>
  );
}
