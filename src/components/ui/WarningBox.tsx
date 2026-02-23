'use client';

interface WarningBoxProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export default function WarningBox({ title, children, className = '' }: WarningBoxProps) {
  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <span className="text-red-500 text-lg font-bold mt-0.5">!</span>
        <div>
          <h4 className="font-semibold text-red-800 mb-1">{title}</h4>
          <div className="text-sm text-red-700">{children}</div>
        </div>
      </div>
    </div>
  );
}
