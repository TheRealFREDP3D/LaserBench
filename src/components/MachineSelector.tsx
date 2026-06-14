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
}

export default function MachineSelector({
  machines,
  selectedMachineId,
  onSelectMachine,
  onUpdateMachine,
  onCreateMachine,
  onDeleteMachine,
}: MachineSelectorProps) {
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
    };
    onCreateMachine(newMachine);
    onSelectMachine(newId);
    setIsEditing(true);
  };

  return (
    <div id="machine-selector-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm text-slate-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cpu className="text-indigo-400 w-5 h-5 text-indigo-400" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-indigo-300">Machine Profile</h2>
        </div>
        <button
          id="toggle-edit-machine-btn"
          onClick={() => setIsEditing(!isEditing)}
          className={`px-3 py-1 text-xs font-medium rounded-md transition ${
            isEditing
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {isEditing ? 'Done Settings' : 'Edit Settings'}
        </button>
      </div>

      <div className="space-y-4">
        {/* Dropdown for selector */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Active Machine Profile</label>
          <div className="flex gap-2">
            <select
              id="machine-profile-select"
              value={selectedMachineId}
              onChange={(e) => onSelectMachine(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {machines.map((mac) => (
                <option key={mac.id} value={mac.id}>
                  {mac.name} ({mac.firmware.toUpperCase()})
                </option>
              ))}
            </select>
            <button
              id="new-machine-btn"
              onClick={handleCreateNew}
              title="Add new machine profile"
              className="bg-indigo-950 text-indigo-300 border border-indigo-800 hover:bg-indigo-900 px-3 py-2 rounded-lg text-sm flex items-center justify-center transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Machine Config Editor */}
        {isEditing && activeMachine && (
          <div id="machine-config-editor-form" className="border-t border-slate-800 pt-3 mt-3 space-y-3 text-slate-300 text-xs">
            {/* Machine Name */}
            <div>
              <label className="block text-slate-400 mb-1">Rename Profile</label>
              <input
                id="machine-name-input"
                type="text"
                value={activeMachine.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Firmware Selection */}
              <div>
                <label className="block text-slate-400 mb-1">Firmware Dialect</label>
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
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-slate-200 focus:outline-none"
                >
                  <option value="grbl">GRBL ($32 mode)</option>
                  <option value="marlin">Marlin Fan PWM</option>
                </select>
              </div>

              {/* PWM Resolution */}
              <div>
                <label className="block text-slate-400 mb-1">PWM Range (Max S)</label>
                <input
                  id="machine-pwm-input"
                  type="number"
                  min="1"
                  max="10000"
                  value={activeMachine.pwmMax}
                  onChange={(e) => handleFieldChange('pwmMax', parseInt(e.target.value) || 255)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            {/* Laser Commands */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">Laser On G-code</label>
                <input
                  id="machine-laseron-input"
                  type="text"
                  placeholder="M3 S{power}"
                  value={activeMachine.laserOn}
                  onChange={(e) => handleFieldChange('laserOn', e.target.value)}
                  className="w-full font-mono bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-slate-200 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Laser Off G-code</label>
                <input
                  id="machine-laseroff-input"
                  type="text"
                  placeholder="M5"
                  value={activeMachine.laserOff}
                  onChange={(e) => handleFieldChange('laserOff', e.target.value)}
                  className="w-full font-mono bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            {/* Travel Speeds & Z bounds */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">Safe Z (mm)</label>
                <input
                  id="machine-safez-input"
                  type="number"
                  step="0.5"
                  value={activeMachine.safeZ}
                  onChange={(e) => handleFieldChange('safeZ', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-slate-200 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Work Z (mm)</label>
                <input
                  id="machine-workz-input"
                  type="number"
                  step="0.5"
                  value={activeMachine.workZ}
                  onChange={(e) => handleFieldChange('workZ', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-slate-200 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Travel (mm/m)</label>
                <input
                  id="machine-travelspeed-input"
                  type="number"
                  min="100"
                  step="100"
                  value={activeMachine.travelSpeed}
                  onChange={(e) => handleFieldChange('travelSpeed', parseInt(e.target.value) || 3000)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            {/* Bed Shape and size */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-slate-400 mb-1">Bed Shape</label>
                <select
                  id="machine-bedshape-select"
                  value={activeMachine.bedShape}
                  onChange={(e) => handleFieldChange('bedShape', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-slate-200 focus:outline-none"
                >
                  <option value="rectangular">Rect (X/Y)</option>
                  <option value="circular">Delta (Circ)</option>
                </select>
              </div>
              {activeMachine.bedShape === 'circular' ? (
                <div className="col-span-2">
                  <label className="block text-slate-400 mb-1">Bed Radius (mm)</label>
                  <input
                    id="machine-bedwidth-radius-input"
                    type="number"
                    min="10"
                    value={activeMachine.bedWidth}
                    onChange={(e) => handleFieldChange('bedWidth', parseInt(e.target.value) || 100)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-slate-200 focus:outline-none"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-slate-400 mb-1">Width X (mm)</label>
                    <input
                      id="machine-bedwidth-rectangular-input"
                      type="number"
                      min="10"
                      value={activeMachine.bedWidth}
                      onChange={(e) => handleFieldChange('bedWidth', parseInt(e.target.value) || 200)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Height Y (mm)</label>
                    <input
                      id="machine-bedheight-input"
                      type="number"
                      min="10"
                      value={activeMachine.bedHeight}
                      onChange={(e) => handleFieldChange('bedHeight', parseInt(e.target.value) || 200)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1.5 text-slate-200 focus:outline-none"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Remove Profile for custom profiles */}
            {machines.length > 1 && (
              <div className="flex justify-end pt-2">
                <button
                  id="delete-machine-btn"
                  type="button"
                  onClick={() => {
                    const confirm = window.confirm("Are you sure you want to delete this profile?");
                    if (confirm) {
                      onDeleteMachine(activeMachine.id);
                      setIsEditing(false);
                    }
                  }}
                  className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 transition"
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
