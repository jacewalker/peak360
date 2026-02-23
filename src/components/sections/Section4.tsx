'use client';

import type { SectionProps } from '@/app/assessment/[id]/section/[num]/page';
import SectionHeader from '@/components/ui/SectionHeader';
import FormField from '@/components/forms/FormField';
import FormRow from '@/components/forms/FormRow';
import SignaturePad from '@/components/forms/SignaturePad';

export default function Section4({ data, onChange }: SectionProps) {
  return (
    <div className="space-y-6">
      <SectionHeader
        number={4}
        title="Informed Consent & Agreement"
        description="Please read the consent agreement and provide signatures."
      />

      <div className="bg-white rounded-xl border border-border p-6 space-y-6">
        <div className="bg-surface-alt rounded-lg p-4 text-sm text-foreground space-y-3 max-h-64 overflow-y-auto">
          <h4 className="font-semibold">Consent Agreement</h4>
          <p>
            I understand that the assessment I am about to undergo is designed to evaluate my
            physical fitness and health status. The tests may include measurements of body
            composition, cardiovascular fitness, muscular strength, flexibility, and blood
            biomarkers.
          </p>
          <p>
            I understand that there are risks associated with physical testing, including but not
            limited to: muscle soreness, fatigue, dizziness, and in rare cases, cardiac events.
          </p>
          <p>
            I confirm that I have disclosed all relevant medical information, including current
            medications, diagnosed conditions, and recent injuries or surgeries.
          </p>
          <p>
            I understand that my data will be stored securely and used only for the purposes of
            this assessment and my ongoing health management.
          </p>
          <h4 className="font-semibold">Privacy Notice (HIPAA Compliant)</h4>
          <p>
            Your health information is protected. We will not share your data with third parties
            without your explicit consent. All data is stored securely and access is restricted
            to authorized personnel only.
          </p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!data.consentAgree}
            onChange={(e) => onChange('consentAgree', e.target.checked)}
            className="mt-1 w-4 h-4 text-gold focus:ring-gold border-border rounded"
          />
          <span className="text-sm text-foreground">
            I have read and understood the above consent agreement and privacy notice. I agree to
            proceed with the assessment.
          </span>
        </label>
      </div>

      <div className="bg-white rounded-xl border border-border p-6 space-y-6">
        <h3 className="text-lg font-semibold text-navy">Client Signature</h3>
        <FormRow>
          <FormField
            id="clientSignatureName"
            label="Print Full Name"
            value={data.clientSignatureName as string}
            onChange={(v) => onChange('clientSignatureName', v)}
            required
          />
          <FormField
            id="clientSignatureDate"
            label="Date"
            type="date"
            value={data.clientSignatureDate as string}
            onChange={(v) => onChange('clientSignatureDate', v)}
            required
          />
        </FormRow>
        <SignaturePad
          label="Client Signature"
          value={data.clientSignature as string}
          onChange={(v) => onChange('clientSignature', v)}
          nameValue={data.clientSignatureName as string}
        />
      </div>

      <div className="bg-white rounded-xl border border-border p-6 space-y-6">
        <h3 className="text-lg font-semibold text-navy">Coach / Administrator Signature</h3>
        <FormRow>
          <FormField
            id="coachSignatureName"
            label="Print Full Name"
            value={data.coachSignatureName as string}
            onChange={(v) => onChange('coachSignatureName', v)}
            required
          />
          <FormField
            id="coachSignatureDate"
            label="Date"
            type="date"
            value={data.coachSignatureDate as string}
            onChange={(v) => onChange('coachSignatureDate', v)}
            required
          />
        </FormRow>
        <SignaturePad
          label="Coach Signature"
          value={data.coachSignature as string}
          onChange={(v) => onChange('coachSignature', v)}
          nameValue={data.coachSignatureName as string}
        />
      </div>
    </div>
  );
}
