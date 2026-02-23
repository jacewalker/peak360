'use client';

import type { SectionProps } from '@/app/assessment/[id]/section/[num]/page';
import SectionHeader from '@/components/ui/SectionHeader';
import FormField from '@/components/forms/FormField';
import FormRow from '@/components/forms/FormRow';
import SelectField from '@/components/forms/SelectField';

export default function Section1({ data, onChange }: SectionProps) {
  const calculateAge = (dob: string) => {
    if (!dob) return;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    onChange('clientAge', age);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        number={1}
        title="Client Information"
        description="Basic client details and emergency contact information."
      />

      <div className="bg-white rounded-xl border border-border p-6 space-y-6">
        <FormRow>
          <FormField
            id="clientName"
            label="Full Name"
            value={data.clientName as string}
            onChange={(v) => onChange('clientName', v)}
            required
          />
          <FormField
            id="clientEmail"
            label="Email"
            type="email"
            value={data.clientEmail as string}
            onChange={(v) => onChange('clientEmail', v)}
          />
        </FormRow>

        <FormRow>
          <FormField
            id="clientPhone"
            label="Phone"
            type="tel"
            value={data.clientPhone as string}
            onChange={(v) => onChange('clientPhone', v)}
          />
          <FormField
            id="clientDOB"
            label="Date of Birth"
            type="date"
            value={data.clientDOB as string}
            onChange={(v) => {
              onChange('clientDOB', v);
              calculateAge(v);
            }}
            required
          />
        </FormRow>

        <FormRow>
          <SelectField
            id="clientGender"
            label="Gender"
            value={data.clientGender as string}
            onChange={(v) => onChange('clientGender', v)}
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
            ]}
            required
          />
          <FormField
            id="clientAge"
            label="Age (calculated)"
            type="number"
            value={data.clientAge as number}
            onChange={(v) => onChange('clientAge', v)}
            disabled
          />
        </FormRow>

        <FormRow>
          <FormField
            id="assessmentDate"
            label="Assessment Date"
            type="date"
            value={data.assessmentDate as string}
            onChange={(v) => onChange('assessmentDate', v)}
          />
        </FormRow>
      </div>

      <div className="bg-white rounded-xl border border-border p-6 space-y-6">
        <h3 className="text-lg font-semibold text-navy">Emergency Contact</h3>
        <FormRow>
          <FormField
            id="emergencyContactName"
            label="Emergency Contact Name"
            value={data.emergencyContactName as string}
            onChange={(v) => onChange('emergencyContactName', v)}
            required
          />
          <FormField
            id="emergencyContactRelationship"
            label="Relationship"
            value={data.emergencyContactRelationship as string}
            onChange={(v) => onChange('emergencyContactRelationship', v)}
            required
          />
        </FormRow>
        <FormRow>
          <FormField
            id="emergencyContactPhone"
            label="Emergency Contact Phone"
            type="tel"
            value={data.emergencyContactPhone as string}
            onChange={(v) => onChange('emergencyContactPhone', v)}
            required
          />
          <FormField
            id="emergencyContactAltPhone"
            label="Alternate Phone"
            type="tel"
            value={data.emergencyContactAltPhone as string}
            onChange={(v) => onChange('emergencyContactAltPhone', v)}
          />
        </FormRow>
      </div>
    </div>
  );
}
