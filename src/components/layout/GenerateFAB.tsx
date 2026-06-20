import { FileDown, ClipboardList } from 'lucide-react';

interface GenerateFABProps {
  disabled: boolean;
  estimatedTimeStr: string | null;
  onClick: () => void;
  /** Optional secondary action — opens the Quick Log modal */
  onLogClick?: () => void;
  /** Disable the log button (e.g., no material selected) */
  logDisabled?: boolean;
}

export default function GenerateFAB({ disabled, estimatedTimeStr, onClick, onLogClick, logDisabled = false }: GenerateFABProps) {
  const handleClick = () => {
    if (disabled) return;
    onClick();
  };

  const handleLogClick = () => {
    if (logDisabled || !onLogClick) return;
    onLogClick();
  };

  return (
    <div className="fixed bottom-12 right-6 z-50 flex flex-col items-end gap-2">
      {/* Secondary action — Log Burn Result (above the primary FAB) */}
      {onLogClick && (
        <button
          type="button"
          aria-label="Log burn result"
          aria-disabled={logDisabled}
          onClick={handleLogClick}
          data-testid="log-burn-fab"
          className={`rounded-full min-h-[40px] px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 select-none outline-none flex items-center gap-1.5 border
            ${logDisabled
              ? 'opacity-40 cursor-not-allowed pointer-events-none bg-[#1A1A1A] text-neutral-600 border-white/8'
              : 'bg-[#0F0F0F] text-red-300 border-red-900/50 hover:bg-[#1A1A1A] hover:text-red-200 hover:border-red-700 active:scale-95 cursor-pointer shadow-md'
            }`}
          title="Log the optimal settings from your last burn"
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>Log Burn</span>
        </button>
      )}

      {/* Primary FAB — Download G-Code (renamed from "Generate") */}
      <button
        type="button"
        aria-label="Download G-Code"
        aria-disabled={disabled}
        onClick={handleClick}
        data-testid="generate-fab"
        className={`rounded-full min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 select-none outline-none
          ${disabled
            ? 'opacity-50 cursor-not-allowed pointer-events-none bg-red-800 text-red-300'
            : 'bg-red-600 text-black shadow-[0_0_12px_rgba(220,38,38,0.4)] hover:bg-red-500 hover:shadow-[0_0_16px_rgba(220,38,38,0.6)] active:scale-95 cursor-pointer'
          }`}
      >
        <span className="flex items-center gap-1.5">
          <FileDown className="w-4 h-4" />
          Download G-Code
        </span>
        {estimatedTimeStr !== null && (
          <span data-testid="fab-estimated-time" className="text-[9px] font-mono font-medium opacity-80 leading-tight">
            {estimatedTimeStr}
          </span>
        )}
      </button>
    </div>
  );
}
