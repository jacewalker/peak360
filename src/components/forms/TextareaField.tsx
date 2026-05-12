'use client';

interface TextareaFieldProps {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  className?: string;
}

export default function TextareaField({
  id,
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  required,
  className = '',
}: TextareaFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="block text-[13px] font-medium text-text">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
      <textarea
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        required={required}
        className="w-full px-4 py-3 bg-bg-3 border border-line rounded-lg text-[13px] text-text placeholder:text-text-faint focus:outline-none focus:border-gold-brand transition-colors resize-vertical"
      />
    </div>
  );
}
