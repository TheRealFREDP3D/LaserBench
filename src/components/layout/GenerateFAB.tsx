import type {ReactNode} from 'react';
import {Zap} from 'lucide-react';

interface GenerateFABProps {
  disabled: boolean;
  estimatedTimeStr: string | null;
  onClick: () => void;
}

export default function GenerateFAB({disabled, estimatedTimeStr, onClick}: GenerateFABProps) {
  const handleClick = () => {
    if (disabled) return;
    onClick();
  };

  return (
    <button
      type="button"
      aria-label="Generate G-Code"
      aria-disabled={disabled}
      onClick={handleClick}
      className={`fixed bottom-10 right-6 z-50 rounded-full min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 select-none outline-none
        ${disabled
          ? 'opacity-50 cursor-not-allowed pointer-events-none bg-red-800 text-red-300'
          : 'bg-red-600 text-black shadow-[0_0_12px_rgba(220,38,38,0.4)] hover:bg-red-500 hover:shadow-[0_0_16px_rgba(220,38,38,0.6)] active:scale-95 cursor-pointer'
        }`}
    >
      <span className="flex items-center gap-1.5">
        <Zap className="w-4 h-4" />
        Generate
      </span>
      {estimatedTimeStr !== null && (
        <span data-testid="fab-estimated-time" className="text-[9px] font-mono font-medium opacity-80 leading-tight">
          {estimatedTimeStr}
        </span>
      )}
    </button>
  );
}
