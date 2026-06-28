import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Home } from 'lucide-react';

interface JogControlsProps {
  onJog: (axis: string, dist: number) => void;
  onHome: () => void;
  disabled: boolean;
  rightSlot?: React.ReactNode;
  jogStep: number;
  onJogStepChange: (step: number) => void;
}

export const JogControls = React.memo(function JogControls({
  onJog,
  onHome,
  disabled,
  rightSlot,
  jogStep,
  onJogStepChange,
}: JogControlsProps) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b border-white/5 pb-4">
      <div className="flex flex-col items-center gap-1">
        <div className="grid grid-cols-3 gap-1">
          <div />
          <button
            onClick={() => onJog('Y', jogStep)}
            disabled={disabled}
            aria-label="Jog Up"
            className="p-2 bg-zinc-800 rounded hover:bg-zinc-700 transition disabled:opacity-50 relative"
            title="Jog Up (↑)"
          >
            <ArrowUp className="w-4 h-4" />
            <kbd className="hidden sm:block absolute -bottom-1 -right-1 px-0.5 bg-black/50 rounded text-[7px] font-mono opacity-40">
              ↑
            </kbd>
          </button>
          <div />
          <button
            onClick={() => onJog('X', -jogStep)}
            disabled={disabled}
            aria-label="Jog Left"
            className="p-2 bg-zinc-800 rounded hover:bg-zinc-700 transition disabled:opacity-50 relative"
            title="Jog Left (←)"
          >
            <ArrowLeft className="w-4 h-4" />
            <kbd className="hidden sm:block absolute -bottom-1 -right-1 px-0.5 bg-black/50 rounded text-[7px] font-mono opacity-40">
              ←
            </kbd>
          </button>
          <button
            onClick={onHome}
            disabled={disabled}
            aria-label="Home"
            className="p-2 bg-indigo-600/20 text-indigo-400 rounded hover:bg-indigo-600/30 transition disabled:opacity-50 relative"
            title="Home (H)"
          >
            <Home className="w-4 h-4" />
            <kbd className="hidden sm:block absolute -bottom-1 -right-1 px-0.5 bg-black/50 rounded text-[7px] font-mono opacity-40">
              H
            </kbd>
          </button>
          <button
            onClick={() => onJog('X', jogStep)}
            disabled={disabled}
            aria-label="Jog Right"
            className="p-2 bg-zinc-800 rounded hover:bg-zinc-700 transition disabled:opacity-50 relative"
            title="Jog Right (→)"
          >
            <ArrowRight className="w-4 h-4" />
            <kbd className="hidden sm:block absolute -bottom-1 -right-1 px-0.5 bg-black/50 rounded text-[7px] font-mono opacity-40">
              →
            </kbd>
          </button>
          <div />
          <button
            onClick={() => onJog('Y', -jogStep)}
            disabled={disabled}
            aria-label="Jog Down"
            className="p-2 bg-zinc-800 rounded hover:bg-zinc-700 transition disabled:opacity-50 relative"
            title="Jog Down (↓)"
          >
            <ArrowDown className="w-4 h-4" />
            <kbd className="hidden sm:block absolute -bottom-1 -right-1 px-0.5 bg-black/50 rounded text-[7px] font-mono opacity-40">
              ↓
            </kbd>
          </button>
          <div />
        </div>
        <span className="text-[10px] text-zinc-500 font-mono">JOG XY</span>
        <div className="w-full flex items-center gap-2 px-1">
          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={jogStep}
            onChange={(e) => onJogStepChange(Number(e.target.value))}
            disabled={disabled}
            className="flex-1 h-1 accent-zinc-500 cursor-pointer"
          />
          <span className="text-[10px] text-zinc-400 font-mono w-7 text-right">{jogStep}</span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-2">
        <div className="flex flex-col gap-1">
          <button
            onClick={() => onJog('Z', 5)}
            disabled={disabled}
            aria-label="Jog Z Up"
            className="p-2 bg-zinc-800 rounded hover:bg-zinc-700 transition flex items-center gap-2 text-[10px] disabled:opacity-50"
          >
            <ArrowUp className="w-3 h-3" /> Z+
          </button>
          <button
            onClick={() => onJog('Z', -5)}
            disabled={disabled}
            aria-label="Jog Z Down"
            className="p-2 bg-zinc-800 rounded hover:bg-zinc-700 transition flex items-center gap-2 text-[10px] disabled:opacity-50"
          >
            <ArrowDown className="w-3 h-3" /> Z-
          </button>
        </div>
        <span className="text-[10px] text-zinc-500 font-mono">JOG Z</span>
      </div>

      {rightSlot && <div className="flex flex-col justify-center">{rightSlot}</div>}
    </div>
  );
});
JogControls.displayName = 'JogControls';
