'use client';

import type { SectionProps } from '@/app/assessment/[id]/section/[num]/page';
import SectionHeader from '@/components/ui/SectionHeader';
import SliderField from '@/components/forms/SliderField';
import SelectField from '@/components/forms/SelectField';
import FormField from '@/components/forms/FormField';
import FormRow from '@/components/forms/FormRow';

export default function Section2({ data, onChange }: SectionProps) {
  return (
    <div className="space-y-6">
      <SectionHeader
        number={2}
        title="Daily Readiness Assessment"
        description="Current physical and mental state to contextualize test results."
      />

      <div className="bg-white rounded-xl border border-border p-4 sm:p-6 space-y-6">
        <FormField
          id="sleepHours"
          label="Hours of Sleep Last Night"
          type="number"
          value={data.sleepHours as number}
          onChange={(v) => onChange('sleepHours', Number(v))}
          min={0}
          max={12}
          step={0.5}
        />

        <SliderField
          id="stressLevel"
          label="Stress Level"
          value={(data.stressLevel as number) ?? 5}
          onChange={(v) => onChange('stressLevel', v)}
          min={1}
          max={10}
        />

        <SliderField
          id="energyLevel"
          label="Energy Level"
          value={(data.energyLevel as number) ?? 5}
          onChange={(v) => onChange('energyLevel', v)}
          min={1}
          max={10}
        />

        <SliderField
          id="sorenessLevel"
          label="Muscle Soreness"
          value={(data.sorenessLevel as number) ?? 0}
          onChange={(v) => onChange('sorenessLevel', v)}
          min={0}
          max={10}
        />

        <FormRow>
          <SelectField
            id="caffeineToday"
            label="Caffeine Consumed Today"
            value={data.caffeineToday as string}
            onChange={(v) => onChange('caffeineToday', v)}
            options={[
              { value: 'none', label: 'None' },
              { value: '1-cup', label: '1 Cup' },
              { value: '2-cups', label: '2 Cups' },
              { value: '3-plus', label: '3+ Cups' },
              { value: 'energy-drink', label: 'Energy Drink' },
            ]}
          />
          <SelectField
            id="alcoholLast48"
            label="Alcohol in Last 48 Hours"
            value={data.alcoholLast48 as string}
            onChange={(v) => onChange('alcoholLast48', v)}
            options={[
              { value: 'none', label: 'None' },
              { value: '1-2-drinks', label: '1-2 Drinks' },
              { value: '3-4-drinks', label: '3-4 Drinks' },
              { value: '5-plus', label: '5+ Drinks' },
            ]}
          />
        </FormRow>
      </div>
    </div>
  );
}
