'use client';

interface SliderFieldProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export default function SliderField({
  id,
  label,
  value,
  onChange,
  min = 1,
  max = 10,
  step = 1,
  className = '',
}: SliderFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-[13px] font-medium text-text">
          {label}
        </label>
        <span className="font-mono text-[20px] font-medium text-gold-brand" style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-line rounded-lg appearance-none cursor-pointer accent-gold-brand"
      />
      <div className="flex justify-between text-[11px] text-text-dim">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
