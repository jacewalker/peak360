'use client';

interface RadioGroupProps {
  name: string;
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  className?: string;
}

export default function RadioGroup({
  name,
  label,
  value,
  onChange,
  options,
  required,
  className = '',
}: RadioGroupProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <span className="block text-sm font-medium text-navy">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </span>
      <div className="flex flex-wrap gap-3 sm:gap-4">
        {options.map((opt) => (
          <label
            key={opt.value}
            className="flex items-center gap-2 cursor-pointer text-sm min-h-[44px] sm:min-h-0"
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="w-5 h-5 sm:w-4 sm:h-4 text-gold focus:ring-gold border-border"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}
