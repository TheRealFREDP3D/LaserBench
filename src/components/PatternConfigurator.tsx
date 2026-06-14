import React from 'react';
import { PatternType } from '../types';
import { Zap, Play, ChevronRight, Gauge, Grid3X3, Focus, Sliders, Scissors } from 'lucide-react';

interface PatternConfiguratorProps {
  selectedPattern: PatternType;
  onSelectPattern: (pattern: PatternType) => void;
  // parameters
  powerMin: number;
  powerMax: number;
  speedMin: number;
  speedMax: number;
  powerSteps: number;
  speedSteps: number;
  // kerf
  nominalThickness: number;
  kerfValues: number[];
  // z ladder
  zMin: number;
  zMax: number;
  zSteps: number;
  // pwm max of active machine
  pwmMax: number;
  // setters
  onSetPowerMin: (v: number) => void;
  onSetPowerMax: (v: number) => void;
  onSetSpeedMin: (v: number) => void;
  onSetSpeedMax: (v: number) => void;
  onSetPowerSteps: (v: number) => void;
  onSetSpeedSteps: (v: number) => void;
  onSetNominalThickness: (v: number) => void;
  onSetKerfValues: (v: number[]) => void;
  onSetZMin: (v: number) => void;
  onSetZMax: (v: number) => void;
  onSetZSteps: (v: number) => void;
}

