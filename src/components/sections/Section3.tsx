'use client';

import type { SectionProps } from '@/app/assessment/[id]/section/[num]/page';
import SectionHeader from '@/components/ui/SectionHeader';
import RadioGroup from '@/components/forms/RadioGroup';
import TextareaField from '@/components/forms/TextareaField';
import WarningBox from '@/components/ui/WarningBox';

const yesNo = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export default function Section3({ data, onChange }: SectionProps) {
  const hasFlags =
    data.chestPain === 'yes' ||
    data.dizziness === 'yes' ||
    data.heartCondition === 'yes' ||
    data.uncontrolledBP === 'yes';

  return (
    <div className="space-y-6">
      <SectionHeader
        number={3}
        title="Medical Screening & Safety Check"
        description="Important health screening questions before physical assessment."
      />

      <div className="bg-white rounded-xl border border-border p-4 sm:p-6 space-y-6">
        <RadioGroup
          name="chestPain"
          label="Do you experience chest pain during exercise?"
          value={data.chestPain as string}
          onChange={(v) => onChange('chestPain', v)}
          options={yesNo}
        />
        <RadioGroup
          name="dizziness"
          label="Do you experience dizziness or fainting?"
          value={data.dizziness as string}
          onChange={(v) => onChange('dizziness', v)}
          options={yesNo}
        />
        <RadioGroup
          name="heartCondition"
          label="Do you have a known heart condition?"
          value={data.heartCondition as string}
          onChange={(v) => onChange('heartCondition', v)}
          options={yesNo}
        />
        <RadioGroup
          name="uncontrolledBP"
          label="Do you have uncontrolled high blood pressure?"
          value={data.uncontrolledBP as string}
          onChange={(v) => onChange('uncontrolledBP', v)}
          options={yesNo}
        />

        {hasFlags && (
          <WarningBox title="Medical Flag Detected">
            <p>
              One or more medical screening questions have been flagged. Please consult with a
              medical professional before proceeding with physical testing. Document clearance
              below.
            </p>
          </WarningBox>
        )}

        <RadioGroup
          name="recentSurgery"
          label="Any surgeries or injuries in the last 6 months?"
          value={data.recentSurgery as string}
          onChange={(v) => onChange('recentSurgery', v)}
          options={yesNo}
        />

        {data.recentSurgery === 'yes' && (
          <TextareaField
            id="surgeryDetailsText"
            label="Please provide surgery/injury details"
            value={data.surgeryDetailsText as string}
            onChange={(v) => onChange('surgeryDetailsText', v)}
          />
        )}
      </div>

      <div className="bg-white rounded-xl border border-border p-4 sm:p-6 space-y-6">
        <h3 className="text-lg font-semibold text-navy">Additional Medical Information</h3>
        <TextareaField
          id="currentMedications"
          label="Current Medications"
          value={data.currentMedications as string}
          onChange={(v) => onChange('currentMedications', v)}
          placeholder="List any current medications..."
        />
        <TextareaField
          id="diagnosedConditions"
          label="Diagnosed Conditions"
          value={data.diagnosedConditions as string}
          onChange={(v) => onChange('diagnosedConditions', v)}
          placeholder="List any diagnosed conditions..."
        />
        <TextareaField
          id="otherConcerns"
          label="Other Concerns or Information"
          value={data.otherConcerns as string}
          onChange={(v) => onChange('otherConcerns', v)}
          placeholder="Any other relevant information..."
        />
      </div>
    </div>
  );
}
