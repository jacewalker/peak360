'use client';

interface SectionHeaderProps {
  number: number;
  title: string;
  description?: string;
}

export default function SectionHeader({ number, title, description }: SectionHeaderProps) {
  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-center gap-3 mb-1.5">
        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-navy to-navy-light text-white flex items-center justify-center text-sm font-bold shadow-sm">
          {number}
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-navy">{title}</h2>
      </div>
      {description && <p className="text-sm text-muted ml-11">{description}</p>}
    </div>
  );
}
