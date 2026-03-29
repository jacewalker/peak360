'use client';

interface FormRowProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
}

export default function FormRow({ children, columns = 2 }: FormRowProps) {
  const gridClass =
    columns === 4
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      : columns === 3
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      : 'grid-cols-1 sm:grid-cols-2';

  return <div className={`grid ${gridClass} gap-4`}>{children}</div>;
}
