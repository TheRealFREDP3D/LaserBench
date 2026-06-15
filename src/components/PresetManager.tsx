import React, { useState, useEffect } from 'react';
import { Save, FolderOpen, Trash2, Plus, Search, Sparkles, Check, Info, FileSliders } from 'lucide-react';
import { GeneratorPreset, PatternType } from '../types';

interface PresetManagerProps {
  // Current settings parameters to save
  currentPattern: PatternType;
  powerMin: number;
  powerMax: number;
  speedMin: number;
  speedMax: number;
  powerSteps: number;
  speedSteps: number;
  blockSize: number;
  nominalThickness: number;
  kerfValues: number[];
  zMin: number;
  zMax: number;
  zSteps: number;
  pwmMax: number;
  
  // Callback when user picks a preset to load
  onLoadPreset: (preset: GeneratorPreset) => void;
  theme?: 'dark' | 'light';
}

// Built-in presets for a quick, robust calibration startup
const FACTORY_PRESETS: GeneratorPreset[] = [
  {
    id: 'factory-matrix-medium',
    name: 'Standard Birch Plywood Matrix',
    description: 'Perfect for quick speed-power threshold checking on 3mm Wood/Plywood.',
    patternType: 'matrix',
    isCustom: false,
    powerMin: 50,
    powerMax: 255,
    speedMin: 800,
    speedMax: 3000,
    powerSteps: 5,
    speedSteps: 5,
    blockSize: 12,
    nominalThickness: 3.0,
    kerfValues: [0.05, 0.10, 0.15, 0.20, 0.25],
    zMin: -3.0,
    zMax: 3.0,
    zSteps: 5,
  },
  {
    id: 'factory-acrylic-cut',
    name: 'Slow Heavy Acrylic Cut Grid',
    description: 'Designed for slow-speed high-power cutting validation on 4mm acrylic.',
    patternType: 'matrix',
    isCustom: false,
    powerMin: 120,
    powerMax: 255,
    speedMin: 100,
    speedMax: 800,
    powerSteps: 4,
    speedSteps: 4,
    blockSize: 14,
    nominalThickness: 4.0,
    kerfValues: [0.10, 0.15, 0.20, 0.25, 0.30],
    zMin: -4.0,
    zMax: 4.0,
    zSteps: 5,
  },
  {
    id: 'factory-leather-engrave',
    name: 'Ultra-Fine Leather Engraving Matrix',
    description: 'High speed and delicate low power to avoid deep branding char on Veg-Tan leather.',
    patternType: 'matrix',
    isCustom: false,
    powerMin: 20,
    powerMax: 100,
    speedMin: 2000,
    speedMax: 5000,
    powerSteps: 6,
    speedSteps: 5,
    blockSize: 10,
    nominalThickness: 1.5,
    kerfValues: [0.05, 0.10, 0.15, 0.20],
    zMin: -1.5,
    zMax: 1.5,
    zSteps: 5,
  },
  {
    id: 'factory-power-ramp-diode',
    name: 'Scribing Power Ramp Check',
    description: 'Checks superficial engraving gray levels at constant marking speed.',
    patternType: 'power_ramp',
    isCustom: false,
    powerMin: 30,
    powerMax: 255,
    speedMin: 1500,
    speedMax: 1500,
    powerSteps: 8,
    speedSteps: 5,
    blockSize: 15,
    nominalThickness: 3.0,
    kerfValues: [0.10, 0.20],
    zMin: -3.0,
    zMax: 3.0,
    zSteps: 5,
  },
  {
    id: 'factory-speed-ramp-etch',
    name: 'Lines Speed Ramp Sweeper',
    description: 'Identifies soot deposits and burn flare on wood relative to movement speeds.',
    patternType: 'speed_ramp',
    isCustom: false,
    powerMin: 180,
    powerMax: 180,
    speedMin: 1000,
    speedMax: 5000,
    powerSteps: 5,
    speedSteps: 8,
    blockSize: 12,
    nominalThickness: 3.0,
    kerfValues: [0.10, 0.20],
    zMin: -3.0,
    zMax: 3.0,
    zSteps: 5,
  },
  {
    id: 'factory-comb-joint-standard',
    name: 'Precision Kerf Comb joints',
    description: 'Creates tight press-fit slot models with 0.05mm step tolerances to test kerf clearance.',
    patternType: 'kerf_test',
    isCustom: false,
    powerMin: 150,
    powerMax: 255,
    speedMin: 400,
    speedMax: 1200,
    powerSteps: 5,
    speedSteps: 5,
    blockSize: 12,
    nominalThickness: 3.0,
    kerfValues: [0.05, 0.10, 0.15, 0.20, 0.25],
    zMin: -3.0,
    zMax: 3.0,
    zSteps: 5,
  },
  {
    id: 'factory-focal-point-z',
    name: 'Optics Focal Alignment ladder',
    description: 'Adjusts Z coordinates incrementally to pinpoint thin razor sheng spots.',
    patternType: 'focus_ladder',
    isCustom: false,
    powerMin: 100,
    powerMax: 100,
    speedMin: 2200,
    speedMax: 2200,
    powerSteps: 5,
    speedSteps: 5,
    blockSize: 12,
    nominalThickness: 3.0,
    zMin: -3.0,
    zMax: 3.0,
    zSteps: 7,
    kerfValues: [0.1],
  },
];

