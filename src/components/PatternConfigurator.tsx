import React, { useEffect, useRef } from 'react';
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
  const patternStore = usePatternStore();
  const machine = useMachineStore(selectActiveMachine);
  const isFocusLadder = patternStore.selectedPattern === 'focus_ladder';
  const prevPatternRef = useRef(patternStore.selectedPattern);

  useEffect(() => {
    if (isFocusLadder && prevPatternRef.current !== 'focus_ladder' && machine) {
      patternStore.setZMin(machine.zFocused - 5);
      patternStore.setZMax(machine.zFocused + 5);
    }
    prevPatternRef.current = patternStore.selectedPattern;
  }, [isFocusLadder, machine, patternStore]);

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
            const isActive = patternStore.selectedPattern === pat.id;
            return (
              <button
                key={pat.id}
                onClick={() => patternStore.setPatternType(pat.id)}
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
          {isFocusLadder ? (
            <>
              <ParameterField
                label="Power"
                id="pwr-min"
                min={0}
                max={machine?.pwmMax || 255}
                value={patternStore.powerMin}
                onChange={patternStore.setPowerMin}
              />
              <ParameterField
                label="Engraving Speed"
                id="spd-min"
                min={100}
                max={machine?.travelSpeed || 5000}
                value={patternStore.speedMin}
                onChange={patternStore.setSpeedMin}
                unit="F"
              />
            </>
          ) : (
            <>
              <ParameterField
                label="Min Power"
                id="pwr-min"
                min={0}
                max={patternStore.powerMax - 1}
                value={patternStore.powerMin}
                onChange={patternStore.setPowerMin}
              />
              <ParameterField
                label="Max Power"
                id="pwr-max"
                min={patternStore.powerMin + 1}
                max={machine?.pwmMax || 255}
                value={patternStore.powerMax}
                onChange={patternStore.setPowerMax}
              />

              {patternStore.selectedPattern === 'matrix' && (
                <ParameterField
                  label="Power Steps"
                  id="pwr-steps"
                  min={2}
                  max={10}
                  value={patternStore.powerSteps}
                  onChange={patternStore.setPowerSteps}
                />
              )}

              <div className="my-4 border-t border-white/5" />

              <ParameterField
                label="Min Speed"
                id="spd-min"
                min={100}
                max={patternStore.speedMax - 1}
                value={patternStore.speedMin}
                onChange={patternStore.setSpeedMin}
                unit="F"
              />
              <ParameterField
                label="Max Speed"
                id="spd-max"
                min={patternStore.speedMin + 1}
                max={machine?.travelSpeed || 5000}
                value={patternStore.speedMax}
                onChange={patternStore.setSpeedMax}
                unit="F"
              />

              {(patternStore.selectedPattern === 'matrix' || patternStore.selectedPattern === 'speed_ramp') && (
                <ParameterField
                  label="Speed Steps"
                  id="spd-steps"
                  min={2}
                  max={10}
                  value={patternStore.speedSteps}
                  onChange={patternStore.setSpeedSteps}
                />
              )}
            </>
          )}

          <div className="my-4 border-t border-white/5" />

          <ParameterField
            label="Pattern Size"
            id="blk-size"
            min={1}
            max={30}
            value={patternStore.blockSize}
            onChange={patternStore.setBlockSize}
            unit="mm"
          />
          <ParameterField
            label="Text Size"
            id="txt-size"
            min={1}
            max={15}
            value={patternStore.textSize}
            onChange={patternStore.setTextSize}
            unit="mm"
          />

          {isFocusLadder && (
            <>
              <div className="my-4 border-t border-white/5" />

              <ParameterField
                label="MinWorkZ"
                id="z-min"
                min={-20}
                max={patternStore.zMax - 0.1}
                step={0.1}
                value={patternStore.zMin}
                onChange={patternStore.setZMin}
                unit="mm"
              />
              <ParameterField
                label="MaxWorkZ"
                id="z-max"
                min={patternStore.zMin + 0.1}
                max={20}
                step={0.1}
                value={patternStore.zMax}
                onChange={patternStore.setZMax}
                unit="mm"
              />
              <ParameterField
                label="Steps Count"
                id="z-steps"
                min={2}
                max={20}
                value={patternStore.zSteps}
                onChange={patternStore.setZSteps}
              />
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default PatternConfigurator;
