'use client';

import type { SectionProps } from '@/app/portal/assessment/[id]/section/[num]/page';
import SectionHeader from '@/components/ui/SectionHeader';
import FormField from '@/components/forms/FormField';
import FormRow from '@/components/forms/FormRow';
import CustomMarkersBlock from '@/components/forms/CustomMarkersBlock';

export default function Section7({ data, onChange }: SectionProps) {
  const n = (field: string) => (v: string) => onChange(field, v === '' ? null : Number(v));

  return (
    <div className="space-y-6">
      <SectionHeader
        number={7}
        title="Cardiovascular Fitness Testing"
        description="Record the VO2 max result and vitals."
      />

      <div className="bg-bg-3 rounded-xl border border-line p-4 sm:p-6 space-y-6">
        <FormField
          id="vo2max"
          label="VO2 Max (mL/kg/min)"
          type="number"
          value={data.vo2max as number}
          onChange={n('vo2max')}
          step={0.1}
        />
      </div>

      <div className="bg-bg-3 rounded-xl border border-line p-4 sm:p-6 space-y-6">
        <h3 className="text-[20px] font-medium text-text tracking-[-0.015em]">Vitals</h3>
        <FormRow columns={3}>
          <FormField id="restingHR" label="Resting Heart Rate (bpm)" type="number" value={data.restingHR as number} onChange={n('restingHR')} />
          <FormField id="bpSystolic" label="Blood Pressure - Systolic (mmHg)" type="number" value={data.bpSystolic as number} onChange={n('bpSystolic')} />
          <FormField id="bpDiastolic" label="Blood Pressure - Diastolic (mmHg)" type="number" value={data.bpDiastolic as number} onChange={n('bpDiastolic')} />
        </FormRow>
      </div>
      <CustomMarkersBlock section={7} data={data} onChange={onChange} />
    </div>
  );
}
