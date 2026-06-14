import React, { useState } from 'react';
import { MaterialProfile, MaterialCategory, CalibrationHistoryEntry } from '../types';
import { FolderHeart, Plus, Trash2, Edit2, Calendar, Check, Save } from 'lucide-react';

interface MaterialDatabaseProps {
  materials: MaterialProfile[];
  selectedMaterialId: string;
  pwmMax: number;
  onSelectMaterial: (id: string) => void;
  onUpdateMaterial: (material: MaterialProfile) => void;
  onCreateMaterial: (material: MaterialProfile) => void;
  onDeleteMaterial: (id: string) => void;
}

export default function MaterialDatabase({
  materials,
  selectedMaterialId,
  pwmMax,
  onSelectMaterial,
  onUpdateMaterial,
  onCreateMaterial,
  onDeleteMaterial,
}: MaterialDatabaseProps) {
  const [activeCategory, setActiveCategory] = useState<MaterialCategory>('Wood');
  const [isEditing, setIsEditing] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);

  // New Log form state
  const [logNotes, setLogNotes] = useState('');
  const [logPattern, setLogPattern] = useState('matrix');
  const [logOptPower, setLogOptPower] = useState<number>(150);
  const [logOptSpeed, setLogOptSpeed] = useState<number>(1000);
  const [logOptZ, setLogOptZ] = useState<number>(-40);

  const categories: MaterialCategory[] = [
    'Wood',
    'Plastics',
    'Leather',
    'Stone',
    'Metals',
    'Paper/Cardboard',
    'Other',
  ];

  const categoryMaterials = materials.filter((m) => m.category === activeCategory);
  const activeMaterial = materials.find((m) => m.id === selectedMaterialId) || materials[0];

  const handleUpdateField = (field: string, subField: string | null, value: any) => {
    if (!activeMaterial) return;
    if (subField) {
      onUpdateMaterial({
        ...activeMaterial,
        [field]: {
          ...(activeMaterial[field as keyof MaterialProfile] as any),
          [subField]: value,
        },
      });
    } else {
      onUpdateMaterial({
        ...activeMaterial,
        [field]: value,
      });
    }
  };

  const handleCreateNewMaterial = () => {
    const newId = `material_${Date.now()}`;
    const newMat: MaterialProfile = {
      id: newId,
      name: `New Custom ${activeCategory} Sheet`,
      category: activeCategory,
      thickness: 3.0,
      laser: '5W Diode',
      focusZ: -40.0,
      engrave: {
        power: Math.round(pwmMax * 0.5),
        speed: 1500,
      },
      cut: {
        power: pwmMax,
        speed: 150,
      },
      history: [],
    };
    onCreateMaterial(newMat);
    onSelectMaterial(newId);
    setIsEditing(true);
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMaterial) return;

    const newLog: CalibrationHistoryEntry = {
      id: `log_${Date.now()}`,
      date: new Date().toISOString().substring(0, 16).replace('T', ' '),
      patternType: logPattern,
      optimalPower: logOptPower,
      optimalSpeed: logOptSpeed,
      optimalFocusZ: logOptZ,
      notes: logNotes || 'Finished calibration test.',
    };

    // Update material with new logs
    const updatedHistory = [newLog, ...activeMaterial.history];
    onUpdateMaterial({
      ...activeMaterial,
      history: updatedHistory,
      // optionally update the default engraved/cut values with winning settings
      engrave: {
        power: logOptPower,
        speed: logOptSpeed,
      },
      focusZ: logOptZ,
    });

    setLogNotes('');
    setShowLogForm(false);
  };

  const handleDeleteLog = (logId: string) => {
    if (!activeMaterial) return;
    const confirm = window.confirm("Delete this calibration entry?");
    if (confirm) {
      onUpdateMaterial({
        ...activeMaterial,
        history: activeMaterial.history.filter((h) => h.id !== logId),
      });
    }
  };

  return (
    <div id="material-database-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm text-slate-100 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FolderHeart className="text-emerald-400 w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-emerald-300">Material Calibration Database</h2>
        </div>
        <button
          id="toggle-edit-material-btn"
          onClick={() => setIsEditing(!isEditing)}
          className={`px-3 py-1 text-xs font-medium rounded-md transition ${
            isEditing
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {isEditing ? 'Save Details' : 'Edit Material'}
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1 mb-4 border-b border-slate-800 pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            id={`category-tab-${cat.toLowerCase().replace('/', '-')}`}
            onClick={() => {
              setActiveCategory(cat);
              const linkedMat = materials.find((m) => m.category === cat);
              if (linkedMat) {
                onSelectMaterial(linkedMat.id);
              }
            }}
            className={`px-2 py-1 text-[11px] font-medium rounded transition ${
              activeCategory === cat
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
        {/* Materials List under Active Category */}
        <div className="md:col-span-1 border-r border-slate-800 pr-4 space-y-2 flex flex-col justify-between max-h-[280px] md:max-h-none overflow-y-auto">
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-1">
              Select {activeCategory}
            </span>
            {categoryMaterials.length === 0 ? (
              <p className="text-slate-500 text-xs italic py-2">No material sheets added yet.</p>
            ) : (
              categoryMaterials.map((mat) => (
                <button
                  key={mat.id}
                  id={`material-select-${mat.id}`}
                  onClick={() => onSelectMaterial(mat.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition flex justify-between items-center ${
                    selectedMaterialId === mat.id
                      ? 'bg-emerald-900/30 text-emerald-200 font-medium border-l-2 border-emerald-500'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{mat.name}</span>
                  <span className="text-[10px] text-slate-500 shrink-0 font-mono italic">
                    {mat.thickness}mm
                  </span>
                </button>
              ))
            )}
          </div>

          <button
            id="add-new-material-btn"
            onClick={handleCreateNewMaterial}
            className="w-full mt-4 flex items-center justify-center gap-1 bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 text-slate-300 text-xs py-1.5 rounded-lg transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add {activeCategory}
          </button>
        </div>

        {/* Selected Material Parameters & Log Book */}
        <div className="md:col-span-2 space-y-4">
          {activeMaterial ? (
            <>
              {/* Profile Config */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                {isEditing ? (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">Sheet Name</label>
                      <input
                        id="edit-material-name"
                        type="text"
                        value={activeMaterial.name}
                        onChange={(e) => handleUpdateField('name', null, e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-slate-100 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-slate-400 mb-0.5">Thickness (mm)</label>
                        <input
                          id="edit-material-thickness"
                          type="number"
                          step="0.1"
                          value={activeMaterial.thickness}
                          onChange={(e) => handleUpdateField('thickness', null, parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-slate-100 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-0.5">Laser Rating</label>
                        <input
                          id="edit-material-laser"
                          type="text"
                          value={activeMaterial.laser}
                          onChange={(e) => handleUpdateField('laser', null, e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-slate-100 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-0.5">Optimal Z (mm)</label>
                        <input
                          id="edit-material-focusz"
                          type="number"
                          step="0.5"
                          value={activeMaterial.focusZ}
                          onChange={(e) => handleUpdateField('focusZ', null, parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-slate-100 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="border-t border-slate-800 pt-2 grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-amber-400 block mb-1">ENGRAVING DEFAULT</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="text-[10px] text-slate-400">Power</label>
                            <input
                              id="edit-material-engrave-power"
                              type="number"
                              min="0"
                              max={pwmMax}
                              value={activeMaterial.engrave.power}
                              onChange={(e) => handleUpdateField('engrave', 'power', parseInt(e.target.value) || 0)}
                              className="w-full bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-slate-100 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400">Speed (mm/m)</label>
                            <input
                              id="edit-material-engrave-speed"
                              type="number"
                              min="0"
                              value={activeMaterial.engrave.speed}
                              onChange={(e) => handleUpdateField('engrave', 'speed', parseInt(e.target.value) || 0)}
                              className="w-full bg-slate-800 border border-slate-700 px-1.5 py-0.5 text-slate-100 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-red-400 block mb-1">CUTTING DEFAULT</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="text-[10px] text-slate-400">Power</label>
                            <input
                              id="edit-material-cut-power"
                              type="number"
                              min="0"
                              max={pwmMax}
                              value={activeMaterial.cut.power}
                              onChange={(e) => handleUpdateField('cut', 'power', parseInt(e.target.value) || 0)}
                              className="w-full bg-slate-800 border border-slate-700 px-1.5 py-0.5 text-slate-100 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400">Speed (mm/m)</label>
                            <input
                              id="edit-material-cut-speed"
                              type="number"
                              min="0"
                              value={activeMaterial.cut.speed}
                              onChange={(e) => handleUpdateField('cut', 'speed', parseInt(e.target.value) || 0)}
                              className="w-full bg-slate-800 border border-slate-700 px-1.5 py-0.5 text-slate-100 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-800 pt-2">
                      <button
                        id="delete-material-btn"
                        type="button"
                        onClick={() => {
                          const conf = window.confirm(`Permanently delete ${activeMaterial.name}?`);
                          if (conf) {
                            onDeleteMaterial(activeMaterial.id);
                            setIsEditing(false);
                          }
                        }}
                        className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Material
                      </button>

                      <button
                        id="save-material-btn"
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1 rounded font-semibold text-xs flex items-center gap-1 transition shadow"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Done Saved
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 id="display-material-name" className="text-sm font-semibold text-slate-100">{activeMaterial.name}</h3>
                        <p className="text-[11px] text-slate-400">
                          {activeMaterial.thickness}mm thickness | Laser: {activeMaterial.laser}
                        </p>
                      </div>
                      <div className="bg-slate-800/80 rounded px-2.5 py-1 text-center font-mono text-[11px] border border-slate-700">
                        <span className="text-slate-400 text-[9px] uppercase block tracking-wider leading-none">Focus Z</span>
                        <span className="font-bold text-emerald-400 leading-normal">{activeMaterial.focusZ} mm</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-slate-900 pt-2 mt-2">
                      <div className="bg-amber-950/20 border border-amber-900/30 rounded p-2 text-slate-300">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block mb-0.5">Engrave Settings</span>
                        <div className="flex justify-between font-mono text-xs">
                          <span>Power: <strong className="text-slate-100">{activeMaterial.engrave.power}</strong></span>
                          <span>Speed: <strong className="text-slate-100">{activeMaterial.engrave.speed} mm/m</strong></span>
                        </div>
                      </div>
                      <div className="bg-rose-950/20 border border-rose-900/30 rounded p-2 text-slate-300">
                        <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest block mb-0.5">Cut Settings</span>
                        <div className="flex justify-between font-mono text-xs">
                          <span>Power: <strong className="text-slate-100">{activeMaterial.cut.power}</strong></span>
                          <span>Speed: <strong className="text-slate-100">{activeMaterial.cut.speed} mm/m</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Calibration Logs History (Knowledge base) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Calibration Logs</h4>
                  {!showLogForm && (
                    <button
                      id="log-calibration-test-btn"
                      onClick={() => {
                        setLogOptPower(activeMaterial.engrave.power);
                        setLogOptSpeed(activeMaterial.engrave.speed);
                        setLogOptZ(activeMaterial.focusZ);
                        setShowLogForm(true);
                      }}
                      className="bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[10px] uppercase font-semibold transition"
                    >
                      + Log Test Result
                    </button>
                  )}
                </div>

                {showLogForm && (
                  <form onSubmit={handleAddLog} id="calibration-log-form" className="bg-slate-950 border border-emerald-900/40 rounded-lg p-3 space-y-2.5 text-xs text-slate-300">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Log Test Result</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 block text-[10px] mb-0.5">Pattern Run</label>
                        <select
                          id="log-pattern"
                          value={logPattern}
                          onChange={(e) => setLogPattern(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1"
                        >
                          <option value="matrix">Power-Speed Matrix</option>
                          <option value="power_ramp">Power Ramp</option>
                          <option value="speed_ramp">Speed Ramp</option>
                          <option value="focus_ladder">Focus Ladder</option>
                          <option value="kerf_test">Kerf Clearence</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-slate-400 block text-[10px] mb-0.5">Optimal Focus Z (mm)</label>
                        <input
                          id="log-focusz"
                          type="number"
                          step="0.5"
                          value={logOptZ}
                          onChange={(e) => setLogOptZ(parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 block text-[10px] mb-0.5">Optimal Power (S)</label>
                        <input
                          id="log-power"
                          type="number"
                          min="0"
                          max={pwmMax}
                          value={logOptPower}
                          onChange={(e) => setLogOptPower(parseInt(e.target.value) || 120)}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block text-[10px] mb-0.5">Optimal Speed (mm/m)</label>
                        <input
                          id="log-speed"
                          type="number"
                          min="1"
                          value={logOptSpeed}
                          onChange={(e) => setLogOptSpeed(parseInt(e.target.value) || 1200)}
                          className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-400 block text-[10px] mb-0.5">Observations / Material Behavior</label>
                      <textarea
                        id="log-notes"
                        rows={2}
                        value={logNotes}
                        onChange={(e) => setLogNotes(e.target.value)}
                        placeholder="e.g. S150 was perfect dark brown, speed 1000 had lowest ash residue..."
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1 border-t border-slate-900">
                      <button
                        id="cancel-log-btn"
                        type="button"
                        onClick={() => setShowLogForm(false)}
                        className="text-slate-400 hover:text-slate-200"
                      >
                        Cancel
                      </button>
                      <button
                        id="save-log-btn"
                        type="submit"
                        className="bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1 rounded font-semibold"
                      >
                        Save to history
                      </button>
                    </div>
                  </form>
                )}

                {/* Log history list */}
                <div className="space-y-2 max-h-[160px] overflow-y-auto mt-2 pr-1">
                  {activeMaterial.history.length === 0 ? (
                    <p className="text-slate-500 text-xs italic py-2">No calibration logs saved yet for this sheet. Generate a matrix test to find optimal settings!</p>
                  ) : (
                    activeMaterial.history.map((log) => (
                      <div key={log.id} className="bg-slate-950 border border-slate-800/60 rounded-lg p-2.5 text-[11px] relative hover:border-slate-750 transition group">
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="absolute right-2 top-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                          title="Delete calibration entry"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[10px] mb-1">
                          <Calendar className="w-3 w-3 text-slate-500 shrink-0" />
                          <span>{log.date}</span>
                          <span className="mx-1">•</span>
                          <span className="text-amber-500 bg-amber-950/50 px-1 py-0.5 rounded capitalize">
                            {log.patternType.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 font-mono text-[10px] bg-slate-900/60 p-1.5 rounded mb-1 text-slate-300">
                          {log.optimalPower !== undefined && (
                            <span>Power: <strong className="text-emerald-400">{log.optimalPower}</strong></span>
                          )}
                          {log.optimalSpeed !== undefined && (
                            <span>Speed: <strong className="text-emerald-400">{log.optimalSpeed}</strong></span>
                          )}
                          {log.optimalFocusZ !== undefined && (
                            <span>Z: <strong className="text-emerald-400">{log.optimalFocusZ}mm</strong></span>
                          )}
                        </div>
                        <p className="text-slate-400 leading-relaxed italic">{log.notes}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-slate-400 text-xs text-center py-6">Select a category and material to configure.</p>
          )}
        </div>
      </div>
    </div>
  );
}