export default function PatternConfigurator({
  selectedPattern,
  onSelectPattern,
  powerMin,
  powerMax,
  speedMin,
  speedMax,
  powerSteps,
  speedSteps,
  nominalThickness,
  kerfValues,
  zMin,
  zMax,
  zSteps,
  pwmMax,
  onSetPowerMin,
  onSetPowerMax,
  onSetSpeedMin,
  onSetSpeedMax,
  onSetPowerSteps,
  onSetSpeedSteps,
  onSetNominalThickness,
  onSetKerfValues,
  onSetZMin,
  onSetZMax,
  onSetZSteps,
}: PatternConfiguratorProps) {
  const patterns: { type: PatternType; name: string; desc: string; icon: any; colorClass: string }[] = [
    {
      type: 'matrix',
      name: 'Power-Speed Matrix',
      desc: 'Hatched grid showing speed steps as rows and power levels as columns. Most critical test.',
      icon: Grid3X3,
      colorClass: 'text-indigo-400 bg-indigo-950/45 border-indigo-900/50',
    },
    {
      type: 'power_ramp',
      name: 'Power Ramp',
      desc: 'Row of horizontal swatches increasing in PWM power at a constant speed rate.',
      icon: Zap,
      colorClass: 'text-amber-400 bg-amber-950/45 border-amber-900/50',
    },
    {
      type: 'speed_ramp',
      name: 'Speed Ramp',
      desc: 'Stack of horizontal lines increasing feed speed at a constant PWM power level.',
      icon: Gauge,
      colorClass: 'text-sky-400 bg-sky-950/45 border-sky-900/50',
    },
    {
      type: 'focus_ladder',
      name: 'Focus Ladder Z-test',
      desc: 'Lines drawn with different Z bed elevation offsets to pinpoint absolute focal point.',
      icon: Focus,
      colorClass: 'text-purple-400 bg-purple-950/45 border-purple-900/50',
    },
    {
      type: 'kerf_test',
      name: 'Kerf Clearance Comb',
      desc: 'Cuts slots of varying dimensions relative to sheet thickness to determine material kerf.',
      icon: Scissors,
      colorClass: 'text-rose-400 bg-rose-950/45 border-rose-900/50',
    },
  ];

  const pctString = (val: number) => {
    return `${Math.round((val / pwmMax) * 100)}%`;
  };

  return (
    <div id="pattern-configurator-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm text-slate-100 space-y-5">
      <div className="flex items-center gap-2">
        <Sliders className="text-indigo-400 w-5 h-5" />
        <h2 className="text-sm font-semibold tracking-wide uppercase text-indigo-300">Calibration Patterns</h2>
      </div>

      {/* Pattern Selector Cards */}
      <div className="grid grid-cols-1 gap-2.5">
        {patterns.map((pat) => {
          const Icon = pat.icon;
          const isSelected = selectedPattern === pat.type;
          return (
            <button
              key={pat.type}
              id={`pattern-card-${pat.type}`}
              onClick={() => onSelectPattern(pat.type)}
              className={`w-full text-left p-3 rounded-lg border transition-all duration-200 flex items-start gap-3 ${
                isSelected
                  ? 'bg-slate-950 border-indigo-500/80 ring-1 ring-indigo-500/30 shadow-md'
                  : 'bg-slate-950/45 border-slate-850 hover:border-slate-750'
              }`}
            >
              <div className={`p-2 rounded-md ${pat.colorClass} border shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-200">{pat.name}</h3>
                  {isSelected && <span className="bg-indigo-900/75 border border-indigo-700 text-indigo-200 text-[9px] px-1.5 py-0.5 rounded-full font-mono uppercase font-bold tracking-wider float-right">ACTIVE</span>}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{pat.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Dynamic parameters depending on the selected pattern */}
      <div id="pattern-parameters-form" className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4">
        <h3 className="text-xs font-semibold text-slate-300 border-b border-slate-900 pb-1.5 flex justify-between items-center">
          <span>Pattern Settings</span>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Configure Grid Parameters</span>
        </h3>

        {(selectedPattern === 'matrix' || selectedPattern === 'power_ramp' || selectedPattern === 'speed_ramp') && (
          <div className="space-y-4">
            {/* Power Range */}
            {(selectedPattern === 'matrix' || selectedPattern === 'power_ramp') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Power Output Range (PWM)</span>
                  <span id="power-range-label" className="font-mono text-amber-400">
                    S{powerMin} ({pctString(powerMin)}) - S{powerMax} ({pctString(powerMax)})
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Min Power S</label>
                    <input
                      id="pattern-powermin-slider"
                      type="range"
                      min="1"
                      max={powerMax - 1}
                      value={powerMin}
                      onChange={(e) => onSetPowerMin(parseInt(e.target.value) || 10)}
                      className="w-full h-1 bg-slate-800 rounded-md appearance-none accent-slate-400 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Max Power S</label>
                    <input
                      id="pattern-powermax-slider"
                      type="range"
                      min={powerMin + 1}
                      max={pwmMax}
                      value={powerMax}
                      onChange={(e) => onSetPowerMax(parseInt(e.target.value) || 255)}
                      className="w-full h-1 bg-slate-800 rounded-md appearance-none accent-slate-400 cursor-pointer"
                    />
                  </div>
                </div>

                {selectedPattern === 'matrix' && (
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Power Grid Columns</label>
                    <div className="flex items-center gap-2">
                      <input
                        id="pattern-powersteps-slider"
                        type="range"
                        min="2"
                        max="8"
                        value={powerSteps}
                        onChange={(e) => onSetPowerSteps(parseInt(e.target.value) || 2)}
                        className="flex-1 h-1 bg-slate-800 rounded-md appearance-none accent-slate-400 cursor-pointer"
                      />
                      <span id="power-steps-val" className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded font-mono text-xs text-slate-300 min-w-[28px] text-center">
                        {powerSteps}
                      </span>
                    </div>
                  </div>
                )}
                {selectedPattern === 'power_ramp' && (
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Calibration Blocks (Steps)</label>
                    <div className="flex items-center gap-2">
                      <input
                        id="power-ramp-steps-slider"
                        type="range"
                        min="3"
                        max="10"
                        value={powerSteps}
                        onChange={(e) => onSetPowerSteps(parseInt(e.target.value) || 3)}
                        className="flex-1 h-1 bg-slate-800 rounded-md appearance-none accent-slate-400 cursor-pointer"
                      />
                      <span id="power-ramp-steps-val" className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded font-mono text-xs text-slate-300 min-w-[28px] text-center">
                        {powerSteps}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Speed Range */}
            {(selectedPattern === 'matrix' || selectedPattern === 'speed_ramp') && (
              <div className="space-y-2 border-t border-slate-900 pt-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Feedrate Range (mm/min)</span>
                  <span id="speed-range-label" className="font-mono text-sky-450">
                    F{speedMin} - F{speedMax} mm/m
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Min Speed (F)</label>
                    <input
                      id="pattern-speedmin-input"
                      type="number"
                      step="100"
                      min="50"
                      max={speedMax - 1}
                      value={speedMin}
                      onChange={(e) => onSetSpeedMin(parseInt(e.target.value) || 50)}
                      className="w-full bg-slate-800 border border-slate-705 px-2 py-1 text-slate-200 outline-none text-xs rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Max Speed (F)</label>
                    <input
                      id="pattern-speedmax-input"
                      type="number"
                      step="100"
                      min={speedMin + 1}
                      value={speedMax}
                      onChange={(e) => onSetSpeedMax(parseInt(e.target.value) || 2000)}
                      className="w-full bg-slate-800 border border-slate-705 px-2 py-1 text-slate-200 outline-none text-xs rounded"
                    />
                  </div>
                </div>

                {selectedPattern === 'matrix' && (
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Speed Grid Rows</label>
                    <div className="flex items-center gap-2">
                      <input
                        id="pattern-speedsteps-slider"
                        type="range"
                        min="2"
                        max="8"
                        value={speedSteps}
                        onChange={(e) => onSetSpeedSteps(parseInt(e.target.value) || 2)}
                        className="flex-1 h-1 bg-slate-800 rounded-md appearance-none accent-slate-400 cursor-pointer"
                      />
                      <span id="speed-steps-val" className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded font-mono text-xs text-slate-300 min-w-[28px] text-center">
                        {speedSteps}
                      </span>
                    </div>
                  </div>
                )}
                {selectedPattern === 'speed_ramp' && (
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Calibration Lines (Steps)</label>
                    <div className="flex items-center gap-2">
                      <input
                        id="speed-ramp-steps-slider"
                        type="range"
                        min="3"
                        max="10"
                        value={speedSteps}
                        onChange={(e) => onSetSpeedSteps(parseInt(e.target.value) || 3)}
                        className="flex-1 h-1 bg-slate-800 rounded-md appearance-none accent-slate-400 cursor-pointer"
                      />
                      <span id="speed-ramp-steps-val" className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded font-mono text-xs text-slate-300 min-w-[28px] text-center">
                        {speedSteps}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Focus Ladder Params */}
        {selectedPattern === 'focus_ladder' && (
          <div className="space-y-4 text-xs">
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">Ladder Z-Bounds</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Start Z (mm)</label>
                <input
                  id="pattern-zmin-input"
                  type="number"
                  step="0.5"
                  value={zMin}
                  onChange={(e) => onSetZMin(parseFloat(e.target.value) || -43)}
                  className="w-full bg-slate-800 border border-slate-700 px-2 py-1 text-slate-200 text-xs rounded"
                />
                <span className="text-[9px] text-slate-650 block">Lowest nozzle clearance</span>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">End Z (mm)</label>
                <input
                  id="pattern-zmax-input"
                  type="number"
                  step="0.5"
                  value={zMax}
                  onChange={(e) => onSetZMax(parseFloat(e.target.value) || -37)}
                  className="w-full bg-slate-800 border border-slate-700 px-2 py-1 text-slate-200 text-xs rounded"
                />
                <span className="text-[9px] text-slate-650 block">Highest nozzle clearance</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 block mb-1">Z Increments (Test Lines)</label>
              <div className="flex items-center gap-2">
                <input
                  id="pattern-zsteps-slider"
                  type="range"
                  min="3"
                  max="10"
                  value={zSteps}
                  onChange={(e) => onSetZSteps(parseInt(e.target.value) || 3)}
                  className="flex-1 h-1 bg-slate-800 rounded-md appearance-none accent-slate-400 cursor-pointer"
                />
                <span id="z-steps-val" className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded font-mono text-xs text-slate-350 min-w-[28px] text-center">
                  {zSteps}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 italic leading-relaxed">
              *Caution: Ensure that your lowest test Z height does not collide the laser shield with your material sheet or bed mounts.
            </p>
          </div>
        )}

        {/* Kerf Test Comb Params */}
        {selectedPattern === 'kerf_test' && (
          <div className="space-y-4 text-xs">
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">Kerf Dimensions</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Nominal Thickness (mm)</label>
                <input
                  id="pattern-nominal-thickness-input"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={nominalThickness}
                  onChange={(e) => onSetNominalThickness(parseFloat(e.target.value) || 3.0)}
                  className="w-full bg-slate-800 border border-slate-700 px-2 py-1 text-slate-200 text-xs rounded"
                />
                <span className="text-[9px] text-slate-650 block">Matches typical sheet material thickness</span>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 block mb-0.5">Clearance Spacings (Comma separated)</label>
                <input
                  id="pattern-kerf-values-input"
                  type="text"
                  value={kerfValues.map((v) => v.toFixed(2)).join(', ')}
                  onChange={(e) => {
                    // Split and parse float numbers
                    const parsed = e.target.value
                      .split(',')
                      .map((item) => parseFloat(item.trim()))
                      .filter((val) => !isNaN(val));
                    if (parsed.length > 0) {
                      onSetKerfValues(parsed);
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-700 px-2 py-1 text-slate-200 font-mono text-xs rounded"
                />
                <span className="text-[9px] text-slate-650 block">Slots nominal width +- these offsets</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 leading-relaxed italic">
              *Slicing slots of varying sizes lets you physically test-fit your wood sheet inside the slots. The slot that holds the sheet securely without wobble yields the perfect slot correction offset.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
