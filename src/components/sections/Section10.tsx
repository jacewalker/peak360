'use client';

import type { SectionProps } from '@/app/assessment/[id]/section/[num]/page';
import SectionHeader from '@/components/ui/SectionHeader';
import FormField from '@/components/forms/FormField';
import FormRow from '@/components/forms/FormRow';

export default function Section10({ data, onChange }: SectionProps) {
  const n = (field: string) => (v: string) => onChange(field, v === '' ? null : Number(v));

  return (
    <div className="space-y-6">
      <SectionHeader
        number={10}
        title="Balance & Power Testing"
        description="Record balance and explosive power measurements."
      />

      <div className="bg-white rounded-xl border border-border p-6 space-y-6">
        <FormRow>
          <FormField id="balanceSingleLeg" label="Single Leg Balance Time (seconds)" type="number" value={data.balanceSingleLeg as number} onChange={n('balanceSingleLeg')} step={1} max={60} />
          <FormField id="standingBroadJump" label="Standing Broad Jump Distance (cm)" type="number" value={data.standingBroadJump as number} onChange={n('standingBroadJump')} step={1} />
        </FormRow>
      </div>
    </div>
  );
}
