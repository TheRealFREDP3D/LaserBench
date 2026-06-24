import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { X, Flame, Cpu, Layers, Sliders } from 'lucide-react';
import type { CalibrationHistoryEntry, MaterialProfile, PatternType } from '../types';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface QuickLogModalProps {
  open: boolean;
  onClose: () => void;
  activeMaterial: MaterialProfile | null;
  activeMachineName: string;
  patternType: PatternType;
  pwmMax: number;
  paramSnapshot: {
    powerMin: number;
    powerMax: number;
    speedMin: number;
    speedMax: number;
    zMin: number;
    zMax: number;
    blockSize: number;
  };
  onSave: (
    entry: CalibrationHistoryEntry,
    optimal: { power: number; speed: number; focusZ: number }
  ) => void;
}

const PATTERN_LABELS: Record<string, string> = {
  matrix: 'Power-Speed Matrix',
  power_ramp: 'Power Ramp',
  speed_ramp: 'Speed Ramp',
  focus_ladder: 'Focus Ladder',
  kerf_test: 'Kerf Test Comb',
};

export default function QuickLogModal({
  open,
  onClose,
  activeMaterial,
  activeMachineName,
  patternType,
  pwmMax,
  paramSnapshot,
  onSave,
}: QuickLogModalProps) {
  const midPower = Math.round((paramSnapshot.powerMin + paramSnapshot.powerMax) / 2);
  const midSpeed = Math.round((paramSnapshot.speedMin + paramSnapshot.speedMax) / 2);
  const midZ = Math.round(((paramSnapshot.zMin + paramSnapshot.zMax) / 2) * 10) / 10;

  const [optPower, setOptPower] = useState(midPower);
  const [optSpeed, setOptSpeed] = useState(midSpeed);
  const [optZ, setOptZ] = useState(midZ);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setOptPower(midPower);
      setOptSpeed(midSpeed);
      setOptZ(midZ);
      setNotes('');
    }
  }, [open, midPower, midSpeed, midZ]);

  const trapRef = useFocusTrap<HTMLDivElement>(open);

  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!activeMaterial) return;

    const entry: CalibrationHistoryEntry = {
      id: `log_${Date.now()}`,
      date: new Date().toISOString().substring(0, 16).replace('T', ' '),
      patternType,
      optimalPower: optPower,
      optimalSpeed: optSpeed,
      optimalFocusZ: optZ,
      notes:
        notes.trim() ||
        `Burn on ${activeMachineName}. Optimal S${optPower} / F${optSpeed} / Z${optZ}mm.`,
    };

    onSave(entry, { power: optPower, speed: optSpeed, focusZ: optZ });
    onClose();
  };

  const pctString = (val: number) => `${Math.round((val / pwmMax) * 100)}%`;

  return (
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label="Log Burn Result"
      data-testid="quick-log-modal-backdrop"
      className="fixed inset-0 bg-black/85 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#0F0F0F] border border-red-900/60 rounded-lg p-6 max-w-md w-full text-[#E8E8E8] shadow-2xl relative space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 text-neutral-500 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 border-b border-white/8 pb-3">
          <Flame className="text-red-500 w-5 h-5 shrink-0" />
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Log Burn Result
            </h3>
          </div>
        </div>

        <div className="rounded border border-white/8 bg-[#1A1A1A] p-3 space-y-1.5 text-[11px]">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-red-400" />
              <span className="text-neutral-300">{activeMachineName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-red-400" />
              <span className="text-neutral-300">{activeMaterial?.name ?? '—'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sliders className="w-3 h-3 text-red-400" />
              <span className="text-neutral-300">{PATTERN_LABELS[patternType] ?? patternType}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block mb-1 text-[10px] uppercase font-bold text-neutral-500">
                Power (S)
              </label>
              <input
                id="quicklog-power"
                type="number"
                value={optPower}
                onChange={(e) => setOptPower(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-black border border-white/10 rounded-md px-2 py-1.5 text-sm font-mono text-red-500"
              />
              <div className="text-[9px] text-neutral-600 mt-0.5">{pctString(optPower)} of max</div>
            </div>
            <div>
              <label className="block mb-1 text-[10px] uppercase font-bold text-neutral-500">
                Speed (F)
              </label>
              <input
                id="quicklog-speed"
                type="number"
                value={optSpeed}
                onChange={(e) => setOptSpeed(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-black border border-white/10 rounded-md px-2 py-1.5 text-sm font-mono text-red-500"
              />
            </div>
            <div>
              <label className="block mb-1 text-[10px] uppercase font-bold text-neutral-500">
                Focus Z
              </label>
              <input
                id="quicklog-z"
                type="number"
                step="0.1"
                value={optZ}
                onChange={(e) => setOptZ(parseFloat(e.target.value) || 0)}
                className="w-full bg-black border border-white/10 rounded-md px-2 py-1.5 text-sm font-mono text-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block mb-1 text-[10px] uppercase font-bold text-neutral-500">
              Observations
            </label>
            <textarea
              id="quicklog-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Clean dark engraving..."
              className="w-full bg-black border border-white/10 rounded-md px-2 py-1.5 text-xs text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/8">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs font-bold text-neutral-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              id="quicklog-save-btn"
              type="submit"
              className="bg-red-600 hover:bg-red-500 text-black px-4 py-1.5 rounded font-bold text-xs shadow-[0_0_10px_rgba(220,38,38,0.3)] transition"
            >
              Save to Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
