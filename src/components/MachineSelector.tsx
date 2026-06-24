import React, { useState, useRef } from 'react';
import { MachineProfile, LaserControlMode, FirmwareType } from '../types';
import { ParameterField } from './ParameterField';
import { Plus, Trash2, ChevronDown, ChevronUp, Code, Download, Upload } from 'lucide-react';
import { useConfirmModal } from '../hooks/useConfirmModal';
import {
  exportAllProfiles,
  exportSelectedProfile,
  importMachineProfilesFromFile,
} from '../lib/profileExport';

interface MachineSelectorProps {
  machines: MachineProfile[];
  selectedId: string;
  onSelect: (id: string) => void;
  onUpdate: (m: MachineProfile) => void;
  onCreate: (m: MachineProfile) => void;
  onDelete: (id: string) => void;
}

const MachineSelector: React.FC<MachineSelectorProps> = ({
  machines,
  selectedId,
  onSelect,
  onUpdate,
  onDelete,
  onCreate,
}) => {
  const activeMachine = machines.find((m) => m.id === selectedId) || machines[0];
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { confirm, ConfirmModalComponent } = useConfirmModal();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFieldChange = (
    field: keyof MachineProfile,
    value: MachineProfile[keyof MachineProfile]
  ) => {
    if (!activeMachine) return;
    onUpdate({ ...activeMachine, [field]: value });
  };

  const handleAdd = () => {
    const newId = `machine_${Date.now()}`;
    onCreate({
      ...activeMachine,
      id: newId,
      name: 'New Machine',
    });
    onSelect(newId);
  };

  const handleDelete = async () => {
    if (!activeMachine) return;
    const ok = await confirm(
      `Delete machine profile "${activeMachine.name}"? This cannot be undone.`
    );
    if (ok) onDelete(activeMachine.id);
  };

  const handleExportAll = () => {
    exportAllProfiles('machine');
  };

  const handleExportSelected = () => {
    if (!activeMachine) return;
    exportSelectedProfile(activeMachine, 'machine');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const result = await importMachineProfilesFromFile(file, machines);
      if (result.profiles.length > 0) {
        for (const p of result.profiles) {
          onCreate(p);
        }
      }
      const parts: string[] = [];
      if (result.profiles.length > 0) parts.push(`${result.profiles.length} imported`);
      if (result.duplicates > 0) parts.push(`${result.duplicates} skipped (duplicates)`);
      if (result.invalid > 0) parts.push(`${result.invalid} invalid`);
      await confirm(parts.length > 0 ? parts.join(', ') : 'No new profiles found');
    } catch (err) {
      await confirm(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (!activeMachine) return null;

  return (
    <div className="space-y-6">
      {ConfirmModalComponent}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
            Machine Profile
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={handleImportClick}
              title="Import profiles from file"
              className="p-1.5 bg-white/5 hover:bg-white/10 rounded-md transition-colors text-neutral-400 hover:text-white"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleExportAll}
              title="Export all machine profiles"
              className="p-1.5 bg-white/5 hover:bg-white/10 rounded-md transition-colors text-neutral-400 hover:text-white"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleAdd}
              title="Add new machine"
              className="p-1.5 bg-white/5 hover:bg-white/10 rounded-md transition-colors text-neutral-400 hover:text-white"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <select
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          className="w-full bg-[#111] border border-white/5 rounded-lg px-4 py-3 text-xs font-semibold outline-none focus:border-red-500/50 transition-all appearance-none cursor-pointer"
        >
          {machines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </section>

      <section className="bg-[#0D0D0D] rounded-xl border border-white/5 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
            Settings
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportSelected}
              title="Export this machine profile"
              className="text-neutral-600 hover:text-red-500 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              className="text-neutral-600 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[9px] uppercase font-bold text-neutral-600 mb-1 block">
              Machine Name
            </label>
            <input
              type="text"
              value={activeMachine.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              className="w-full bg-black border border-white/5 rounded px-3 py-2 text-xs font-mono text-white focus:border-red-500/30 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] uppercase font-bold text-neutral-600 mb-1 block">
                Firmware
              </label>
              <select
                value={activeMachine.firmware}
                onChange={(e) => handleFieldChange('firmware', e.target.value as FirmwareType)}
                className="w-full bg-black border border-white/5 rounded px-2 py-1.5 text-[11px] outline-none"
              >
                <option value="grbl">GRBL</option>
                <option value="marlin">Marlin</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] uppercase font-bold text-neutral-600 mb-1 block">
                Laser Mode
              </label>
              <select
                value={activeMachine.laserMode}
                onChange={(e) => handleFieldChange('laserMode', e.target.value as LaserControlMode)}
                className="w-full bg-black border border-white/5 rounded px-2 py-1.5 text-[11px] outline-none"
              >
                <option value="M3_M5">M3/M5 (GRBL)</option>
                <option value="M106_M107">M106/M107 (Fan)</option>
                <option value="M3_M4_M5">M3/M4/M5 (Pro)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <ParameterField
              label="Bed Width"
              id="bed-w"
              min={50}
              max={1000}
              value={activeMachine.bedWidth}
              onChange={(v) => handleFieldChange('bedWidth', v)}
              unit="mm"
            />
            <ParameterField
              label="Bed Height"
              id="bed-h"
              min={50}
              max={1000}
              value={activeMachine.bedHeight}
              onChange={(v) => handleFieldChange('bedHeight', v)}
              unit="mm"
            />
            <ParameterField
              label="PWM Max"
              id="pwm-max"
              min={255}
              max={1000}
              value={activeMachine.pwmMax}
              onChange={(v) => handleFieldChange('pwmMax', v)}
            />
            <ParameterField
              label="Travel Speed"
              id="travel-speed"
              min={1000}
              max={15000}
              value={activeMachine.travelSpeed}
              onChange={(v) => handleFieldChange('travelSpeed', v)}
              unit="F"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-neutral-300 transition-colors py-2"
            >
              <div className="flex items-center gap-2">
                <Code className="w-3 h-3" />
                <span>Advanced G-Code</span>
              </div>
              {showAdvanced ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            {showAdvanced && (
              <div className="space-y-3 pt-2 animate-fade-in">
                <div>
                  <label className="text-[9px] uppercase font-bold text-neutral-600 mb-1 block">
                    Start G-Code
                  </label>
                  <textarea
                    value={activeMachine.startGCode || ''}
                    onChange={(e) => handleFieldChange('startGCode', e.target.value)}
                    placeholder="e.g. G28 ; Home\nG1 Z5 F3000"
                    className="w-full h-20 bg-black border border-white/5 rounded p-2 text-[10px] font-mono text-indigo-400 focus:border-indigo-500/30 outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-neutral-600 mb-1 block">
                    End G-Code
                  </label>
                  <textarea
                    value={activeMachine.endGCode || ''}
                    onChange={(e) => handleFieldChange('endGCode', e.target.value)}
                    placeholder="e.g. M107 ; Laser Off\nG28 X0 ; Park"
                    className="w-full h-20 bg-black border border-white/5 rounded p-2 text-[10px] font-mono text-indigo-400 focus:border-indigo-500/30 outline-none resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default MachineSelector;
