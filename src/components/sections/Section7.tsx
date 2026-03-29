'use client';

import type { SectionProps } from '@/app/assessment/[id]/section/[num]/page';
import SectionHeader from '@/components/ui/SectionHeader';
import FormField from '@/components/forms/FormField';
import FormRow from '@/components/forms/FormRow';
import RadioGroup from '@/components/forms/RadioGroup';

export default function Section7({ data, onChange }: SectionProps) {
  const n = (field: string) => (v: string) => onChange(field, v === '' ? null : Number(v));

  return (
    <div className="space-y-6">
      <SectionHeader
        number={7}
        title="Cardiovascular Fitness Testing"
        description="Choose one cardiovascular test and record vitals."
      />

      <div className="bg-white rounded-xl border border-border p-4 sm:p-6 space-y-6">
        <RadioGroup
          name="cardioTest"
          label="Choose ONE cardiovascular test"
          value={data.cardioTest as string}
          onChange={(v) => onChange('cardioTest', v)}
          options={[
            { value: 'vo2max', label: 'VO2 Max Test' },
            { value: 'sixminwalk', label: '6-Minute Walk Test' },
          ]}
        />

        {data.cardioTest === 'vo2max' && (
          <div className="bg-surface-alt rounded-lg p-4">
            <FormField
              id="vo2max"
              label="VO2 Max (mL/kg/min)"
              type="number"
              value={data.vo2max as number}
              onChange={n('vo2max')}
              step={0.1}
            />
          </div>
        )}

        {data.cardioTest === 'sixminwalk' && (
          <div className="bg-surface-alt rounded-lg p-4">
            <FormField
              id="sixMinWalk"
              label="6-Minute Walk Distance (meters)"
              type="number"
              value={data.sixMinWalk as number}
              onChange={n('sixMinWalk')}
              step={1}
            />
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-border p-4 sm:p-6 space-y-6">
        <h3 className="text-lg font-semibold text-navy">Vitals</h3>
        <FormRow columns={3}>
          <FormField id="restingHR" label="Resting Heart Rate (bpm)" type="number" value={data.restingHR as number} onChange={n('restingHR')} />
          <FormField id="bpSystolic" label="Blood Pressure - Systolic (mmHg)" type="number" value={data.bpSystolic as number} onChange={n('bpSystolic')} />
          <FormField id="bpDiastolic" label="Blood Pressure - Diastolic (mmHg)" type="number" value={data.bpDiastolic as number} onChange={n('bpDiastolic')} />
        </FormRow>
      </div>
    </div>
  );
}
