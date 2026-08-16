import React, { useRef, useEffect } from 'react';
import DebouncedRange from './DebouncedRange';

interface ParameterFieldProps {
  label: string;
  id: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (val: number) => void;
  unit?: string;
  isLight?: boolean;
  /** When true, highlights the row in amber to signal a required/unsafe value */
  danger?: boolean;
}

export const ParameterField: React.FC<ParameterFieldProps> = ({
  label,
  id,
  min,
  max,
  step = 1,
  value,
  onChange,
  unit,
  isLight,
  danger,
}) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNumberChange = (raw: string) => {
    const parsed = parseFloat(raw);
    if (Number.isNaN(parsed)) return;
    const clamped = Math.min(max, Math.max(min, parsed));
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(clamped), 200);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      className={`grid grid-cols-[1fr_2fr_80px] items-center gap-4 py-2 border-b last:border-0 ${
        danger
          ? 'border-amber-500/40 bg-amber-500/5 rounded px-2 -mx-2 animate-pulse'
          : 'border-white/5'
      }`}
    >
      <label
        htmlFor={id}
        className={`text-[10px] uppercase tracking-wider font-bold ${
          danger ? 'text-amber-400' : isLight ? 'text-zinc-600' : 'text-neutral-400'
        }`}
      >
        {label}
      </label>
      <div className="flex items-center">
        <DebouncedRange
          id={`${id}-range`}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
          className={`flex-1 h-1 rounded-md appearance-none accent-red-600 cursor-pointer ${isLight ? 'bg-zinc-200' : 'bg-[#222]'}`}
        />
      </div>
      <div className="flex items-center gap-1.5 justify-end">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          defaultValue={value}
          key={value}
          onBlur={(e) => handleNumberChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleNumberChange((e.target as HTMLInputElement).value);
          }}
          className={`w-16 elegant-input text-right px-2 py-1 rounded font-mono text-xs ${
            danger
              ? 'bg-amber-950/40 border-amber-500/50 text-amber-400 shadow-inner'
              : isLight
              ? 'bg-zinc-50 border-zinc-200 text-zinc-900'
              : 'bg-[#0A0A0A] border-white/10 text-red-500 shadow-inner'
          }`}
        />
        {unit && <span className="text-[9px] text-neutral-500 font-mono w-4">{unit}</span>}
      </div>
    </div>
  );
};
