import { memo } from 'react';
import { PatternType } from '../types';
import { Zap, Gauge, Grid3X3, Focus, Sliders, Scissors } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import DebouncedRange from './DebouncedRange';
import { useTheme } from '../lib/themeContext';

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
  blockSize: number;
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
  onSetBlockSize: (v: number) => void;
}

export default memo(function PatternConfigurator({
  selectedPattern,
  onSelectPattern,
  powerMin,
  powerMax,
  speedMin,
  speedMax,
  powerSteps,
  speedSteps,
  blockSize,
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
  onSetBlockSize,
}: PatternConfiguratorProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const patterns: { type: PatternType; name: string; desc: string; icon: LucideIcon; colorClass: string }[] = [
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
    <div id="pattern-configurator-card" className={`border rounded-lg p-3 shadow-sm space-y-3 transition-all duration-200 overflow-y-auto ${
      isLight 
        ? 'bg-white border-zinc-200 text-zinc-800' 
        : 'bg-[#0F0F0F] border-white/10 text-[#E8E8E8]'
    }`}>
      <div className="flex items-center gap-2">
        <Sliders className="text-red-500 w-4 h-4" />
        <h2 className={`text-xs font-semibold tracking-wide uppercase font-sans ${isLight ? 'text-zinc-800' : 'text-white'}`}>Calibration Patterns</h2>
      </div>

      {/* Pattern Selector Cards */}
      <div className="grid grid-cols-1 gap-1.5">
        {patterns.map((pat) => {
          const Icon = pat.icon;
          const isSelected = selectedPattern === pat.type;
          
          let tailoredColorClass = "";
          if (isSelected) {
            tailoredColorClass = isLight 
              ? "text-red-600 bg-red-50 border-red-200" 
              : "text-red-400 bg-red-950/25 border-red-900/50";
          } else {
            tailoredColorClass = isLight
              ? "text-zinc-500 bg-zinc-100 border-zinc-200"
              : "text-neutral-400 bg-[#1A1A1A] border-white/8";
          }

          return (
            <button
              key={pat.type}
              id={`pattern-card-${pat.type}`}
              onClick={() => onSelectPattern(pat.type)}
              className={`w-full text-left px-2.5 py-2 rounded border transition-all duration-200 flex items-start gap-2.5 cursor-pointer ${
                isSelected
                  ? isLight
                    ? 'bg-red-50/40 border-red-500 ring-1 ring-red-200 shadow-sm text-zinc-900'
                    : 'bg-[#1A1A1A] border-red-600/80 ring-1 ring-red-600/20 shadow-md text-[#E8E8E8]'
                  : isLight
                    ? 'bg-zinc-50 border-zinc-200 text-zinc-800 hover:bg-zinc-100 hover:border-zinc-300'
                    : 'bg-[#080808] border-white/8 hover:border-white/12 text-[#E8E8E8]'
              }`}
            >
              <div className={`p-1.5 rounded ${tailoredColorClass} border shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className={`text-[11px] font-bold ${isLight ? 'text-zinc-850' : 'text-[#E8E8E8]'}`}>{pat.name}</h3>
                  {isSelected && (
                    <span className={`border text-[8px] px-1 py-0.5 rounded font-mono uppercase font-bold tracking-wider select-none animate-pulse ${
                      isLight 
                        ? 'bg-red-100 border-red-300 text-red-600' 
                        : 'bg-red-950/60 border border-red-800 text-red-400'
                    }`}>
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className={`text-[10px] mt-0.5 leading-snug ${isLight ? 'text-zinc-500' : 'text-neutral-400'}`}>{pat.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Dynamic parameters depending on the selected pattern */}
      <div id="pattern-parameters-form" className={`p-2.5 rounded border space-y-3 transition-all duration-200 ${
        isLight ? 'bg-zinc-50/55 border-zinc-200' : 'bg-[#1A1A1A] border-white/8'
      }`}>
        <h3 className={`text-[11px] font-semibold border-b pb-1 flex justify-between items-center ${
          isLight ? 'text-zinc-800 border-zinc-200' : 'text-white border-white/8'
        }`}>
          <span>Pattern Settings</span>
          <span className={`text-[9px] uppercase tracking-widest font-mono ${isLight ? 'text-zinc-400' : 'text-neutral-500'}`}>Configure Grid Parameters</span>
        </h3>

        {/* Universal Block Size Setting */}
        <div id="general-block-size-setting" className={`space-y-1 pb-2 border-b ${isLight ? 'border-zinc-200' : 'border-white/8'}`}>
          <div className="flex items-center justify-between text-xs">
            <span className={`font-bold ${isLight ? 'text-zinc-700' : 'text-neutral-300'}`}>Geometric Block Size</span>
            <span id="pattern-blocksize-label" className="font-mono text-red-500 font-bold">
              {blockSize} mm
            </span>
          </div>
          <div className="flex items-center gap-3">
            <DebouncedRange
              id="pattern-blocksize-slider"
              min={5}
              max={30}
              step={1}
              value={blockSize}
              onChange={onSetBlockSize}
              ariaLabel="Block size"
              className={`flex-1 h-1 rounded-md appearance-none accent-red-650 cursor-pointer ${isLight ? 'bg-zinc-200' : 'bg-[#222]'}`}
            />
            <span id="block-size-val" className={`border px-2 py-0.5 rounded font-mono text-xs min-w-[32px] text-center ${
              isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-700' : 'bg-[#080808] border-white/10 text-neutral-300'
            }`}>
              {blockSize}
            </span>
          </div>
          <p className={`text-[10px] leading-snug italic ${isLight ? 'text-zinc-500' : 'text-neutral-500'}`}>
            Defines the individual cell size or line scaling dimensions of the calibration pattern.
          </p>
        </div>

        {(selectedPattern === 'matrix' || selectedPattern === 'power_ramp' || selectedPattern === 'speed_ramp') && (
          <div className="space-y-3">
            {/* Power Range */}
            {(selectedPattern === 'matrix' || selectedPattern === 'power_ramp') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-bold ${isLight ? 'text-zinc-700' : 'text-neutral-300'}`}>Power Output Range (PWM)</span>
                  <span id="power-range-label" className="font-mono text-red-500 font-bold">
                    S{powerMin} ({pctString(powerMin)}) - S{powerMax} ({pctString(powerMax)})
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-[10px] block mb-0.5 label-caps ${isLight ? 'text-zinc-500' : 'text-[#888]'}`}>Min Power S</label>
                    <DebouncedRange
                      id="pattern-powermin-slider"
                      min={1}
                      max={powerMax - 1}
                      value={powerMin}
                      onChange={onSetPowerMin}
                      ariaLabel="Minimum power"
                      className={`w-full h-1 rounded-md appearance-none accent-red-650 cursor-pointer ${isLight ? 'bg-zinc-200' : 'bg-[#222]'}`}
                    />
                  </div>
                  <div>
                    <label className={`text-[10px] block mb-0.5 label-caps ${isLight ? 'text-zinc-500' : 'text-[#888]'}`}>Max Power S</label>
                    <DebouncedRange
                      id="pattern-powermax-slider"
                      min={powerMin + 1}
                      max={pwmMax}
                      value={powerMax}
                      onChange={onSetPowerMax}
                      ariaLabel="Maximum power"
                      className={`w-full h-1 rounded-md appearance-none accent-red-650 cursor-pointer ${isLight ? 'bg-zinc-200' : 'bg-[#222]'}`}
                    />
                  </div>
                </div>

                {selectedPattern === 'matrix' && (
                  <div>
                    <label className={`text-[10px] block mb-1 label-caps ${isLight ? 'text-zinc-500' : 'text-[#888]'}`}>Power Grid Columns</label>
                    <div className="flex items-center gap-2">
                      <DebouncedRange
                        id="pattern-powersteps-slider"
                        min={2}
                        max={8}
                        value={powerSteps}
                        onChange={onSetPowerSteps}
                        ariaLabel="Power grid columns"
                        className={`flex-1 h-1 rounded-md appearance-none accent-red-650 cursor-pointer ${isLight ? 'bg-zinc-200' : 'bg-[#222]'}`}
                      />
                      <span id="power-steps-val" className={`border px-2 py-0.5 rounded font-mono text-xs min-w-[28px] text-center ${
                        isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-700' : 'bg-[#080808] border-white/10 text-neutral-300'
                      }`}>
                        {powerSteps}
                      </span>
                    </div>
                  </div>
                )}
                {selectedPattern === 'power_ramp' && (
                  <div>
                    <label className={`text-[10px] block mb-1 label-caps ${isLight ? 'text-zinc-500' : 'text-[#888]'}`}>Calibration Blocks (Steps)</label>
                    <div className="flex items-center gap-2">
                      <DebouncedRange
                        id="power-ramp-steps-slider"
                        min={3}
                        max={10}
                        value={powerSteps}
                        onChange={onSetPowerSteps}
                        ariaLabel="Power ramp calibration blocks"
                        className={`flex-1 h-1 rounded-md appearance-none accent-red-650 cursor-pointer ${isLight ? 'bg-zinc-200' : 'bg-[#222]'}`}
                      />
                      <span id="power-ramp-steps-val" className={`border px-2 py-0.5 rounded font-mono text-xs min-w-[28px] text-center ${
                        isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-700' : 'bg-[#080808] border-white/10 text-neutral-300'
                      }`}>
                        {powerSteps}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Speed Range */}
            {(selectedPattern === 'matrix' || selectedPattern === 'speed_ramp') && (
              <div className={`space-y-2 border-t pt-3 ${isLight ? 'border-zinc-200' : 'border-white/8'}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-bold ${isLight ? 'text-zinc-700' : 'text-neutral-300'}`}>Feedrate Range (mm/min)</span>
                  <span id="speed-range-label" className="font-mono text-red-500 font-bold">
                    F{speedMin} - F{speedMax} mm/m
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-[10px] block mb-0.5 label-caps ${isLight ? 'text-zinc-500' : 'text-[#888]'}`}>Min Speed (F)</label>
                    <input
                      id="pattern-speedmin-input"
                      type="number"
                      step="100"
                      min="50"
                      max={speedMax - 1}
                      value={speedMin}
                      onChange={(e) => onSetSpeedMin(Math.max(50, Math.min(speedMax - 1, parseInt(e.target.value, 10) || 50)))}
                      className={`w-full elegant-input px-2 py-1 outline-none text-xs rounded border ${
                        isLight ? 'bg-white border-zinc-300 text-zinc-800' : ''
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`text-[10px] block mb-0.5 label-caps ${isLight ? 'text-zinc-500' : 'text-[#888]'}`}>Max Speed (F)</label>
                    <input
                      id="pattern-speedmax-input"
                      type="number"
                      step="100"
                      min={speedMin + 1}
                      value={speedMax}
                      onChange={(e) => onSetSpeedMax(Math.max(speedMin + 1, parseInt(e.target.value, 10) || 2000))}
                      className={`w-full elegant-input px-2 py-1 outline-none text-xs rounded border ${
                        isLight ? 'bg-white border-zinc-300 text-zinc-800' : ''
                      }`}
                    />
                  </div>
                </div>

                {selectedPattern === 'matrix' && (
                  <div>
                    <label className={`text-[10px] block mb-1 label-caps ${isLight ? 'text-zinc-500' : 'text-[#888]'}`}>Speed Grid Rows</label>
                    <div className="flex items-center gap-2">
                      <DebouncedRange
                        id="pattern-speedsteps-slider"
                        min={2}
                        max={8}
                        value={speedSteps}
                        onChange={onSetSpeedSteps}
                        ariaLabel="Speed grid rows"
                        className={`flex-1 h-1 rounded-md appearance-none accent-red-650 cursor-pointer ${isLight ? 'bg-zinc-200' : 'bg-[#222]'}`}
                      />
                      <span id="speed-steps-val" className={`border px-2 py-0.5 rounded font-mono text-xs min-w-[28px] text-center ${
                        isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-700' : 'bg-[#080808] border-white/10 text-neutral-300'
                      }`}>
                        {speedSteps}
                      </span>
                    </div>
                  </div>
                )}
                {selectedPattern === 'speed_ramp' && (
                  <div>
                    <label className={`text-[10px] block mb-1 label-caps ${isLight ? 'text-zinc-500' : 'text-[#888]'}`}>Calibration Lines (Steps)</label>
                    <div className="flex items-center gap-2">
                      <DebouncedRange
                        id="speed-ramp-steps-slider"
                        min={3}
                        max={10}
                        value={speedSteps}
                        onChange={onSetSpeedSteps}
                        ariaLabel="Speed ramp calibration lines"
                        className={`flex-1 h-1 rounded-md appearance-none accent-red-650 cursor-pointer ${isLight ? 'bg-zinc-200' : 'bg-[#222]'}`}
                      />
                      <span id="speed-ramp-steps-val" className={`border px-2 py-0.5 rounded font-mono text-xs min-w-[28px] text-center ${
                        isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-700' : 'bg-[#080808] border-white/10 text-neutral-300'
                      }`}>
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
          <div className="space-y-3 text-xs font-sans">
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block">Ladder Z-Bounds</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`text-[10px] block mb-0.5 label-caps ${isLight ? 'text-zinc-500' : 'text-[#888]'}`}>Start Z (mm)</label>
                <input
                  id="pattern-zmin-input"
                  type="number"
                  min="0"
                  step="0.5"
                  value={zMin}
                  onChange={(e) => onSetZMin(Math.max(0, parseFloat(e.target.value) || 0))}
                  className={`w-full elegant-input px-2 py-1 text-xs rounded border ${
                    isLight ? 'bg-white border-zinc-300 text-zinc-800' : ''
                  }`}
                />
                <span className={`text-[9px] block ${isLight ? 'text-zinc-400' : 'text-[#666]'}`}>Lowest nozzle clearance</span>
              </div>
              <div>
                <label className={`text-[10px] block mb-0.5 label-caps ${isLight ? 'text-zinc-500' : 'text-[#888]'}`}>End Z (mm)</label>
                <input
                  id="pattern-zmax-input"
                  type="number"
                  min="0"
                  step="0.5"
                  value={zMax}
                  onChange={(e) => onSetZMax(Math.max(0, parseFloat(e.target.value) || 0))}
                  className={`w-full elegant-input px-2 py-1 text-xs rounded border ${
                    isLight ? 'bg-white border-zinc-300 text-zinc-800' : ''
                  }`}
                />
                <span className={`text-[9px] block ${isLight ? 'text-zinc-400' : 'text-[#666]'}`}>Highest nozzle clearance</span>
              </div>
            </div>

            <div>
              <label className={`text-[10px] block mb-1 label-caps ${isLight ? 'text-zinc-500' : 'text-[#888]'}`}>Z Increments (Test Lines)</label>
              <div className="flex items-center gap-2">
                <DebouncedRange
                  id="pattern-zsteps-slider"
                  min={3}
                  max={10}
                  value={zSteps}
                  onChange={onSetZSteps}
                  ariaLabel="Z increments"
                  className={`flex-1 h-1 rounded-md appearance-none accent-red-650 cursor-pointer ${isLight ? 'bg-zinc-200' : 'bg-[#222]'}`}
                />
                <span id="z-steps-val" className={`border px-2 py-0.5 rounded font-mono text-xs min-w-[28px] text-center ${
                  isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-700' : 'bg-[#080808] border-white/10 text-neutral-300'
                }`}>
                  {zSteps}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-neutral-500 italic leading-relaxed">
              *Caution: Ensure that your lowest test Z height does not collide the laser shield with your material sheet or bed mounts.
            </p>
          </div>
        )}

        {/* Kerf Test Comb Params */}
        {selectedPattern === 'kerf_test' && (
          <div className="space-y-3 text-xs font-sans">
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block">Kerf Dimensions</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={`text-[10px] block mb-0.5 label-caps ${isLight ? 'text-zinc-500' : 'text-[#888]'}`}>Nominal Thickness (mm)</label>
                <input
                  id="pattern-nominal-thickness-input"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={nominalThickness}
                  onChange={(e) => onSetNominalThickness(parseFloat(e.target.value) || 3.0)}
                  className={`w-full elegant-input px-2 py-1 text-xs rounded border ${
                    isLight ? 'bg-white border-zinc-300 text-zinc-800' : ''
                  }`}
                />
                <span className={`text-[9px] block ${isLight ? 'text-zinc-400' : 'text-[#666]'}`}>Matches typical sheet material thickness</span>
              </div>
              <div>
                <label className={`text-[10px] block mb-0.5 label-caps font-sans tracking-normal leading-normal ${isLight ? 'text-zinc-500' : 'text-[#888]'}`}>Clearance Spacings (Comma separated)</label>
                <input
                  id="pattern-kerf-values-input"
                  type="text"
                  value={kerfValues.map((v) => v.toFixed(2)).join(', ')}
                  onChange={(e) => {
                    const parsed = e.target.value
                      .split(',')
                      .map((item) => parseFloat(item.trim()))
                      .filter((val) => !isNaN(val));
                    if (parsed.length > 0) {
                      onSetKerfValues(parsed);
                    }
                  }}
                  className={`w-full elegant-input px-2 py-1 font-mono text-xs rounded border ${
                    isLight ? 'bg-white border-zinc-300 text-zinc-800' : ''
                  }`}
                />
                <span className={`text-[9px] block ${isLight ? 'text-zinc-400' : 'text-[#666]'}`}>Slots nominal width +- these offsets</span>
              </div>
            </div>

            <p className="text-[10px] text-neutral-500 leading-relaxed italic">
              *Slicing slots of varying sizes lets you physically test-fit your wood sheet inside the slots. The slot that holds the sheet securely without wobble yields the perfect slot correction offset.
            </p>
          </div>
        )}
      </div>
    </div>
  );
});
