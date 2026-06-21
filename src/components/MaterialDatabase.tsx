import { useState, memo, type FormEvent, type FC } from 'react';
import { MaterialProfile, MaterialCategory, CalibrationHistoryEntry, FirmwareType } from '../types';
import {
  FolderHeart, Plus, Trash2, Calendar, Check,
  TreePine, Beaker, Shirt, Mountain, Hammer, FileText, Package,
  ChevronDown, Inbox,
} from 'lucide-react';
import { useConfirmModal } from '../hooks/useConfirmModal';

interface MaterialDatabaseProps {
  materials: MaterialProfile[];
  selectedMaterialId: string;
  pwmMax: number;
  firmware: FirmwareType;
  onSelectMaterial: (id: string) => void;
  onUpdateMaterial: (material: MaterialProfile) => void;
  onCreateMaterial: (material: MaterialProfile) => void;
  onDeleteMaterial: (id: string) => void;
  /** When provided, the 'Log Test Result' button opens the Quick Log modal instead of the inline form */
  onQuickLog?: () => void;
  theme?: 'dark' | 'light';
}

const categories: MaterialCategory[] = [
  'Wood', 'Plastics', 'Leather', 'Stone', 'Metals', 'Paper/Cardboard', 'Other',
];

const categoryIcons: Record<MaterialCategory, FC<{className?: string}>> = {
  Wood: TreePine,
  Plastics: Beaker,
  Leather: Shirt,
  Stone: Mountain,
  Metals: Hammer,
  'Paper/Cardboard': FileText,
  Other: Package,
};

