import { useState, useRef, useEffect } from 'react';
import { MachineProfile, FirmwareType } from '../types';
import { Plus, Trash2, Cpu, Triangle, ChevronDown } from 'lucide-react';
import { DEFAULT_DELTA_PARAMS } from '../lib/deltaKinematics';

export type SectionKey = 'laserCommands' | 'motionZ' | 'bedGeometry' | 'deltaKinematics';

interface MachineSelectorProps {
  machines: MachineProfile[];
  selectedMachineId: string;
  onSelectMachine: (id: string) => void;
  onUpdateMachine: (machine: MachineProfile) => void;
  onCreateMachine: (machine: MachineProfile) => void;
  onDeleteMachine: (id: string) => void;
  theme?: 'dark' | 'light';
}

const DEFAULT_COLLAPSED: Record<SectionKey, boolean> = {
  laserCommands: true,
  motionZ: true,
  bedGeometry: false,
  deltaKinematics: true,
};

export function applyToggles(
  initial: Record<SectionKey, boolean>,
  actions: SectionKey[]
): Record<SectionKey, boolean> {
  let state = { ...initial };
  for (const key of actions) {
    const next = { ...state, [key]: !state[key] };
    const anyExpanded = Object.values(next).some(v => !v);
    if (anyExpanded) {
      state = next;
    }
  }
  return state;
}

