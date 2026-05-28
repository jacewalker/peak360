'use client';

import type { SectionProps } from '@/app/portal/assessment/[id]/section/[num]/page';
import SectionHeader from '@/components/ui/SectionHeader';
import FormField from '@/components/forms/FormField';
import FormRow from '@/components/forms/FormRow';
import SelectField from '@/components/forms/SelectField';
import CustomMarkersBlock from '@/components/forms/CustomMarkersBlock';

const FABER_OPTIONS = [
  { value: '1', label: 'Pass' },
  { value: '0', label: 'Fail' },
];

const FABER_HELPER =
  'Pass: test-leg knee level with or below other leg, no pain. Fail: knee higher, or pain.';

export default function Section9({ data, onChange }: SectionProps) {
  const n = (field: string) => (v: string) => onChange(field, v === '' ? null : Number(v));
  const s = (field: string) => (v: string) => onChange(field, v === '' ? null : Number(v));

  return (
    <div className="space-y-6">
      <SectionHeader
        number={9}
        title="Mobility & Flexibility Testing"
        description="Record bilateral measurements for each mobility test."
      />

      <div className="bg-bg-3 rounded-xl border border-line p-4 sm:p-6 space-y-6">
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

      {/* FABER Test */}
      <div className="bg-bg-3 rounded-xl border border-line p-4 sm:p-6 space-y-4">
        <div>
          <h3 className="font-mono text-[11px] font-medium text-gold-brand uppercase tracking-[0.18em] mb-1">FABER Test</h3>
          <p className="text-[11px] text-text-faint leading-snug">{FABER_HELPER}</p>
        </div>
        <FormRow>
          <SelectField
            id="faberOutcomeLeft"
            label="FABER - Left Outcome"
            value={data.faberOutcomeLeft != null ? String(data.faberOutcomeLeft) : ''}
            onChange={s('faberOutcomeLeft')}
            options={FABER_OPTIONS}
          />
          <FormField id="faberDistanceLeft" label="FABER - Left Distance to Table (cm)" type="number" value={data.faberDistanceLeft as number} onChange={n('faberDistanceLeft')} step={0.1} />
        </FormRow>
        <FormRow>
          <SelectField
            id="faberOutcomeRight"
            label="FABER - Right Outcome"
            value={data.faberOutcomeRight != null ? String(data.faberOutcomeRight) : ''}
            onChange={s('faberOutcomeRight')}
            options={FABER_OPTIONS}
          />
          <FormField id="faberDistanceRight" label="FABER - Right Distance to Table (cm)" type="number" value={data.faberDistanceRight as number} onChange={n('faberDistanceRight')} step={0.1} />
        </FormRow>
      </div>
      <CustomMarkersBlock section={9} data={data} onChange={onChange} />
    </div>
  );
}
