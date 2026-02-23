'use client';

import type { SectionProps } from '@/app/assessment/[id]/section/[num]/page';
import SectionHeader from '@/components/ui/SectionHeader';
import FormField from '@/components/forms/FormField';
import FormRow from '@/components/forms/FormRow';

export default function Section8({ data, onChange }: SectionProps) {
  const n = (field: string) => (v: string) => onChange(field, v === '' ? null : Number(v));

  return (
    <div className="space-y-6">
      <SectionHeader
        number={8}
        title="Strength Testing"
        description="Record results for each strength test."
      />

      <div className="bg-white rounded-xl border border-border p-6 space-y-6">
        <FormRow>
          <FormField id="gripStrengthLeft" label="Grip Strength - Left Hand (kg)" type="number" value={data.gripStrengthLeft as number} onChange={n('gripStrengthLeft')} step={0.1} />
          <FormField id="gripStrengthRight" label="Grip Strength - Right Hand (kg)" type="number" value={data.gripStrengthRight as number} onChange={n('gripStrengthRight')} step={0.1} />
        </FormRow>
        <FormRow>
          <FormField id="pushupsMax" label="Push-Up Test - Max Repetitions" type="number" value={data.pushupsMax as number} onChange={n('pushupsMax')} />
          <FormField id="deadManHang" label="Dead Man Hang Time (seconds)" type="number" value={data.deadManHang as number} onChange={n('deadManHang')} step={0.1} />
        </FormRow>
        <FormRow>
          <FormField id="sitToStand30" label="30-Second Sit-to-Stand Reps" type="number" value={data.sitToStand30 as number} onChange={n('sitToStand30')} />
          <FormField id="farmersCarryWeight" label="Farmers Carry - Weight per Hand (kg)" type="number" value={data.farmersCarryWeight as number} onChange={n('farmersCarryWeight')} step={0.5} />
        </FormRow>
        <FormRow>
          <FormField id="farmersCarryDistance" label="Farmers Carry - Distance/Time (m/s)" type="number" value={data.farmersCarryDistance as number} onChange={n('farmersCarryDistance')} step={0.1} />
          <FormField id="medBallChestPass" label="Med Ball Chest Pass Distance (m)" type="number" value={data.medBallChestPass as number} onChange={n('medBallChestPass')} step={0.1} />
        </FormRow>
      </div>
    </div>
  );
}