export default function PresetManager({
  currentPattern,
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
  onLoadPreset,
  theme = 'dark',
}: PresetManagerProps) {
  const isLight = theme === 'light';
  
  // Custom presets saved in localStorage
  const [customPresets, setCustomPresets] = useState<GeneratorPreset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const [loadedPresetId, setLoadedPresetId] = useState<string | null>(null);

  // Load custom presets on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('laserbench_generator_presets');
      if (stored) {
        setCustomPresets(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load custom presets from localStorage', e);
    }
  }, []);

  // Save to localStorage whenever custom presets update
  const saveToLocalStorage = (presets: GeneratorPreset[]) => {
    try {
      localStorage.setItem('laserbench_generator_presets', JSON.stringify(presets));
    } catch (e) {
      console.error('Failed to save presets to localStorage', e);
    }
  };

  const handleSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    const newPreset: GeneratorPreset = {
      id: `custom-${Date.now()}`,
      name: newPresetName.trim(),
      description: newPresetDesc.trim() || 'Custom user calibration setting.',
      patternType: currentPattern,
      isCustom: true,
      powerMin,
      powerMax,
      speedMin,
      speedMax,
      powerSteps,
      speedSteps,
      blockSize,
      nominalThickness,
      kerfValues: [...kerfValues],
      zMin,
      zMax,
      zSteps,
    };

    const updated = [newPreset, ...customPresets];
    setCustomPresets(updated);
    saveToLocalStorage(updated);
    
    // UI feedback
    setNewPresetName('');
    setNewPresetDesc('');
    setJustSaved(true);
    setLoadedPresetId(newPreset.id);
    setTimeout(() => setJustSaved(false), 2500);
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering load
    if (confirm('Are you sure you want to delete this custom preset?')) {
      const updated = customPresets.filter((p) => p.id !== id);
      setCustomPresets(updated);
      saveToLocalStorage(updated);
      if (loadedPresetId === id) {
        setLoadedPresetId(null);
      }
    }
  };

  const handleLoadPreset = (preset: GeneratorPreset) => {
    // If presets are using firmware power scales that differ, make sure we adjust safely
    const adjustedPreset = { ...preset };
    if (preset.powerMax > pwmMax) {
      // scale proportionally down to fit our current firmware limit
      adjustedPreset.powerMax = Math.min(preset.powerMax, pwmMax);
      adjustedPreset.powerMin = Math.min(preset.powerMin, Math.max(1, pwmMax - 50));
    }
    
    onLoadPreset(adjustedPreset);
    setLoadedPresetId(preset.id);
  };

  // Combine both sources
  const allPresets = [...customPresets, ...FACTORY_PRESETS];

  // Filter presets based on search query
  const filteredPresets = allPresets.filter((preset) => {
    const term = searchQuery.toLowerCase();
    const matchesSearch =
      preset.name.toLowerCase().includes(term) ||
      (preset.description || '').toLowerCase().includes(term) ||
      preset.patternType.toLowerCase().includes(term);
    return matchesSearch;
  });

  const getPatternBadgeLabel = (type: PatternType) => {
    switch (type) {
      case 'matrix': return 'Matrix Column-Row';
      case 'power_ramp': return 'Power Ramp';
      case 'speed_ramp': return 'Speed Lines';
      case 'focus_ladder': return 'Focus Z-test';
      case 'kerf_test': return 'Kerf Joint';
    }
  };

  const getPatternBadgeColor = (type: PatternType) => {
    switch (type) {
      case 'matrix': return 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20';
      case 'power_ramp': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'speed_ramp': return 'text-sky-500 bg-sky-500/10 border-sky-500/20';
      case 'focus_ladder': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      case 'kerf_test': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    }
  };

  return (
    <div id="preset-manager-card" className={`border rounded-lg p-5 shadow-sm space-y-5 transition-all duration-200 ${
      isLight 
        ? 'bg-white border-zinc-200 text-zinc-800' 
        : 'bg-[#0E0E0E] border-white/10 text-[#E0E0E0]'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSliders className="text-indigo-500 w-5 h-5 shrink-0" />
          <h2 className={`text-sm font-semibold tracking-wide uppercase font-sans ${isLight ? 'text-zinc-800' : 'text-white'}`}>
            Generator Presets
          </h2>
        </div>
        <span className={`text-[10px] uppercase tracking-widest font-mono text-right p-1 rounded font-bold ${
          isLight ? 'bg-zinc-100 text-zinc-500' : 'bg-white/5 text-zinc-400'
        }`}>
          {filteredPresets.length} loaded
        </span>
      </div>

      <p className={`text-[11px] leading-relaxed -mt-1 ${isLight ? 'text-zinc-500' : 'text-neutral-400'}`}>
        Choose a pre-calibrated factory profile or save your current slider configuration as a quick-recall preset. Keys are clamped automatically inside active firmware PWM levels.
      </p>

      {/* Preset Saving Mini-Form */}
      <form onSubmit={handleSavePreset} id="save-preset-form" className={`p-4 rounded border ${
        isLight ? 'bg-zinc-50/55 border-zinc-200' : 'bg-[#151515] border-white/5'
      } space-y-3`}>
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-zinc-650' : 'text-zinc-400'}`}>
            Save Current State
          </span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider float-right font-mono border ${
            currentPattern === 'matrix' ? 'text-indigo-500 border-indigo-500/20 bg-indigo-500/5' :
            currentPattern === 'power_ramp' ? 'text-yellow-500 border-yellow-500/20 bg-yellow-500/5' :
            currentPattern === 'speed_ramp' ? 'text-sky-500 border-sky-500/20 bg-sky-500/5' :
            currentPattern === 'focus_ladder' ? 'text-purple-500 border-purple-500/20 bg-purple-500/5' :
            'text-rose-500 border-rose-500/20 bg-rose-500/5'
          }`}>
            Target: {getPatternBadgeLabel(currentPattern)}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <input
            id="preset-save-name-input"
            type="text"
            placeholder="Preset Name (e.g. Cardboard Scribing 2mm)"
            value={newPresetName}
            required
            onChange={(e) => setNewPresetName(e.target.value)}
            className={`w-full elegant-input px-2.5 py-1.5 text-xs rounded border outline-none ${
              isLight ? 'bg-white border-zinc-300 text-zinc-800 focus:border-indigo-500' : 'bg-[#0A0A0A] border-white/10 text-white focus:border-indigo-900/60'
            }`}
          />
          <input
            id="preset-save-desc-input"
            type="text"
            placeholder="Short description of the laser profile"
            value={newPresetDesc}
            onChange={(e) => setNewPresetDesc(e.target.value)}
            className={`w-full elegant-input px-2.5 py-1.5 text-xs rounded border outline-none ${
              isLight ? 'bg-white border-zinc-300 text-zinc-800 focus:border-indigo-500' : 'bg-[#0A0A0A] border-white/10 text-neutral-300 focus:border-indigo-900/60'
            }`}
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="text-[10px] font-mono text-zinc-500 italic max-w-[180px] truncate">
            {powerSteps}x{speedSteps} @ {blockSize}mm cells
          </div>
          <button
            type="submit"
            id="save-settings-preset-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition duration-150 cursor-pointer shadow-sm select-none"
          >
            {justSaved ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300 animate-bounce" />
                <span>Preset Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save State</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Filter and List Section */}
      <div className="space-y-3 pt-1">
        {/* Search toolpath */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-neutral-500" />
          <input
            id="preset-search-input"
            type="text"
            placeholder="Search material / test parameters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-8 pr-3 py-1.5 text-xs rounded border outline-none transition-all duration-150 ${
              isLight 
                ? 'bg-zinc-50 border-zinc-200 text-zinc-800 focus:bg-white focus:border-indigo-500' 
                : 'bg-[#0A0A0A] border-white/10 text-neutral-300 focus:border-indigo-900/60'
            }`}
          />
        </div>

        {/* Scrollable Presets Deck */}
        <div id="presets-scroller-viewport" className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
          {filteredPresets.length === 0 ? (
            <div className={`p-6 text-center border border-dashed rounded-lg ${
              isLight ? 'border-zinc-200 text-zinc-400' : 'border-white/5 text-neutral-500'
            }`}>
              <Info className="w-5 h-5 mx-auto mb-1.5 text-neutral-600" />
              <p className="text-xs">No presets match research terms.</p>
            </div>
          ) : (
            filteredPresets.map((preset) => {
              const isLoaded = loadedPresetId === preset.id;
              return (
                <div
                  key={preset.id}
                  id={`preset-loader-row-${preset.id}`}
                  onClick={() => handleLoadPreset(preset)}
                  className={`group p-3 rounded border text-left cursor-pointer transition-all duration-200 flex flex-col justify-between hover:shadow-sm ${
                    isLoaded
                      ? isLight
                        ? 'bg-indigo-50/40 border-indigo-400 text-indigo-905 ring-1 ring-indigo-200/50'
                        : 'bg-[#181825] border-indigo-500/80 ring-1 ring-indigo-500/10'
                      : isLight
                        ? 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300 text-zinc-800'
                        : 'bg-[#0A0A0A] border-white/8 hover:border-white/12 text-[#E0E0E0]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className={`text-xs font-bold leading-tight ${isLoaded ? 'text-indigo-400' : ''}`}>
                          {preset.name}
                        </h4>
                        {preset.isCustom ? (
                          <span className="text-[9px] uppercase font-mono px-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 font-semibold select-none shrink-0">
                            Custom
                          </span>
                        ) : (
                          <span className="text-[9px] uppercase font-mono px-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-semibold select-none shrink-0 flex items-center gap-0.5">
                            <Sparkles className="w-2 h-2" /> Factory
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] mt-1 leading-snug line-clamp-2 ${
                        isLight ? 'text-zinc-500' : 'text-neutral-400'
                      }`}>
                        {preset.description}
                      </p>
                    </div>

                    {/* Delete action / Loaded check badge */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isLoaded && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold tracking-wider ${
                          isLight ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-950 text-indigo-300'
                        }`}>
                          LOADED
                        </span>
                      )}
                      
                      {preset.isCustom && (
                        <button
                          onClick={(e) => handleDeletePreset(preset.id, e)}
                          id={`delete-preset-btn-${preset.id}`}
                          title="Delete Custom Preset"
                          className="p-1 rounded text-neutral-500 hover:text-red-500 hover:bg-red-500/5 transition cursor-pointer md:opacity-10 group-hover:opacity-100 focus:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Summary pills block */}
                  <div className={`mt-2 flex flex-wrap gap-1.5 pt-2 border-t ${
                    isLight ? 'border-zinc-200/60' : 'border-white/5'
                  }`}>
                    {/* Pattern indicator */}
                    <span className={`text-[9px] font-mono border px-1.5 py-0.5 rounded leading-none shrink-0 ${getPatternBadgeColor(preset.patternType)}`}>
                      {getPatternBadgeLabel(preset.patternType)}
                    </span>
                    
                    {/* Block Size */}
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded leading-none border shrink-0 ${
                      isLight ? 'bg-zinc-100 border-zinc-200/80 text-zinc-650' : 'bg-white/5 border-white/8 text-zinc-400'
                    }`}>
                      Size: {preset.blockSize}mm
                    </span>
                    
                    {/* Settings specifics */}
                    {(preset.patternType === 'matrix' || preset.patternType === 'power_ramp' || preset.patternType === 'speed_ramp') && (
                      <>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded leading-none border shrink-0 ${
                          isLight ? 'bg-zinc-100 border-zinc-200/80 text-zinc-650' : 'bg-white/5 border-white/8 text-zinc-400'
                        }`}>
                          S{preset.powerMin}-S{preset.powerMax} ({preset.powerSteps} cols)
                        </span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded leading-none border shrink-0 ${
                          isLight ? 'bg-zinc-100 border-zinc-200/80 text-zinc-650' : 'bg-white/5 border-white/8 text-zinc-400'
                        }`}>
                          F{preset.speedMin}-F{preset.speedMax} ({preset.speedSteps} rows)
                        </span>
                      </>
                    )}

                    {preset.patternType === 'focus_ladder' && (
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded leading-none border shrink-0 ${
                        isLight ? 'bg-zinc-100 border-zinc-200/80 text-zinc-650' : 'bg-white/5 border-white/8 text-zinc-400'
                      }`}>
                        Z{preset.zMin} to Z{preset.zMax} ({preset.zSteps} steps)
                      </span>
                    )}

                    {preset.patternType === 'kerf_test' && (
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded leading-none border shrink-0 ${
                        isLight ? 'bg-zinc-100 border-zinc-200/80 text-zinc-650' : 'bg-white/5 border-white/8 text-zinc-400'
                      }`}>
                        Thickness: {preset.nominalThickness}mm ({preset.kerfValues.length} slots)
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
