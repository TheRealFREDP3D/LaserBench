import React from 'react';
import { Flame, ShieldAlert, Play } from 'lucide-react';

interface FireControlsProps {
  onFire: () => void;
  onStopFire: () => void;
  onEStop: () => void;
  onRunJob?: () => void;
  isConnected: boolean;
  isPrinting: boolean;
  canPrint: boolean;
}

export const FireControls = React.memo(function FireControls({
  onFire,
  onStopFire,
  onEStop,
  onRunJob,
  isConnected,
  isPrinting,
  canPrint,
}: FireControlsProps) {
  const disabled = !isConnected || isPrinting;

  return (
    <div className="flex flex-col gap-2">
      <button
        onPointerDown={onFire}
        onPointerUp={onStopFire}
        onPointerLeave={onStopFire}
        disabled={disabled}
        className="flex items-center justify-center gap-2 px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-500 rounded-lg text-xs font-bold transition border border-amber-500/30 disabled:opacity-50"
      >
        <Flame className="w-3.5 h-3.5" />
        FIRE
        <kbd className="hidden sm:inline-block ml-1 px-1 py-0.5 bg-black/30 rounded text-[9px] font-mono opacity-50">
          F
        </kbd>
      </button>
      <button
        onClick={onEStop}
        disabled={!isConnected}
        className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-500 rounded-lg text-xs font-bold transition border border-red-500/30 disabled:opacity-50"
      >
        <ShieldAlert className="w-3.5 h-3.5" />
        E-STOP
        <kbd className="hidden sm:inline-block ml-1 px-1 py-0.5 bg-black/30 rounded text-[9px] font-mono opacity-50">
          Ctrl+Esc
        </kbd>
      </button>
      {canPrint && onRunJob && (
        <button
          onClick={onRunJob}
          disabled={!isConnected || isPrinting}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition border shadow-sm disabled:opacity-50 ${
            isPrinting
              ? 'bg-zinc-700 border-zinc-600 text-zinc-400'
              : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-500/30 text-white'
          }`}
        >
          <Play className="w-3.5 h-3.5" />
          {isPrinting ? 'Printing...' : 'Run Job'}
        </button>
      )}
    </div>
  );
});
FireControls.displayName = 'FireControls';
