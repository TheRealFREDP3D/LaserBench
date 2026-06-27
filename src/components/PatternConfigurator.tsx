import React from 'react';
import { PatternType } from '../types';
import { usePatternStore } from '../store/usePatternStore';
import { useMachineStore, selectActiveMachine } from '../store/useMachineStore';
import { ParameterField } from './ParameterField';
import { Sliders, Zap, Gauge, Layers, Move } from 'lucide-react';

const PATTERNS: { id: PatternType; label: string; icon: typeof Sliders }[] = [
  { id: 'matrix', label: 'Power-Speed Matrix', icon: Sliders },
  { id: 'power_ramp', label: 'Power Ramp', icon: Zap },
  { id: 'speed_ramp', label: 'Speed Ramp', icon: Gauge },
  { id: 'focus_ladder', label: 'Focus Ladder', icon: Layers },
  { id: 'kerf_test', label: 'Kerf Test Comb', icon: Move },
];

const PatternConfigurator: React.FC = () => {
  const p = usePatternStore();
  const machine = useMachineStore(selectActiveMachine);

  return (
    <div className="space-y-6" data-tour="pattern-config">
      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500 mb-4 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
          Select Pattern
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {PATTERNS.map((pat) => {
            const Icon = pat.icon;
            const isActive = p.selectedPattern === pat.id;
            return (
              <button
                key={pat.id}
                onClick={() => p.setPatternType(pat.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                  isActive
                    ? 'bg-red-950/20 border-red-500/50 text-white shadow-[0_0_15px_rgba(220,38,38,0.1)]'
                    : 'bg-[#111] border-white/5 text-neutral-500 hover:border-white/10 hover:text-neutral-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-red-500' : ''}`} />
                <span className="text-xs font-semibold">{pat.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="bg-[#0D0D0D] rounded-xl border border-white/5 p-4">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 mb-4">
          Parameters
        </h3>
        <div className="space-y-1">
          <ParameterField
            label="Min Power"
            id="pwr-min"
            min={0}
            max={p.powerMax - 1}
            value={p.powerMin}
            onChange={p.setPowerMin}
          />
          <ParameterField
            label="Max Power"
            id="pwr-max"
            min={p.powerMin + 1}
            max={machine?.pwmMax || 255}
            value={p.powerMax}
            onChange={p.setPowerMax}
          />

          {p.selectedPattern === 'matrix' && (
            <ParameterField
              label="Power Steps"
              id="pwr-steps"
              min={2}
              max={10}
              value={p.powerSteps}
              onChange={p.setPowerSteps}
            />
          )}

          <div className="my-4 border-t border-white/5" />

          <ParameterField
            label="Min Speed"
            id="spd-min"
            min={100}
            max={p.speedMax - 1}
            value={p.speedMin}
            onChange={p.setSpeedMin}
            unit="F"
          />
          <ParameterField
            label="Max Speed"
            id="spd-max"
            min={p.speedMin + 1}
            max={machine?.travelSpeed || 5000}
            value={p.speedMax}
            onChange={p.setSpeedMax}
            unit="F"
          />

          {(p.selectedPattern === 'matrix' || p.selectedPattern === 'speed_ramp') && (
            <ParameterField
              label="Speed Steps"
              id="spd-steps"
              min={2}
              max={10}
              value={p.speedSteps}
              onChange={p.setSpeedSteps}
            />
          )}

          <div className="my-4 border-t border-white/5" />

          <ParameterField
            label="Pattern Size"
            id="blk-size"
            min={1}
            max={30}
            value={p.blockSize}
            onChange={p.setBlockSize}
            unit="mm"
          />
          <ParameterField
            label="Text Size"
            id="txt-size"
            min={1}
            max={15}
            value={p.textSize}
            onChange={p.setTextSize}
            unit="mm"
          />
        </div>
      </section>
    </div>
  );
};

export default PatternConfigurator;
