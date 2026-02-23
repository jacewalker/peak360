'use client';

interface TestCategoryProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export default function TestCategory({ title, children, className = '' }: TestCategoryProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-semibold text-navy border-b border-border pb-2">{title}</h3>
      {children}
    </div>
  );
}
