import React, { useRef } from 'react';
import { MaterialProfile, MaterialCategory } from '../types';
import { ParameterField } from './ParameterField';
import { Plus, Trash2, Download, Upload, Copy, ClipboardPaste } from 'lucide-react';
import {
  exportAllProfiles,
  exportSelectedProfile,
  importMaterialProfilesFromFile,
  copyProfileToClipboard,
  importProfilesFromClipboard,
} from '../lib/profileExport';
import { useConfirmModal } from '../hooks/useConfirmModal';
import { isValidMaterialProfile } from '../lib/materialPresets';

interface MaterialDatabaseProps {
  materials: MaterialProfile[];
  selectedId: string;
  onSelect: (id: string) => void;
  onUpdate: (m: MaterialProfile) => void;
  onCreate: (m: MaterialProfile) => void;
  onCreateBatch: (m: MaterialProfile[]) => void;
  onDelete: (id: string) => void;
  pwmMax: number;
}

const CATEGORIES: MaterialCategory[] = [
  'Wood',
  'Plastics',
  'Leather',
  'Stone',
  'Metals',
  'Paper/Cardboard',
  'Other',
];

const MaterialDatabase: React.FC<MaterialDatabaseProps> = ({
  materials,
  selectedId,
  onSelect,
  onUpdate,
  onDelete,
  onCreate,
  onCreateBatch,
  pwmMax,
}) => {
  const activeMaterial = materials.find((m) => m.id === selectedId) || materials[0];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { confirm, ConfirmModalComponent } = useConfirmModal();

  const handleFieldChange = (
    field: keyof MaterialProfile,
    value: MaterialProfile[keyof MaterialProfile]
  ) => {
    if (!activeMaterial) return;
    onUpdate({ ...activeMaterial, [field]: value });
  };

  const handleNestedChange = (parent: 'engrave' | 'cut', field: string, value: number) => {
    if (!activeMaterial) return;
    onUpdate({
      ...activeMaterial,
      [parent]: { ...activeMaterial[parent], [field]: value },
    });
  };

  const handleDelete = async () => {
    if (!activeMaterial) return;
    const ok = await confirm(
      `Delete material profile "${activeMaterial.name}"? This cannot be undone.`
    );
    if (ok) onDelete(activeMaterial.id);
  };

  const handleAdd = () => {
    const newId = `mat_${Date.now()}`;
    onCreate({
      ...activeMaterial,
      id: newId,
      name: 'New Material',
      history: [],
    });
    onSelect(newId);
  };

  const handleExportAll = () => {
    exportAllProfiles('material');
  };

  const handleExportSelected = () => {
    if (!activeMaterial) return;
    exportSelectedProfile(activeMaterial, 'material');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const result = await importMaterialProfilesFromFile(file, materials);
      if (result.profiles.length > 0) {
        onCreateBatch(result.profiles);
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

  const handleCopyProfile = async () => {
    if (!activeMaterial) return;
    try {
      await copyProfileToClipboard(activeMaterial, 'material');
    } catch {
      await confirm('Failed to copy to clipboard');
    }
  };

  const handlePasteProfile = async () => {
    try {
      const result = await importProfilesFromClipboard(
        'material',
        isValidMaterialProfile,
        materials
      );
      if (result.profiles.length > 0) {
        onCreateBatch(result.profiles);
        await confirm(`${result.profiles.length} profile(s) imported`);
      } else if (result.duplicates > 0) {
        await confirm('Profile already exists');
      } else {
        await confirm('No valid material profile found on clipboard');
      }
    } catch (err) {
      await confirm(`Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (!activeMaterial) return null;

  return (
    <div className="space-y-6" data-tour="material-library">
      {ConfirmModalComponent}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
            Material Library
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={handleImportClick}
              title="Import materials from file"
              className="p-1.5 bg-white/5 hover:bg-white/10 rounded-md transition-colors text-neutral-400 hover:text-white"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handlePasteProfile}
              title="Import material from clipboard"
              className="p-1.5 bg-white/5 hover:bg-white/10 rounded-md transition-colors text-neutral-400 hover:text-white"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleExportAll}
              title="Export all material profiles"
              className="p-1.5 bg-white/5 hover:bg-white/10 rounded-md transition-colors text-neutral-400 hover:text-white"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleAdd}
              title="Add new material"
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
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </section>

      <section className="bg-[#0D0D0D] rounded-xl border border-white/5 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
            Properties
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyProfile}
              title="Copy profile to clipboard for sharing"
              className="text-neutral-600 hover:text-red-500 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleExportSelected}
              title="Export this material profile"
              className="text-neutral-600 hover:text-red-500 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              aria-label="Delete material profile"
              className="text-neutral-600 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[9px] uppercase font-bold text-neutral-600 mb-1 block">
              Material Name
            </label>
            <input
              type="text"
              value={activeMaterial.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              className="w-full bg-black border border-white/5 rounded px-3 py-2 text-xs font-mono text-white focus:border-red-500/30 outline-none"
            />
          </div>

          <div>
            <label className="text-[9px] uppercase font-bold text-neutral-600 mb-1 block">
              Category
            </label>
            <select
              value={activeMaterial.category}
              onChange={(e) => handleFieldChange('category', e.target.value)}
              className="w-full bg-black border border-white/5 rounded px-2 py-1.5 text-[11px] outline-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 pt-2">
            <ParameterField
              label="Thickness"
              id="mat-thick"
              min={0.1}
              max={20}
              step={0.1}
              value={activeMaterial.thickness}
              onChange={(v) => handleFieldChange('thickness', v)}
              unit="mm"
            />

            <div className="py-2">
              <h4 className="text-[9px] uppercase font-bold text-red-500/50 mb-2">
                Default Engrave
              </h4>
              <ParameterField
                label="Power"
                id="eng-pwr"
                min={0}
                max={pwmMax}
                value={Math.min(activeMaterial.engrave.power, pwmMax)}
                onChange={(v) => handleNestedChange('engrave', 'power', v)}
                unit={`PWM (0–${pwmMax})`}
              />
              <ParameterField
                label="Speed"
                id="eng-spd"
                min={100}
                max={15000}
                value={activeMaterial.engrave.speed}
                onChange={(v) => handleNestedChange('engrave', 'speed', v)}
                unit="F"
              />
            </div>

            <div className="py-2 border-t border-white/5">
              <h4 className="text-[9px] uppercase font-bold text-blue-500/50 mb-2">Default Cut</h4>
              <ParameterField
                label="Power"
                id="cut-pwr"
                min={0}
                max={pwmMax}
                value={Math.min(activeMaterial.cut.power, pwmMax)}
                onChange={(v) => handleNestedChange('cut', 'power', v)}
                unit={`PWM (0–${pwmMax})`}
              />
              <ParameterField
                label="Speed"
                id="cut-spd"
                min={10}
                max={5000}
                value={activeMaterial.cut.speed}
                onChange={(v) => handleNestedChange('cut', 'speed', v)}
                unit="F"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MaterialDatabase;
