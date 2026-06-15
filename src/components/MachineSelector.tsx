import React, { useState } from 'react';
import { MachineProfile, FirmwareType } from '../types';
import { Settings2, Plus, Trash2, Cpu } from 'lucide-react';

interface MachineSelectorProps {
  machines: MachineProfile[];
  selectedMachineId: string;
  onSelectMachine: (id: string) => void;
  onUpdateMachine: (machine: MachineProfile) => void;
  onCreateMachine: (machine: MachineProfile) => void;
  onDeleteMachine: (id: string) => void;
  theme?: 'dark' | 'light';
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
  const activeMachine = machines.find((m) => m.id === selectedMachineId) || machines[0];

  const handleFieldChange = (field: keyof MachineProfile, value: any) => {
    if (!activeMachine) return;
    onUpdateMachine({
      ...activeMachine,
      [field]: value,
    });
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
    };
    onCreateMachine(newMachine);
    onSelectMachine(newId);
    setIsEditing(true);
  };

  return (
    <div id="machine-selector-card" className={`border rounded-lg p-5 shadow-md transition-all duration-200 ${
      isLight 
        ? 'bg-white border-zinc-200 text-zinc-800' 
        : 'bg-[#0E0E0E] text-[#E0E0E0] border-white/10'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cpu className="text-red-500 w-5 h-5" />
          <h2 className={`text-sm font-semibold tracking-wide uppercase font-sans ${isLight ? 'text-zinc-800' : 'text-white'}`}>Machine Profile</h2>
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
        {/* Dropdown for selector */}
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
                  {mac.name} ({mac.firmware.toUpperCase()})
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

        {/* Machine Config Editor */}
        {isEditing && activeMachine && (
          <div id="machine-config-editor-form" className={`border-t pt-3 mt-3 space-y-3 text-xs ${
            isLight ? 'border-zinc-200 text-zinc-800' : 'border-white/8 text-slate-300'
          }`}>
            {/* Machine Name */}
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

            <div className="grid grid-cols-2 gap-2">
              {/* Firmware Selection */}
              <div>
                <label className="block mb-1 label-caps">Firmware Dialect</label>
                <select
                  id="machine-firmware-select"
                  value={activeMachine.firmware}
                  onChange={(e) => {
                    const fw = e.target.value as FirmwareType;
                    // Auto switch default gcodes to make it friction-free
                    const defaults =
                      fw === 'marlin'
                        ? { laserOn: 'M106 S{power}', laserOff: 'M107', pwmMax: 255 }
                        : { laserOn: 'M3 S{power}', laserOff: 'M5', pwmMax: 1000 };
                    onUpdateMachine({
                      ...activeMachine,
                      firmware: fw,
                      ...defaults,
                    });
                  }}
                  className="w-full elegant-input rounded-md px-2 py-1.5"
                >
                  <option value="grbl" className={isLight ? 'bg-white text-zinc-800' : 'bg-[#151515]'}>GRBL ($32 mode)</option>
                  <option value="marlin" className={isLight ? 'bg-white text-zinc-800' : 'bg-[#151515]'}>Marlin Fan PWM</option>
                </select>
              </div>

              {/* PWM Resolution */}
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

            {/* Laser Commands */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block mb-1 label-caps">Laser On G-code</label>
                <input
                  id="machine-laseron-input"
                  type="text"
                  placeholder="M3 S{power}"
                  value={activeMachine.laserOn}
                  onChange={(e) => handleFieldChange('laserOn', e.target.value)}
                  className="w-full elegant-input rounded-md px-2 py-1.5 mono"
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
                  className="w-full elegant-input rounded-md px-2 py-1.5 mono"
                />
              </div>
            </div>

            {/* Travel Speeds & Z bounds */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block mb-1 label-caps">Safe Z (mm)</label>
                <input
                  id="machine-safez-input"
                  type="number"
                  step="0.5"
                  value={activeMachine.safeZ}
                  onChange={(e) => handleFieldChange('safeZ', parseFloat(e.target.value) || 0)}
                  className="w-full elegant-input rounded-md px-2 py-1.5"
                />
              </div>
              <div>
                <label className="block mb-1 label-caps">Work Z (mm)</label>
                <input
                  id="machine-workz-input"
                  type="number"
                  step="0.5"
                  value={activeMachine.workZ}
                  onChange={(e) => handleFieldChange('workZ', parseFloat(e.target.value) || 0)}
                  className="w-full elegant-input rounded-md px-2 py-1.5"
                />
              </div>
              <div>
                <label className="block mb-1 label-caps font-sans tracking-normal leading-normal">Travel (mm/m)</label>
                <input
                  id="machine-travelspeed-input"
                  type="number"
                  min="100"
                  step="100"
                  value={activeMachine.travelSpeed}
                  onChange={(e) => handleFieldChange('travelSpeed', parseInt(e.target.value) || 3000)}
                  className="w-full elegant-input rounded-md px-2 py-1.5"
                />
              </div>
            </div>

            {/* Bed Shape and size */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block mb-1 label-caps">Bed Shape</label>
                <select
                  id="machine-bedshape-select"
                  value={activeMachine.bedShape}
                  onChange={(e) => handleFieldChange('bedShape', e.target.value)}
                  className="w-full elegant-input rounded-md px-2 py-1.5"
                >
                  <option value="rectangular" className={isLight ? 'bg-white text-zinc-800' : 'bg-[#151515]'}>Rect (X/Y)</option>
                  <option value="circular" className={isLight ? 'bg-white text-zinc-800' : 'bg-[#151515]'}>Delta (Circ)</option>
                </select>
              </div>
              {activeMachine.bedShape === 'circular' ? (
                <div className="col-span-2">
                  <label className="block mb-1 label-caps">Bed Radius (mm)</label>
                  <input
                    id="machine-bedwidth-radius-input"
                    type="number"
                    min="10"
                    value={activeMachine.bedWidth}
                    onChange={(e) => handleFieldChange('bedWidth', parseInt(e.target.value) || 100)}
                    className="w-full elegant-input rounded-md px-2 py-1.5"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block mb-1 label-caps">Width X (mm)</label>
                    <input
                      id="machine-bedwidth-rectangular-input"
                      type="number"
                      min="10"
                      value={activeMachine.bedWidth}
                      onChange={(e) => handleFieldChange('bedWidth', parseInt(e.target.value) || 200)}
                      className="w-full elegant-input rounded-md px-2 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 label-caps">Height Y (mm)</label>
                    <input
                      id="machine-bedheight-input"
                      type="number"
                      min="10"
                      value={activeMachine.bedHeight}
                      onChange={(e) => handleFieldChange('bedHeight', parseInt(e.target.value) || 200)}
                      className="w-full elegant-input rounded-md px-2 py-1.5"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Origin coordinates setup */}
            <div className={`grid grid-cols-2 gap-2 border-t pt-3 mt-1 ${isLight ? 'border-zinc-200' : 'border-white/8'}`}>
              <div>
                <label className="block mb-1 label-caps">Origin X Coord (mm)</label>
                <input
                  id="machine-originx-input"
                  type="number"
                  placeholder="0"
                  value={activeMachine.originX ?? 0}
                  onChange={(e) => handleFieldChange('originX', parseInt(e.target.value) || 0)}
                  className="w-full elegant-input rounded-md px-2 py-1.5"
                />
              </div>
              <div>
                <label className="block mb-1 label-caps">Origin Y Coord (mm)</label>
                <input
                  id="machine-originy-input"
                  type="number"
                  placeholder="0"
                  value={activeMachine.originY ?? 0}
                  onChange={(e) => handleFieldChange('originY', parseInt(e.target.value) || 0)}
                  className="w-full elegant-input rounded-md px-2 py-1.5"
                />
              </div>
              <p className={`col-span-2 text-[10px] leading-snug italic pt-1 ${isLight ? 'text-zinc-500' : 'text-neutral-500'}`}>
                Offsets layout center on physical bed. Set to half of bed size (e.g., 100, 100 on a 200&times;200 bed) for machines with centered center/delta 0,0 points.
              </p>
            </div>

            {/* Remove Profile for custom profiles */}
            {machines.length > 1 && (
              <div className="flex justify-end pt-2">
                <button
                  id="delete-machine-btn"
                  type="button"
                  onClick={() => {
                    const confirmSelection = window.confirm("Are you sure you want to delete this profile?");
                    if (confirmSelection) {
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
          </div>
        )}
      </div>
    </div>
  );
}
