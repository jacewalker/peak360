'use client';

import type { SectionProps } from '@/app/assessment/[id]/section/[num]/page';
import SectionHeader from '@/components/ui/SectionHeader';
import FormField from '@/components/forms/FormField';
import FormRow from '@/components/forms/FormRow';

export default function Section9({ data, onChange }: SectionProps) {
  const n = (field: string) => (v: string) => onChange(field, v === '' ? null : Number(v));

  return (
    <div className="space-y-6">
      <SectionHeader
        number={9}
        title="Mobility & Flexibility Testing"
        description="Record bilateral measurements for each mobility test."
      />

      <div className="bg-white rounded-xl border border-border p-4 sm:p-6 space-y-6">
        <FormRow>
          <FormField id="overheadReachLeft" label="Overhead Reach - Left (cm from wall)" type="number" value={data.overheadReachLeft as number} onChange={n('overheadReachLeft')} step={0.1} />
          <FormField id="overheadReachRight" label="Overhead Reach - Right (cm from wall)" type="number" value={data.overheadReachRight as number} onChange={n('overheadReachRight')} step={0.1} />
        </FormRow>
        <FormRow>
          <FormField id="shoulderMobilityLeft" label="Shoulder Mobility - Left Over/Right Under (cm)" type="number" value={data.shoulderMobilityLeft as number} onChange={n('shoulderMobilityLeft')} step={0.1} />
          <FormField id="shoulderMobilityRight" label="Shoulder Mobility - Right Over/Left Under (cm)" type="number" value={data.shoulderMobilityRight as number} onChange={n('shoulderMobilityRight')} step={0.1} />
        </FormRow>
        <FormRow>
          <FormField id="hipMobilityLeft" label="Hip Flexion Angle - Left (degrees)" type="number" value={data.hipMobilityLeft as number} onChange={n('hipMobilityLeft')} step={1} />
          <FormField id="hipMobilityRight" label="Hip Flexion Angle - Right (degrees)" type="number" value={data.hipMobilityRight as number} onChange={n('hipMobilityRight')} step={1} />
        </FormRow>
        <FormRow>
          <FormField id="ankleDorsiflexionLeft" label="Ankle Dorsiflexion - Left (cm)" type="number" value={data.ankleDorsiflexionLeft as number} onChange={n('ankleDorsiflexionLeft')} step={0.1} />
          <FormField id="ankleDorsiflexionRight" label="Ankle Dorsiflexion - Right (cm)" type="number" value={data.ankleDorsiflexionRight as number} onChange={n('ankleDorsiflexionRight')} step={0.1} />
        </FormRow>
      </div>
    </div>
  );
}
