import { useState, useRef } from 'react';

interface DebouncedRangeProps {
  id?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  debounceMs?: number;
  className?: string;
  ariaLabel?: string;
}

export default function DebouncedRange({
  id,
  min,
  max,
  step = 1,
  value,
  onChange,
  debounceMs = 200,
  className,
  ariaLabel,
}: DebouncedRangeProps) {
  const [localValue, setLocalValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from parent when value changes externally (during render)
  if (value !== prevValue) {
    setPrevValue(value);
    setLocalValue(value);
  }

  const handleChange = (val: number) => {
    setLocalValue(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(val), debounceMs);
  };

  return (
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={localValue}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        handleChange(Number.isFinite(v) ? v : min);
      }}
      aria-label={ariaLabel}
      className={className}
    />
  );
}
