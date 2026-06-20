import { useState, useEffect, type FormEvent } from 'react';
import { X, Flame, Calendar, Cpu, Layers, Sliders } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { MaterialProfile, PatternType, CalibrationHistoryEntry } from '../types';

interface QuickLogModalProps {
  open: boolean;
  onClose: () => void;
  activeMaterial: MaterialProfile | null;
  activeMachineName: string;
  patternType: PatternType;
  pwmMax: number;
  // Snapshot of the parameters used for this burn (read-only context)
  paramSnapshot: {
    powerMin: number;
    powerMax: number;
    speedMin: number;
    speedMax: number;
    zMin: number;
    zMax: number;
    blockSize: number;
  };
  onSave: (entry: CalibrationHistoryEntry, optimal: { power: number; speed: number; focusZ: number }) => void;
  theme: 'dark' | 'light';
}

const PATTERN_LABELS: Record<PatternType, string> = {
  matrix: 'Power-Speed Matrix',
  power_ramp: 'Power Ramp',
  speed_ramp: 'Speed Ramp',
  focus_ladder: 'Focus Ladder Z-test',
  kerf_test: 'Kerf Clearance Comb',
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
  theme,
}: QuickLogModalProps) {
  const isLight = theme === 'light';

  // Pre-fill with the midpoint of the calibration ranges — most likely optimal value
  const midPower = Math.round((paramSnapshot.powerMin + paramSnapshot.powerMax) / 2);
  const midSpeed = Math.round((paramSnapshot.speedMin + paramSnapshot.speedMax) / 2);
  const midZ = Math.round(((paramSnapshot.zMin + paramSnapshot.zMax) / 2) * 10) / 10;

  const [optPower, setOptPower] = useState<number>(midPower);
  const [optSpeed, setOptSpeed] = useState<number>(midSpeed);
  const [optZ, setOptZ] = useState<number>(midZ);
  const [notes, setNotes] = useState<string>('');

  // Sync optimal values when modal reopens with new paramSnapshot
  useEffect(() => {
    if (!open) return;
    setOptPower(midPower);
    setOptSpeed(midSpeed);
    setOptZ(midZ);
    setNotes('');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

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
      notes: notes.trim() || `Burn on ${activeMachineName}. Optimal S${optPower} / F${optSpeed} / Z${optZ}mm.`,
    };

    onSave(entry, { power: optPower, speed: optSpeed, focusZ: optZ });

    // Reset for next open
    setNotes('');
    onClose();
  };

  const pctString = (val: number) => `${Math.round((val / pwmMax) * 100)}%`;

  return (
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label="Log Burn Result"
      className="fixed inset-0 bg-black/85 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      data-testid="quick-log-modal-backdrop"
    >
      <div
        className={`bg-[#0F0F0F] border border-red-900/60 rounded-lg p-6 max-w-md w-full text-[#E8E8E8] shadow-2xl relative space-y-4 ${isLight ? 'theme-light' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-neutral-500 hover:text-white transition cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 border-b border-white/8 pb-3">
          <Flame className="text-red-500 w-5 h-5 shrink-0" />
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Log Burn Result</h3>
            <p className="text-[10px] text-neutral-500 mt-0.5">Record optimal settings from your calibration burn</p>
          </div>
        </div>

        {/* Burn context (read-only) */}
        <div className={`rounded border p-3 space-y-1.5 text-[11px] ${isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#1A1A1A] border-white/8'}`}>
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Burn Context</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-red-400" />
              <span className="text-neutral-500">Machine:</span>
              <span className={isLight ? 'text-zinc-800' : 'text-white'}>{activeMachineName}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-red-400" />
              <span className="text-neutral-500">Material:</span>
              <span className={isLight ? 'text-zinc-800' : 'text-white'}>{activeMaterial?.name ?? '—'}</span>
            </div>
            <div className="flex items-center gap-1.5 col-span-2">
              <Sliders className="w-3 h-3 text-red-400" />
              <span className="text-neutral-500">Pattern:</span>
              <span className={isLight ? 'text-zinc-800' : 'text-white'}>{PATTERN_LABELS[patternType]}</span>
            </div>
          </div>
          <div className={`grid grid-cols-3 gap-2 pt-2 mt-1 border-t font-mono text-[10px] ${isLight ? 'border-zinc-200' : 'border-white/8'}`}>
            <div>
              <div className="text-neutral-500">Power range</div>
              <div className={isLight ? 'text-red-600' : 'text-red-400'}>S{paramSnapshot.powerMin}–S{paramSnapshot.powerMax}</div>
              <div className="text-neutral-500">({pctString(paramSnapshot.powerMin)}–{pctString(paramSnapshot.powerMax)})</div>
            </div>
            <div>
              <div className="text-neutral-500">Speed range</div>
              <div className={isLight ? 'text-red-600' : 'text-red-400'}>F{paramSnapshot.speedMin}–F{paramSnapshot.speedMax}</div>
            </div>
            <div>
              <div className="text-neutral-500">Z range</div>
              <div className={isLight ? 'text-red-600' : 'text-red-400'}>{paramSnapshot.zMin}–{paramSnapshot.zMax}mm</div>
            </div>
          </div>
        </div>

        {/* Optimal values form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Optimal Settings Found</div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={`block mb-1 text-[10px] label-caps ${isLight ? 'text-zinc-500' : 'text-[#888]'}`}>Power (S)</label>
              <input
                id="quicklog-power"
                type="number"
                min="0"
                max={pwmMax}
                value={optPower}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setOptPower(!isNaN(val) && val >= 0 ? val : midPower);
                }}
                className="w-full elegant-input rounded-md px-2 py-1.5 text-sm font-mono"
                autoFocus
              />
              <div className="text-[9px] text-neutral-500 mt-0.5">{pctString(optPower)} of max</div>
            </div>
            <div>
              <label className={`block mb-1 text-[10px] label-caps ${isLight ? 'text-zinc-500' : 'text-[#888]'}`}>Speed (F)</label>
              <input
                id="quicklog-speed"
                type="number"
                min="1"
                value={optSpeed}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setOptSpeed(!isNaN(val) && val >= 1 ? val : midSpeed);
                }}
                className="w-full elegant-input rounded-md px-2 py-1.5 text-sm font-mono"
              />
              <div className="text-[9px] text-neutral-500 mt-0.5">mm/min</div>
            </div>
            <div>
              <label className={`block mb-1 text-[10px] label-caps ${isLight ? 'text-zinc-500' : 'text-[#888]'}`}>Focus Z (mm)</label>
              <input
                id="quicklog-z"
                type="number"
                step="0.1"
                value={optZ}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setOptZ(!isNaN(val) ? val : midZ);
                }}
                className="w-full elegant-input rounded-md px-2 py-1.5 text-sm font-mono"
              />
              <div className="text-[9px] text-neutral-500 mt-0.5">bed offset</div>
            </div>
          </div>

          <div>
            <label className={`block mb-1 text-[10px] label-caps ${isLight ? 'text-zinc-500' : 'text-[#888]'}`}>Observations</label>
            <textarea
              id="quicklog-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. S150 at F1000 gave clean dark engraving with minimal ash; S220 cut through cleanly at F400."
              className="w-full elegant-input rounded-md px-2 py-1.5 text-xs placeholder:text-neutral-500"
            />
          </div>

          <div className={`flex justify-between items-center gap-2 pt-2 border-t ${isLight ? 'border-zinc-200' : 'border-white/8'}`}>
            <div className="flex items-center gap-1 text-[10px] text-neutral-500 font-mono">
              <Calendar className="w-3 h-3" />
              {new Date().toISOString().substring(0, 10)}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer transition ${isLight ? 'text-zinc-600 hover:text-black' : 'text-[#888] hover:text-white'}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                id="quicklog-save-btn"
                className="bg-red-600 hover:bg-red-500 text-black px-4 py-1.5 rounded font-bold text-xs tracking-tight transition cursor-pointer shadow-[0_0_10px_rgba(220,38,38,0.3)]"
              >
                Save to Material Log
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
