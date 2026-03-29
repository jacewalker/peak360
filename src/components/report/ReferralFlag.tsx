'use client';

interface ReferralFlagProps {
  level: 'monitor' | 'urgent';
}

export function ReferralFlag({ level }: ReferralFlagProps) {
  if (level === 'urgent') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 mt-1 bg-red-100 border border-red-300 rounded-md">
        <span className="text-red-600 text-[10px] font-bold uppercase tracking-wide">
          Refer to GP for further investigation
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 mt-1 bg-amber-100 border border-amber-300 rounded-md">
      <span className="text-amber-700 text-[10px] font-bold uppercase tracking-wide">
        Monitor -- retest in 3-6 months
      </span>
    </div>
  );
}
