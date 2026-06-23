import { useState, useEffect, useRef } from 'react';

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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from parent when value changes externally
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Cleanup pending timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

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
      onChange={(e) => handleChange(parseInt(e.target.value) || min)}
      aria-label={ariaLabel}
      className={className}
    />
  );
}
