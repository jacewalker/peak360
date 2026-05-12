'use client';

interface SelectFieldProps {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  className?: string;
}

export default function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  required,
  className = '',
}: SelectFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="block text-[13px] font-medium text-text">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full h-12 px-4 bg-bg-3 border border-line rounded-lg text-[13px] text-text focus:outline-none focus:border-gold-brand transition-colors"
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
