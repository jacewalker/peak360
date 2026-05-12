'use client';

import MonoEyebrow from '@/components/ui/MonoEyebrow';

interface SectionHeaderProps {
  number: number;
  title: string;
  description?: string;
}

export default function SectionHeader({ number, title, description }: SectionHeaderProps) {
  return (
    <div className="mb-6 sm:mb-8">
      <MonoEyebrow as="div" variant="hero" className="flex items-center gap-3 mb-3">
        Section {number} / 11 · {title.toUpperCase()}
      </MonoEyebrow>
      <h2 className="text-[20px] font-medium text-text leading-[1.15] tracking-[-0.015em]">
        {title}
      </h2>
      {description && (
        <p className="text-[13px] text-text-dim mt-2 leading-[1.55]">{description}</p>
      )}
    </div>
  );
}