export default function MachineSelector({
  machines,
  selectedMachineId,
  onSelectMachine,
  onUpdateMachine,
  onCreateMachine,
  onDeleteMachine,
  theme = 'dark',
}: MachineSelectorProps) {
  const isLight = theme === 'light';
  const [isEditing, setIsEditing] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<SectionKey, boolean>>({ ...DEFAULT_COLLAPSED });
  const prevEditingRef = useRef(isEditing);

  const activeMachine = machines.find((m) => m.id === selectedMachineId) || machines[0];

  useEffect(() => {
    if (isEditing && !prevEditingRef.current) {
      setCollapsedSections({ ...DEFAULT_COLLAPSED });
    }
    prevEditingRef.current = isEditing;
  }, [isEditing]);

  const toggleSection = (key: SectionKey) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      const anyExpanded = Object.values(next).some((v) => !v);
      if (!anyExpanded) return prev;
      return next;
    });
  };

  const handleFieldChange = (field: keyof MachineProfile, value: any) => {
    if (!activeMachine) return;
    onUpdateMachine({ ...activeMachine, [field]: value });
  };

  const handleCreateNew = () => {
    const newId = `custom_machine_${Date.now()}`;
    const newMachine: MachineProfile = {
      id: newId,
      name: `My Custom Laser #${machines.length + 1}`,
      firmware: 'grbl',
      laserOn: 'M3 S{power}',
      laserOff: 'M5',
      pwmMax: 1000,
      safeZ: 5,
      workZ: 0,
      travelSpeed: 5000,
      bedShape: 'rectangular',
      bedWidth: 300,
      bedHeight: 300,
      originX: 0,
      originY: 0,
      acceleration: 1000,
      isDelta: false,
    };
    onCreateMachine(newMachine);
    onSelectMachine(newId);
    setIsEditing(true);
  };

  return (
    <div
      id="machine-selector-card"
      className={`border rounded-lg p-5 shadow-md transition-all duration-200 ${
        isEditing
          ? 'border-l-2 border-l-red-600 border-white/8'
          : isLight
            ? 'bg-white border-zinc-200 text-zinc-800'
            : 'bg-[#0E0E0E] text-[#E0E0E0] border-white/10'
      }`}
    >
      {/* ── Always-visible header ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cpu className="text-red-500 w-5 h-5" />
          <h2 className={`text-sm font-semibold tracking-wide uppercase font-sans ${isLight ? 'text-zinc-800' : 'text-white'}`}>
            Machine Profile
          </h2>
          {activeMachine?.isDelta && (
            <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border text-purple-400 bg-purple-950/30 border-purple-800/40">
              <Triangle className="w-2.5 h-2.5" /> DELTA
            </span>
          )}
        </div>
        <button
          id="toggle-edit-machine-btn"
          onClick={() => setIsEditing(!isEditing)}
          className={`px-3 py-1.5 text-xs font-bold rounded transition-all duration-200 cursor-pointer ${
            isEditing
              ? isLight
                ? 'bg-red-650 text-white hover:bg-red-700 shadow-sm'
                : 'bg-red-600 text-black hover:bg-red-500 accent-glow'
              : isLight
                ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200'
                : 'bg-[#222] text-[#AAA] hover:bg-[#333]'
          }`}
        >
          {isEditing ? 'Done Settings' : 'Edit Settings'}
        </button>
      </div>

      <div className="space-y-4">
        {/* Machine dropdown + New */}
        <div>
          <label className={`block mb-1 label-caps ${isLight ? 'text-zinc-500' : ''}`}>Active Machine Profile</label>
          <div className="flex gap-2">
            <select
              id="machine-profile-select"
              value={selectedMachineId}
              onChange={(e) => onSelectMachine(e.target.value)}
              className="flex-1 elegant-input rounded-md px-3 py-2 text-sm outline-none"
            >
              {machines.map((mac) => (
                <option key={mac.id} value={mac.id} className={isLight ? 'bg-white text-zinc-800' : 'bg-[#151515]'}>
                  {mac.name} ({mac.firmware.toUpperCase()}{mac.isDelta ? ' · Δ' : ''})
                </option>
              ))}
            </select>
            <button
              id="new-machine-btn"
              onClick={handleCreateNew}
              title="Add new machine profile"
              className={`px-3.5 py-2 rounded-md text-sm flex items-center justify-center transition cursor-pointer border ${
                isLight
                  ? 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200'
                  : 'bg-[#222] text-[#E0E0E0] border-white/10 hover:bg-[#333]'
              }`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Machine identity info — always visible in header */}
        {activeMachine && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" data-testid="machine-identity-info">
            <span className={`font-medium ${isLight ? 'text-zinc-800' : 'text-white'}`} data-testid="machine-header-name">
              {activeMachine.name}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                isLight
                  ? 'border-zinc-300 text-zinc-600'
                  : 'border-white/10 text-neutral-400'
              }`}
              data-testid="machine-header-firmware"
            >
              {activeMachine.firmware}
            </span>
            <span className={isLight ? 'text-zinc-500' : 'text-neutral-500'} data-testid="machine-header-pwm">
              PWM: {activeMachine.pwmMax}
            </span>
          </div>
        )}

        {/* Delete profile — always visible when multiple machines exist */}
        {machines.length > 1 && (
          <div className="flex justify-start">
            <button
              id="delete-machine-btn"
              type="button"
              onClick={() => {
                if (window.confirm("Are you sure you want to delete this profile?")) {
                  onDeleteMachine(activeMachine.id);
                  setIsEditing(false);
                }
              }}
              className="text-red-500 hover:text-red-400 text-xs flex items-center gap-1 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Custom Profile
            </button>
          </div>
        )}

        {/* ── Editor ── */}
        {isEditing && activeMachine && (
          <div
            id="machine-config-editor-form"
            className={`border-t pt-3 mt-3 space-y-3 text-xs ${
              isLight ? 'border-zinc-200 text-zinc-800' : 'border-white/8 text-slate-300'
            }`}
          >
            {/* Name / Firmware / PWM — outside collapsible sections */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block mb-1 label-caps">Rename Profile</label>
                <input
                  id="machine-name-input"
                  type="text"
                  value={activeMachine.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="w-full elegant-input rounded-md px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block mb-1 label-caps">Firmware Dialect</label>
                <select
                  id="machine-firmware-select"
                  value={activeMachine.firmware}
                  onChange={(e) => {
                    const fw = e.target.value as FirmwareType;
                    const defaults =
                      fw === 'marlin'
                        ? { laserOn: 'M106 S{power}', laserOff: 'M107', pwmMax: 255 }
                        : { laserOn: 'M3 S{power}', laserOff: 'M5', pwmMax: 1000 };
                    onUpdateMachine({ ...activeMachine, firmware: fw, ...defaults });
                  }}
                  className="w-full elegant-input rounded-md px-2 py-1.5"
                >
                  <option value="grbl" className={isLight ? 'bg-white text-zinc-800' : 'bg-[#151515]'}>GRBL ($32 mode)</option>
                  <option value="marlin" className={isLight ? 'bg-white text-zinc-800' : 'bg-[#151515]'}>Marlin Fan PWM</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 label-caps">PWM Range (Max S)</label>
                <input
                  id="machine-pwm-input"
                  type="number"
                  min="1"
                  max="10000"
                  value={activeMachine.pwmMax}
                  onChange={(e) => handleFieldChange('pwmMax', parseInt(e.target.value) || 255)}
                  className="w-full elegant-input rounded-md px-2 py-1.5"
                />
              </div>
            </div>

            {/* ── Laser Commands section ── */}
            <div className="border-t border-white/5">
              <button
                aria-expanded={!collapsedSections.laserCommands}
                aria-controls="section-laserCommands"
                onClick={() => toggleSection('laserCommands')}
                className={`w-full flex items-center justify-between py-3 px-0 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                  isLight ? 'text-zinc-500 hover:text-zinc-800' : 'text-[#888] hover:text-white'
                }`}
              >
                <span>Laser Commands</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collapsedSections.laserCommands ? '' : 'rotate-180'}`} />
              </button>
              <div id="section-laserCommands" data-testid="section-laserCommands" className={collapsedSections.laserCommands ? 'hidden' : 'space-y-3 pb-3'}>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block mb-1 label-caps">Laser On G-code</label>
                    <input
                      id="machine-laseron-input"
                      type="text"
                      placeholder="M3 S{power}"
                      value={activeMachine.laserOn}
                      onChange={(e) => handleFieldChange('laserOn', e.target.value)}
                      className="w-full elegant-input rounded-md px-2.5 py-1.5 mono"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 label-caps">Laser Off G-code</label>
                    <input
                      id="machine-laseroff-input"
                      type="text"
                      placeholder="M5"
                      value={activeMachine.laserOff}
                      onChange={(e) => handleFieldChange('laserOff', e.target.value)}
                      className="w-full elegant-input rounded-md px-2.5 py-1.5 mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Motion & Z section ── */}
            <div className="border-t border-white/5">
              <button
                aria-expanded={!collapsedSections.motionZ}
                aria-controls="section-motionZ"
                onClick={() => toggleSection('motionZ')}
                className={`w-full flex items-center justify-between py-3 px-0 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                  isLight ? 'text-zinc-500 hover:text-zinc-800' : 'text-[#888] hover:text-white'
                }`}
              >
                <span>Motion & Z</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collapsedSections.motionZ ? '' : 'rotate-180'}`} />
              </button>
              <div id="section-motionZ" data-testid="section-motionZ" className={collapsedSections.motionZ ? 'hidden' : 'space-y-3 pb-3'}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <label className="block mb-1 label-caps">Safe Z (mm)</label>
                    <input id="machine-safez-input" type="number" step="0.5" value={activeMachine.safeZ}
                      onChange={(e) => handleFieldChange('safeZ', parseFloat(e.target.value) || 0)}
                      className="w-full elegant-input rounded-md px-2 py-1.5" />
                  </div>
                  <div>
                    <label className="block mb-1 label-caps">Work Z (mm)</label>
                    <input id="machine-workz-input" type="number" step="0.5" value={activeMachine.workZ}
                      onChange={(e) => handleFieldChange('workZ', parseFloat(e.target.value) || 0)}
                      className="w-full elegant-input rounded-md px-2 py-1.5" />
                  </div>
                  <div>
                    <label className="block mb-1 label-caps">Travel (mm/m)</label>
                    <input id="machine-travelspeed-input" type="number" min="100" step="100" value={activeMachine.travelSpeed}
                      onChange={(e) => handleFieldChange('travelSpeed', parseInt(e.target.value) || 3000)}
                      className="w-full elegant-input rounded-md px-2 py-1.5" />
                  </div>
                  <div>
                    <label className="block mb-1 label-caps">Acc (mm/s²)</label>
                    <input id="machine-acceleration-input" type="number" min="50" step="50" value={activeMachine.acceleration ?? 1000}
                      onChange={(e) => handleFieldChange('acceleration', parseInt(e.target.value) || 1000)}
                      className="w-full elegant-input rounded-md px-2 py-1.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Bed Geometry section ── */}
            <div className="border-t border-white/5">
              <button
                aria-expanded={!collapsedSections.bedGeometry}
                aria-controls="section-bedGeometry"
                onClick={() => toggleSection('bedGeometry')}
                className={`w-full flex items-center justify-between py-3 px-0 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                  isLight ? 'text-zinc-500 hover:text-zinc-800' : 'text-[#888] hover:text-white'
                }`}
              >
                <span>Bed Geometry</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collapsedSections.bedGeometry ? '' : 'rotate-180'}`} />
              </button>
              <div id="section-bedGeometry" data-testid="section-bedGeometry" className={collapsedSections.bedGeometry ? 'hidden' : 'space-y-3 pb-3'}>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block mb-1 label-caps">Bed Shape</label>
                    <select id="machine-bedshape-select" value={activeMachine.bedShape}
                      onChange={(e) => handleFieldChange('bedShape', e.target.value)}
                      className="w-full elegant-input rounded-md px-2 py-1.5">
                      <option value="rectangular" className={isLight ? 'bg-white text-zinc-800' : 'bg-[#151515]'}>Rect (X/Y)</option>
                      <option value="circular" className={isLight ? 'bg-white text-zinc-800' : 'bg-[#151515]'}>Delta (Circ)</option>
                    </select>
                  </div>
                  {activeMachine.bedShape === 'circular' ? (
                    <div className="col-span-2">
                      <label className="block mb-1 label-caps">Bed Radius (mm)</label>
                      <input id="machine-bedwidth-radius-input" type="number" min="10" value={activeMachine.bedWidth}
                        onChange={(e) => handleFieldChange('bedWidth', parseInt(e.target.value) || 100)}
                        className="w-full elegant-input rounded-md px-2 py-1.5" />
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block mb-1 label-caps">Width X (mm)</label>
                        <input id="machine-bedwidth-rectangular-input" type="number" min="10" value={activeMachine.bedWidth}
                          onChange={(e) => handleFieldChange('bedWidth', parseInt(e.target.value) || 200)}
                          className="w-full elegant-input rounded-md px-2 py-1.5" />
                      </div>
                      <div>
                        <label className="block mb-1 label-caps">Height Y (mm)</label>
                        <input id="machine-bedheight-input" type="number" min="10" value={activeMachine.bedHeight}
                          onChange={(e) => handleFieldChange('bedHeight', parseInt(e.target.value) || 200)}
                          className="w-full elegant-input rounded-md px-2 py-1.5" />
                      </div>
                    </>
                  )}
                </div>
                {/* Origin */}
                <div className={`grid grid-cols-2 gap-2 ${isLight ? 'border-zinc-200' : 'border-white/8'}`}>
                  <div>
                    <label className="block mb-1 label-caps">Origin X Coord (mm)</label>
                    <input id="machine-originx-input" type="number" placeholder="0" value={activeMachine.originX ?? 0}
                      onChange={(e) => handleFieldChange('originX', parseInt(e.target.value) || 0)}
                      className="w-full elegant-input rounded-md px-2 py-1.5" />
                  </div>
                  <div>
                    <label className="block mb-1 label-caps">Origin Y Coord (mm)</label>
                    <input id="machine-originy-input" type="number" placeholder="0" value={activeMachine.originY ?? 0}
                      onChange={(e) => handleFieldChange('originY', parseInt(e.target.value) || 0)}
                      className="w-full elegant-input rounded-md px-2 py-1.5" />
                  </div>
                  <p className={`col-span-2 text-[10px] leading-snug italic pt-1 ${isLight ? 'text-zinc-500' : 'text-neutral-500'}`}>
                    Offsets layout center on physical bed. Set to half of bed size for machines with centered 0,0 points.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Delta Kinematics section ── */}
            <div className="border-t border-white/5">
              <button
                aria-expanded={!collapsedSections.deltaKinematics}
                aria-controls="section-deltaKinematics"
                onClick={() => toggleSection('deltaKinematics')}
                className={`w-full flex items-center justify-between py-3 px-0 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                  isLight ? 'text-zinc-500 hover:text-zinc-800' : 'text-[#888] hover:text-white'
                }`}
              >
                <span>Delta Kinematics</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${collapsedSections.deltaKinematics ? '' : 'rotate-180'}`} />
              </button>
              <div id="section-deltaKinematics" data-testid="section-deltaKinematics" className={collapsedSections.deltaKinematics ? 'hidden' : 'space-y-3 pb-3'}>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    id="machine-is-delta-checkbox"
                    data-testid="machine-is-delta-checkbox"
                    type="checkbox"
                    checked={activeMachine.isDelta ?? false}
                    onChange={(e) => {
                      const enabling = e.target.checked;
                      onUpdateMachine({
                        ...activeMachine,
                        isDelta: enabling,
                        deltaRadius: activeMachine.deltaRadius ?? DEFAULT_DELTA_PARAMS.deltaRadius,
                        deltaArmLength: activeMachine.deltaArmLength ?? DEFAULT_DELTA_PARAMS.deltaArmLength,
                        deltaRodLength: activeMachine.deltaRodLength ?? DEFAULT_DELTA_PARAMS.deltaRodLength,
                        deltaTowerAngleOffset: activeMachine.deltaTowerAngleOffset ?? DEFAULT_DELTA_PARAMS.deltaTowerAngleOffset,
                        deltaPrintRadius: activeMachine.deltaPrintRadius ?? DEFAULT_DELTA_PARAMS.printRadius,
                      });
                      setCollapsedSections((prev) => ({
                        ...prev,
                        deltaKinematics: enabling ? false : true,
                      }));
                    }}
                    className="accent-purple-500 w-3.5 h-3.5 rounded"
                  />
                  <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-zinc-700' : 'text-neutral-300'}`}>
                    Enable Delta Kinematics Validation
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border text-purple-400 bg-purple-950/30 border-purple-800/40">
                    Δ IK
                  </span>
                </label>

                {activeMachine.isDelta && (
                  <div className="space-y-3 pl-1">
                    <p className={`text-[10px] leading-snug italic ${isLight ? 'text-zinc-500' : 'text-neutral-500'}`}>
                      Firmware handles actual IK — these values are used to validate that generated patterns stay within your delta's reachable print radius. Measure from your calibrated delta config.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block mb-1 label-caps">Delta Radius (mm)</label>
                        <input
                          id="machine-delta-radius-input"
                          type="number" step="0.5" min="10"
                          value={activeMachine.deltaRadius ?? DEFAULT_DELTA_PARAMS.deltaRadius}
                          onChange={(e) => handleFieldChange('deltaRadius', parseFloat(e.target.value) || DEFAULT_DELTA_PARAMS.deltaRadius)}
                          className="w-full elegant-input rounded-md px-2 py-1.5"
                        />
                        <span className={`text-[9px] block mt-0.5 ${isLight ? 'text-zinc-400' : 'text-neutral-600'}`}>Center-to-tower distance</span>
                      </div>
                      <div>
                        <label className="block mb-1 label-caps">Print Radius (mm)</label>
                        <input
                          id="machine-delta-print-radius-input"
                          type="number" step="0.5" min="5"
                          value={activeMachine.deltaPrintRadius ?? DEFAULT_DELTA_PARAMS.printRadius}
                          onChange={(e) => handleFieldChange('deltaPrintRadius', parseFloat(e.target.value) || DEFAULT_DELTA_PARAMS.printRadius)}
                          className="w-full elegant-input rounded-md px-2 py-1.5"
                        />
                        <span className={`text-[9px] block mt-0.5 ${isLight ? 'text-zinc-400' : 'text-neutral-600'}`}>Max reachable radius</span>
                      </div>
                      <div>
                        <label className="block mb-1 label-caps">Arm Length (mm)</label>
                        <input
                          id="machine-delta-arm-length-input"
                          type="number" step="0.5" min="10"
                          value={activeMachine.deltaArmLength ?? DEFAULT_DELTA_PARAMS.deltaArmLength}
                          onChange={(e) => handleFieldChange('deltaArmLength', parseFloat(e.target.value) || DEFAULT_DELTA_PARAMS.deltaArmLength)}
                          className="w-full elegant-input rounded-md px-2 py-1.5"
                        />
                      </div>
                      <div>
                        <label className="block mb-1 label-caps">Rod Length (mm)</label>
                        <input
                          id="machine-delta-rod-length-input"
                          type="number" step="0.5" min="10"
                          value={activeMachine.deltaRodLength ?? DEFAULT_DELTA_PARAMS.deltaRodLength}
                          onChange={(e) => handleFieldChange('deltaRodLength', parseFloat(e.target.value) || DEFAULT_DELTA_PARAMS.deltaRodLength)}
                          className="w-full elegant-input rounded-md px-2 py-1.5"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block mb-1 label-caps">Tower Angle Offset (°)</label>
                        <input
                          id="machine-delta-tower-angle-input"
                          type="number" step="1" min="-30" max="30"
                          value={activeMachine.deltaTowerAngleOffset ?? DEFAULT_DELTA_PARAMS.deltaTowerAngleOffset}
                          onChange={(e) => handleFieldChange('deltaTowerAngleOffset', parseFloat(e.target.value) || 0)}
                          className="w-full elegant-input rounded-md px-2 py-1.5"
                        />
                        <span className={`text-[9px] block mt-0.5 ${isLight ? 'text-zinc-400' : 'text-neutral-600'}`}>Rotational offset of tower A from 210°</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