export default memo(function MaterialDatabase({
  materials,
  selectedMaterialId,
  pwmMax,
  firmware,
  onSelectMaterial,
  onUpdateMaterial,
  onCreateMaterial,
  onDeleteMaterial,
  onQuickLog,
  theme = 'dark',
}: MaterialDatabaseProps) {
  const isLight = theme === 'light';
  const { confirm, ConfirmModalComponent } = useConfirmModal(theme);
  const [activeCategory, setActiveCategory] = useState<MaterialCategory>('Wood');
  const [isEditing, setIsEditing] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logExpanded, setLogExpanded] = useState(false);

  const [logNotes, setLogNotes] = useState('');
  const [logPattern, setLogPattern] = useState('matrix');
  const [logOptPower, setLogOptPower] = useState<number>(150);
  const [logOptSpeed, setLogOptSpeed] = useState<number>(1000);
  const [logOptZ, setLogOptZ] = useState<number>(0);

  const powerUnit = firmware === 'grbl' ? `PWM (0–${pwmMax})` : `Power % (0–${pwmMax})`;

  const categoryMaterials = materials.filter((m) => m.category === activeCategory);
  const activeMaterial = materials.find((m) => m.id === selectedMaterialId) || materials[0] || null;

  const handleUpdateField = (field: string, subField: string | null, value: string | number | undefined) => {
    if (!activeMaterial) return;
    if (subField) {
      onUpdateMaterial({
        ...activeMaterial,
        [field]: {
          ...(activeMaterial[field as keyof MaterialProfile] as Record<string, string | number | undefined>),
          [subField]: value,
        },
      });
    } else {
      const update = { ...activeMaterial };
      if (value === undefined) {
        delete (update as Record<string, unknown>)[field];
      } else {
        (update as Record<string, unknown>)[field] = value;
      }
      onUpdateMaterial(update as MaterialProfile);
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

  const handleAddLog = (e: FormEvent) => {
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

    const updatedHistory = [newLog, ...activeMaterial.history];
    onUpdateMaterial({
      ...activeMaterial,
      history: updatedHistory,
      engrave: {
        power: logOptPower,
        speed: logOptSpeed,
      },
      focusZ: logOptZ,
    });

    setLogNotes('');
    setShowLogForm(false);
  };

  const handleDeleteLog = async (logId: string) => {
    if (!activeMaterial) return;
    const ok = await confirm("Delete this calibration entry?");
    if (ok) {
      onUpdateMaterial({
        ...activeMaterial,
        history: activeMaterial.history.filter((h) => h.id !== logId),
      });
    }
  };

  return (
    <div
      id="material-database-card"
      className={`border rounded-lg p-3 shadow-sm flex flex-col h-full transition-all duration-200 ${
        isEditing ? 'border-l-2 border-l-red-600 border-white/8' :
        isLight ? 'bg-white border-zinc-200 text-zinc-800' : 'bg-[#0F0F0F] border-white/10 text-[#E8E8E8]'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FolderHeart className="text-red-500 w-5 h-5" />
          <h2 className={`text-sm font-semibold tracking-wide uppercase font-sans ${isLight ? 'text-zinc-800' : 'text-white'}`}>
            Material Calibration Database
          </h2>
        </div>
        <button
          id="toggle-edit-material-btn"
          onClick={() => setIsEditing(!isEditing)}
          className={`px-3 py-1.5 text-xs font-bold rounded transition-all duration-200 cursor-pointer ${
            isEditing
              ? isLight
                ? 'bg-red-600 text-white hover:bg-red-500 shadow-sm'
                : 'bg-red-600 text-black hover:bg-red-500 accent-glow'
              : isLight
                ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200'
                : 'bg-[#222] text-[#AAA] hover:bg-[#333]'
          }`}
        >
          {isEditing ? 'Save Details' : 'Edit Material'}
        </button>
      </div>

      {/* Category Tabs — icon+label on md+, icon-only on sm */}
      <div className={`flex flex-wrap gap-1 mb-2 border-b pb-1.5 ${isLight ? 'border-zinc-250' : 'border-white/8'}`}>
        {categories.map((cat) => {
          const Icon = categoryIcons[cat];
          return (
            <button
              key={cat}
              id={`category-tab-${cat.toLowerCase().replace('/', '-')}`}
              aria-label={cat}
              onClick={() => {
                setActiveCategory(cat);
                const linkedMat = materials.find((m) => m.category === cat);
                if (linkedMat) {
                  onSelectMaterial(linkedMat.id);
                }
              }}
              className={`px-2 py-1.5 text-[11px] font-bold rounded transition-all duration-200 cursor-pointer ${
                activeCategory === cat
                  ? isLight
                    ? 'bg-red-50 text-red-500 border border-red-200 shadow-xs'
                    : 'bg-red-950/40 text-red-400 border border-red-900/40'
                  : isLight
                    ? 'text-zinc-600 hover:text-black hover:bg-zinc-100 border border-transparent'
                    : 'text-[#707070] hover:text-[#E8E8E8] hover:bg-[#1A1A1A] border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5 inline" />
              <span className="hidden md:inline ml-1">{cat}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 flex-1 overflow-y-auto">
        {/* Materials List */}
        <div className={`space-y-1 flex flex-col ${
          isLight ? '' : ''
        }`}>
          <div className="space-y-1">
            <span className={`block mb-1 label-caps ${isLight ? 'text-zinc-500' : ''}`}>
              Select {activeCategory}
            </span>
            {categoryMaterials.length === 0 ? (
              <div className={`flex flex-col items-center gap-2 py-4 px-2 rounded-lg border border-dashed ${isLight ? 'border-zinc-200 bg-zinc-50/50' : 'border-white/8 bg-[#080808]/50'}`}>
                <Inbox className={`w-5 h-5 ${isLight ? 'text-zinc-300' : 'text-[#333333]'}`} />
                <p className={`text-xs text-center leading-snug ${isLight ? 'text-zinc-400' : 'text-[#505050]'}`}>
                  No {activeCategory.toLowerCase()} sheets yet.
                  <br />
                  <span className={`text-[10px] ${isLight ? 'text-zinc-300' : 'text-[#404040]'}`}>Add one to start calibrating.</span>
                </p>
              </div>
            ) : (
              categoryMaterials.map((mat) => (
                <button
                  key={mat.id}
                  id={`material-select-${mat.id}`}
                  onClick={() => onSelectMaterial(mat.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition flex justify-between items-center gap-2 cursor-pointer ${
                    selectedMaterialId === mat.id
                      ? isLight
                        ? 'bg-red-50 text-red-600 font-bold border-l-2 border-red-600'
                        : 'bg-[#1E1414] text-red-400 font-bold border-l-2 border-red-600'
                      : isLight
                        ? 'text-zinc-600 hover:bg-zinc-100 hover:text-black'
                        : 'text-neutral-400 hover:bg-[#1A1A1A] hover:text-white'
                  }`}
                >
                  <span className="break-words leading-tight">{mat.name}</span>
                  <span className={`text-[10px] shrink-0 font-mono italic ${isLight ? 'text-zinc-400' : 'text-neutral-500'}`}>
                    {mat.thickness}mm
                  </span>
                </button>
              ))
            )}
          </div>

          <button
            id="add-new-material-btn"
            onClick={handleCreateNewMaterial}
            className={`w-full mt-4 flex items-center justify-center gap-1 border text-xs py-1.5 rounded transition cursor-pointer font-bold ${
              isLight
                ? 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200'
                : 'bg-[#222] border-white/10 hover:bg-[#333] hover:border-white/15 text-[#E8E8E8]'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Add {activeCategory}
          </button>
        </div>

        {/* Material Detail + Log */}
        <div className="space-y-3">
          {activeMaterial ? (
            <>
              {/* Profile Config */}
              <div className={`p-3.5 rounded border transition-all duration-200 ${
                isLight
                  ? 'bg-zinc-50 border-zinc-200 text-zinc-800'
                  : 'bg-[#1A1A1A] border-white/10'
              }`}>
                {isEditing ? (
                  /* ── Edit mode (unchanged) ── */
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block mb-1 label-caps">Sheet Name</label>
                      <input
                        id="edit-material-name"
                        type="text"
                        value={activeMaterial.name}
                        onChange={(e) => handleUpdateField('name', null, e.target.value)}
                        className="w-full elegant-input rounded-md px-2 py-1"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block mb-0.5 label-caps">Thickness (mm)</label>
                        <input
                          id="edit-material-thickness"
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={activeMaterial.thickness}
                          onChange={(e) => handleUpdateField('thickness', null, Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                          className="w-full elegant-input rounded-md px-2 py-1"
                        />
                      </div>
                      <div>
                        <label className="block mb-0.5 label-caps">Laser Rating</label>
                        <input
                          id="edit-material-laser"
                          type="text"
                          value={activeMaterial.laser}
                          onChange={(e) => handleUpdateField('laser', null, e.target.value)}
                          className="w-full elegant-input rounded-md px-2 py-1"
                        />
                      </div>
                      <div>
                        <label className="block mb-0.5 label-caps">Optimal Z (mm)</label>
                        <input
                          id="edit-material-focusz"
                          type="number"
                          min="0"
                          step="0.5"
                          placeholder="—"
                          value={activeMaterial.focusZ ?? ''}
                          onChange={(e) => handleUpdateField('focusZ', null, e.target.value === '' ? undefined : Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full elegant-input rounded-md px-2 py-1"
                        />
                      </div>
                    </div>

                    <div className={`border-t pt-2 grid grid-cols-2 gap-3 ${isLight ? 'border-zinc-200' : 'border-white/8'}`}>
                      <div>
                        <span className="text-[10px] font-bold text-red-500 block mb-1">ENGRAVING DEFAULT</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="text-[9px] label-caps block">{powerUnit}</label>
                            <input
                              id="edit-material-engrave-power"
                              type="number"
                              min="0"
                              max={pwmMax}
                              value={activeMaterial.engrave.power}
                              onChange={(e) => handleUpdateField('engrave', 'power', parseInt(e.target.value) || 0)}
                              className="w-full elegant-input rounded px-1.5 py-0.5 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] label-caps block">Speed (m/m)</label>
                            <input
                              id="edit-material-engrave-speed"
                              type="number"
                              min="0"
                              value={activeMaterial.engrave.speed}
                              onChange={(e) => handleUpdateField('engrave', 'speed', parseInt(e.target.value) || 0)}
                              className="w-full elegant-input px-1.5 py-0.5 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-red-600 block mb-1">CUTTING DEFAULT</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="text-[9px] label-caps block">{powerUnit}</label>
                            <input
                              id="edit-material-cut-power"
                              type="number"
                              min="0"
                              max={pwmMax}
                              value={activeMaterial.cut.power}
                              onChange={(e) => handleUpdateField('cut', 'power', parseInt(e.target.value) || 0)}
                              className="w-full elegant-input rounded px-1.5 py-0.5 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] label-caps block">Speed (m/m)</label>
                            <input
                              id="edit-material-cut-speed"
                              type="number"
                              min="0"
                              value={activeMaterial.cut.speed}
                              onChange={(e) => handleUpdateField('cut', 'speed', parseInt(e.target.value) || 0)}
                              className="w-full elegant-input px-1.5 py-0.5 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={`flex justify-between items-center border-t pt-2 ${isLight ? 'border-zinc-200' : 'border-white/8'}`}>
                      <button
                        id="delete-material-btn"
                        type="button"
                        onClick={async () => {
                          const ok = await confirm(`Permanently delete ${activeMaterial.name}?`);
                          if (ok) {
                            onDeleteMaterial(activeMaterial.id);
                            setIsEditing(false);
                          }
                        }}
                        className="text-red-500 hover:text-red-400 text-xs flex items-center gap-1 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Material
                      </button>

                      <button
                        id="save-material-btn"
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className={`px-3 py-1 rounded font-bold text-xs flex items-center gap-1 transition cursor-pointer ${
                          isLight
                            ? 'bg-red-600 text-white hover:bg-red-500 shadow-xs'
                            : 'bg-red-600 text-black hover:bg-red-500'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Done Saved
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Compact summary row (non-edit mode) ── */
                  <div className="space-y-1 text-xs" data-testid="material-summary">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className={`text-sm font-semibold ${isLight ? 'text-zinc-800' : 'text-white'}`}>
                        {activeMaterial.name}
                      </span>
                      <span className={isLight ? 'text-zinc-500' : 'text-neutral-400'}>{activeMaterial.thickness}mm</span>
                      <span className="text-neutral-500">|</span>
                      <span className={isLight ? 'text-zinc-500' : 'text-neutral-400'}>Z: {activeMaterial.focusZ != null ? `${activeMaterial.focusZ}mm` : '—'}</span>
                      <span className="text-neutral-500">|</span>
                      <span className={isLight ? 'text-zinc-500' : 'text-neutral-400'}>{activeMaterial.laser}</span>
                    </div>
                    <div className={`mono text-[11px] ${isLight ? 'text-zinc-600' : 'text-neutral-300'}`}>
                      Engrave: S{activeMaterial.engrave.power} F{activeMaterial.engrave.speed} &nbsp;&nbsp;
                      Cut: S{activeMaterial.cut.power} F{activeMaterial.cut.speed}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Calibration Log (collapsible) ── */}
              <div className="space-y-2">
                <button
                  aria-expanded={logExpanded}
                  aria-controls="calibration-log-content"
                  onClick={() => setLogExpanded(!logExpanded)}
                  className={`w-full flex items-center justify-between text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                    isLight ? 'text-zinc-500 hover:text-zinc-800' : 'text-[#707070] hover:text-white'
                  }`}
                >
                  <span>Calibration Log</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${logExpanded ? 'rotate-180' : ''}`} />
                </button>

                <div id="calibration-log-content" className={logExpanded ? 'block' : 'hidden'}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-[#505050]'}`}>
                      History
                    </h4>
                    {!showLogForm && (
                      <button
                        id="log-calibration-test-btn"
                        onClick={() => {
                          if (onQuickLog) {
                            onQuickLog();
                          } else {
                            setLogOptPower(activeMaterial.engrave.power);
                            setLogOptSpeed(activeMaterial.engrave.speed);
                            setLogOptZ(activeMaterial.focusZ ?? 0);
                            setShowLogForm(true);
                          }
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-tight transition cursor-pointer border ${
                          isLight
                            ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                            : 'bg-red-950/45 border-red-900/40 text-red-400 hover:bg-red-900/40'
                        }`}
                      >
                        {onQuickLog ? '+ Quick Log Burn' : '+ Log Test Result'}
                      </button>
                    )}
                  </div>

                  {showLogForm && (
                    <form onSubmit={handleAddLog} id="calibration-log-form" className={`border rounded p-3 space-y-2.5 text-xs ${
                      isLight
                        ? 'bg-zinc-50 border-red-200 text-zinc-800'
                        : 'bg-[#1A1A1A] border-red-900/40 text-neutral-300'
                    }`}>
                      <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">Log Test Result</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block mb-0.5 label-caps">Pattern Run</label>
                          <select
                            id="log-pattern"
                            value={logPattern}
                            onChange={(e) => setLogPattern(e.target.value)}
                            className="w-full elegant-input rounded px-2 py-1"
                          >
                            <option value="matrix" className={isLight ? 'bg-white text-zinc-800' : 'bg-[#1A1A1A]'}>Power-Speed Matrix</option>
                            <option value="power_ramp" className={isLight ? 'bg-white text-zinc-800' : 'bg-[#1A1A1A]'}>Power Ramp</option>
                            <option value="speed_ramp" className={isLight ? 'bg-white text-zinc-800' : 'bg-[#1A1A1A]'}>Speed Ramp</option>
                            <option value="focus_ladder" className={isLight ? 'bg-white text-zinc-800' : 'bg-[#1A1A1A]'}>Focus Ladder</option>
                            <option value="kerf_test" className={isLight ? 'bg-white text-zinc-800' : 'bg-[#1A1A1A]'}>Kerf Clearance</option>
                          </select>
                        </div>
                        <div>
                          <label className="block mb-0.5 label-caps">Optimal Focus Z (mm)</label>
                          <input
                            id="log-focusz"
                            type="number"
                            min="0"
                            step="0.5"
                            value={logOptZ}
                            onChange={(e) => setLogOptZ(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full elegant-input rounded px-2 py-1"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block mb-0.5 label-caps">Optimal {powerUnit}</label>
                          <input
                            id="log-power"
                            type="number"
                            min="0"
                            max={pwmMax}
                            value={logOptPower}
                            onChange={(e) => setLogOptPower(parseInt(e.target.value) || 120)}
                            className="w-full elegant-input rounded px-2 py-1"
                          />
                        </div>
                        <div>
                          <label className="block mb-0.5 label-caps">Optimal Speed (mm/m)</label>
                          <input
                            id="log-speed"
                            type="number"
                            min="1"
                            value={logOptSpeed}
                            onChange={(e) => setLogOptSpeed(parseInt(e.target.value) || 1200)}
                            className="w-full elegant-input rounded px-2 py-1"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block mb-0.5 label-caps">Observations / Material Behavior</label>
                        <textarea
                          id="log-notes"
                          rows={2}
                          value={logNotes}
                          onChange={(e) => setLogNotes(e.target.value)}
                          placeholder="e.g. S150 was perfect dark brown, speed 1000 had lowest ash residue..."
                          className="w-full elegant-input rounded px-2 py-1 placeholder:text-neutral-500"
                        />
                      </div>

                      <div className={`flex justify-end gap-2 pt-1 border-t ${isLight ? 'border-zinc-200' : 'border-white/8'}`}>
                        <button
                          id="cancel-log-btn"
                          type="button"
                          onClick={() => setShowLogForm(false)}
                          className={`cursor-pointer ${isLight ? 'text-zinc-500 hover:text-black font-semibold' : 'text-[#707070] hover:text-white'}`}
                        >
                          Cancel
                        </button>
                        <button
                          id="save-log-btn"
                          type="submit"
                          className={`px-2.5 py-1 rounded font-bold cursor-pointer ${
                            isLight
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-red-600 text-black hover:bg-red-500'
                          }`}
                        >
                          Save to history
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-2 max-h-[160px] overflow-y-auto mt-2 pr-1">
                    {activeMaterial.history.length === 0 ? (
                      <div className={`flex flex-col items-center gap-2 py-4 px-2 rounded border border-dashed ${isLight ? 'border-zinc-200 bg-zinc-50/30' : 'border-white/5 bg-[#080808]/30'}`}>
                        <Calendar className={`w-4 h-4 ${isLight ? 'text-zinc-300' : 'text-[#333333]'}`} />
                        <p className={`text-[11px] text-center leading-snug ${isLight ? 'text-zinc-400' : 'text-[#505050]'}`}>
                          No calibration logs yet.
                          <br />
                          <span className={`text-[10px] ${isLight ? 'text-zinc-300' : 'text-[#404040]'}`}>Run a matrix test to find optimal settings.</span>
                        </p>
                      </div>
                    ) : (
                      activeMaterial.history.map((log) => (
                        <div key={log.id} className={`border rounded p-2.5 text-[11px] relative transition-all duration-200 group ${
                          isLight
                            ? 'bg-zinc-50 border-zinc-200 hover:border-zinc-350 text-zinc-700'
                            : 'bg-[#1A1A1A] border-white/8 hover:border-white/12 text-neutral-300'
                        }`}>
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className={`absolute right-2 top-2 hover:text-red-500 opacity-0 group-hover:opacity-100 transition cursor-pointer ${
                              isLight ? 'text-zinc-400' : 'text-[#505050]'
                            }`}
                            title="Delete calibration entry"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <div className={`flex items-center gap-1.5 font-mono text-[10px] mb-1 ${isLight ? 'text-zinc-500' : 'text-neutral-400'}`}>
                            <Calendar className={`w-3 h-3 shrink-0 ${isLight ? 'text-zinc-400' : 'text-[#505050]'}`} />
                            <span>{log.date}</span>
                            <span className="mx-1">•</span>
                            <span className={`px-1 py-0.5 rounded capitalize ${
                              isLight
                                ? 'text-red-600 bg-red-50 font-semibold'
                                : 'text-red-400 bg-red-950/20'
                            }`}>
                              {log.patternType.replace('_', ' ')}
                            </span>
                          </div>
                          <div className={`grid grid-cols-3 gap-1 font-mono text-[10px] p-1.5 rounded mb-1 ${
                            isLight
                              ? 'bg-zinc-200/50 text-zinc-800'
                              : 'bg-[#0F0F0F] text-neutral-300'
                          }`}>
                            {log.optimalPower !== undefined && (
                              <span>Power: <strong className={isLight ? 'text-red-600' : 'text-red-400'}>{log.optimalPower}</strong></span>
                            )}
                            {log.optimalSpeed !== undefined && (
                              <span>Speed: <strong className={isLight ? 'text-red-600' : 'text-red-400'}>{log.optimalSpeed}</strong></span>
                            )}
                            {log.optimalFocusZ !== undefined && (
                              <span>Z: <strong className={isLight ? 'text-red-600' : 'text-red-400'}>{log.optimalFocusZ}mm</strong></span>
                            )}
                          </div>
                          <p className={isLight ? 'text-zinc-600 leading-relaxed italic' : 'text-[#AAA] leading-relaxed italic'}>{log.notes}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className={`flex flex-col items-center justify-center gap-3 py-10 rounded-lg border border-dashed ${isLight ? 'border-zinc-200 bg-zinc-50/50' : 'border-white/8 bg-[#080808]/50'}`}>
              <FolderHeart className={`w-8 h-8 ${isLight ? 'text-zinc-300' : 'text-[#252525]'}`} />
              <div className="text-center space-y-1">
                <p className={`text-xs font-medium ${isLight ? 'text-zinc-500' : 'text-[#606060]'}`}>
                  No material selected
                </p>
                <p className={`text-[10px] leading-snug max-w-[200px] ${isLight ? 'text-zinc-400' : 'text-[#505050]'}`}>
                  Select a material from the list on the left, or add a new one to configure engrave and cut defaults.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      {ConfirmModalComponent}
    </div>
  );
});
