'use client';

interface FormFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string | number | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number | string;
  disabled?: boolean;
  className?: string;
}

export default function FormField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  min,
  max,
  step,
  disabled,
  className = '',
}: FormFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="block text-[13px] font-medium text-text">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="w-full h-12 px-4 bg-bg-3 border border-line rounded-lg text-[13px] text-text placeholder:text-text-faint focus:outline-none focus:border-gold-brand transition-colors disabled:bg-bg-2 disabled:text-text-faint"
      />
    </div>
  );
}
