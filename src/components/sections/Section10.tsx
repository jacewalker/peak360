'use client';

import type { SectionProps } from '@/app/portal/assessment/[id]/section/[num]/page';
import SectionHeader from '@/components/ui/SectionHeader';
import CustomMarkersBlock from '@/components/forms/CustomMarkersBlock';

export default function Section10({ data, onChange }: SectionProps) {
  return (
    <div className="space-y-6">
      <SectionHeader
        number={10}
        title="Balance & Power Testing"
        description="Balance and power tests are now recorded in Section 8 - Strength Testing."
      />

      <div className="bg-bg-3 rounded-xl border border-line p-4 sm:p-6">
        <p className="text-[13px] text-text-dim text-center">
          All balance and power tests have been moved to Section 8 (Strength Testing) to match the testing order.
        </p>
      </div>
      <CustomMarkersBlock section={10} data={data} onChange={onChange} />
    </div>
  );
}
