'use client';

interface TestCategoryProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export default function TestCategory({ title, children, className = '' }: TestCategoryProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-[20px] font-medium text-text tracking-[-0.015em] border-b border-line pb-2">{title}</h3>
      {children}
    </div>
  );
}
