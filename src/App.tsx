import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MachineProfile, MaterialProfile, PatternType } from './types';
import {
  getStoredMachines,
  getStoredMaterials,
  saveStoredMachines,
  saveStoredMaterials,
  INITIAL_MATERIALS,
  INITIAL_MACHINES
} from './lib/materialPresets';
import { generatePatternPaths, GeneratedData } from './lib/gcodeGenerator';
import { estimateToolpathTime, formatEstimatedTime } from './lib/timeEstimator';

import MachineSelector from './components/MachineSelector';
import MaterialDatabase from './components/MaterialDatabase';
import PatternConfigurator from './components/PatternConfigurator';
import PresetManager from './components/PresetManager';
import SVGVisualizer from './components/SVGVisualizer';
import GCodeOutput from './components/GCodeOutput';
import { PrinterConsole } from './components/PrinterConsole';
import { useWebSerial } from './lib/useWebSerial';
import GCodeDictionary from './components/GCodeDictionary';

import { Flame, Info, Sun, Moon, BookOpen, AlertTriangle, X } from 'lucide-react';

export default function App() {
  const {
    isConnected,
    messages,
    isPrinting,
    progress,
    connect,
    disconnect,
    send,
    printGCode,
    clearMessages
  } = useWebSerial();

  const [machines, setMachines] = useState<MachineProfile[]>([]);
  const [materials, setMaterials] = useState<MaterialProfile[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [selectedPattern, setSelectedPattern] = useState<PatternType>('matrix');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const stored = localStorage.getItem('laserbench_theme');
      return stored === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    try {
      localStorage.setItem('laserbench_theme', nextTheme);
    } catch (e) {
      console.warn('Failed to save theme setting', e);
    }
  };

  const [powerMin, setPowerMin] = useState<number>(50);
  const [powerMax, setPowerMax] = useState<number>(255);
  const [speedMin, setSpeedMin] = useState<number>(500);
  const [speedMax, setSpeedMax] = useState<number>(2500);
  const [powerSteps, setPowerSteps] = useState<number>(5);
  const [speedSteps, setSpeedSteps] = useState<number>(5);
  const [blockSize, setBlockSize] = useState<number>(12);

  const [nominalThickness, setNominalThickness] = useState<number>(3.0);
  const [kerfValues, setKerfValues] = useState<number[]>([0.05, 0.10, 0.15, 0.20, 0.25]);

  const [zMin, setZMin] = useState<number>(-43.0);
  const [zMax, setZMax] = useState<number>(-37.0);
  const [zSteps, setZSteps] = useState<number>(5);

  const [generatedResults, setGeneratedResults] = useState<GeneratedData | null>(null);
  const [hoveredPathIndex, setHoveredPathIndex] = useState<number | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showDictionary, setShowDictionary] = useState<boolean>(false);
  const [dismissedDeltaWarnings, setDismissedDeltaWarnings] = useState(false);

  const [sidebarTab, setSidebarTab] = useState<'machine' | 'material'>('machine');
  const [centerTab, setCenterTab] = useState<'pattern' | 'presets'>('pattern');
  const [outputTab, setOutputTab] = useState<'gcode' | 'console'>('gcode');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    const loadedMachines = getStoredMachines();
    const loadedMaterials = getStoredMaterials();
    setMachines(loadedMachines);
    setMaterials(loadedMaterials);
    if (loadedMachines.length > 0) setSelectedMachineId(loadedMachines[0].id);
    if (loadedMaterials.length > 0) setSelectedMaterialId(loadedMaterials[0].id);
  }, []);

  const activeMachine = machines.find((m) => m.id === selectedMachineId) || machines[0];
  const activeMaterial = materials.find((m) => m.id === selectedMaterialId) || materials[0];

  const estimatedTimeStr = React.useMemo(() => {
    if (!generatedResults || !activeMachine || !generatedResults.paths) return null;
    const seconds = estimateToolpathTime(generatedResults.paths, activeMachine);
    return formatEstimatedTime(seconds);
  }, [generatedResults, activeMachine]);

  useEffect(() => {
    if (activeMachine) {
      setPowerMin(Math.round(activeMachine.pwmMax * 0.2));
      setPowerMax(activeMachine.pwmMax);
      setZMin(activeMachine.workZ - 3.0);
      setZMax(activeMachine.workZ + 3.0);
    }
    if (activeMaterial) {
      setNominalThickness(activeMaterial.thickness);
    }
  }, [selectedMachineId, selectedMaterialId]);

  // Reset dismissed warnings when pattern or machine changes
  useEffect(() => {
    setDismissedDeltaWarnings(false);
  }, [selectedMachineId, selectedPattern, blockSize, powerSteps, speedSteps]);

  useEffect(() => {
    if (!activeMachine || !activeMaterial) return;
    const res = generatePatternPaths(selectedPattern, activeMachine, activeMaterial, {
      powerMin, powerMax, speedMin, speedMax,
      powerSteps, speedSteps, blockSize,
      nominalThickness, kerfValues,
      zMin, zMax, zSteps,
    });
    setGeneratedResults(res);
  }, [
    selectedPattern, selectedMachineId, selectedMaterialId,
    powerMin, powerMax, speedMin, speedMax,
    powerSteps, speedSteps, blockSize,
    nominalThickness, kerfValues,
    zMin, zMax, zSteps,
    machines, materials,
  ]);

  const handleUpdateMachine = (updated: MachineProfile) => {
    const updatedList = machines.map((m) => (m.id === updated.id ? updated : m));
    setMachines(updatedList);
    saveStoredMachines(updatedList);
  };
  const handleCreateMachine = (created: MachineProfile) => {
    const updatedList = [...machines, created];
    setMachines(updatedList);
    saveStoredMachines(updatedList);
  };
  const handleDeleteMachine = (id: string) => {
    const updatedList = machines.filter((m) => m.id !== id);
    setMachines(updatedList);
    saveStoredMachines(updatedList);
    if (selectedMachineId === id && updatedList.length > 0) setSelectedMachineId(updatedList[0].id);
  };
  const handleUpdateMaterial = (updated: MaterialProfile) => {
    const updatedList = materials.map((m) => (m.id === updated.id ? updated : m));
    setMaterials(updatedList);
    saveStoredMaterials(updatedList);
  };
  const handleCreateMaterial = (created: MaterialProfile) => {
    const updatedList = [...materials, created];
    setMaterials(updatedList);
    saveStoredMaterials(updatedList);
  };
  const handleDeleteMaterial = (id: string) => {
    const updatedList = materials.filter((m) => m.id !== id);
    setMaterials(updatedList);
    saveStoredMaterials(updatedList);
    if (selectedMaterialId === id && updatedList.length > 0) setSelectedMaterialId(updatedList[0].id);
  };

  const handleDownloadGCode = () => {
    if (!generatedResults) return;
    const blob = new Blob([generatedResults.gcode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeMatName = activeMaterial ? activeMaterial.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'material';
    link.download = `laserbench_${selectedPattern}_${safeMatName}.gcode`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const hasDeltaWarnings =
    !dismissedDeltaWarnings &&
    generatedResults?.deltaWarnings &&
    generatedResults.deltaWarnings.length > 0;

  return (
    <div id="laserbench-root" className={`min-h-screen bg-[#0A0A0A] text-[#E0E0E0] flex flex-col antialiased ${theme === 'light' ? 'theme-light' : ''}`}>
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-white/10 bg-[#0E0E0E] sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-red-600 flex items-center justify-center rounded-sm font-bold text-black font-sans select-none">LB</div>
          <h1 className="text-base font-medium tracking-tight text-white flex items-center gap-1.5">
            LaserBench
            <span className="text-[#666] font-normal italic text-xs">v1.3-beta</span>
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={() => setShowDictionary(true)}
            id="gcode-dict-header-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#222] border border-white/10 hover:bg-[#333] rounded text-[#AAA] hover:text-white transition-all duration-200 cursor-pointer text-xs font-semibold uppercase tracking-wider select-none outline-none"
            title="Open G-Code and M-Code Dictionary"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="hidden sm:inline">G-Code Dict</span>
          </button>

          <button
            onClick={toggleTheme}
            id="theme-toggle-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#222] border border-white/10 hover:bg-[#333] rounded text-[#AAA] hover:text-white transition-all duration-200 cursor-pointer text-xs font-semibold uppercase tracking-wider select-none outline-none"
            title={theme === 'dark' ? 'Switch to High Contrast Light Mode' : 'Switch to Elegant Dark Mode'}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="hidden sm:inline">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-550 shrink-0" />
                <span className="hidden sm:inline">Dark Mode</span>
              </>
            )}
          </button>

          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="label-caps !text-[9px]">Connected Machine</span>
            <span className="text-xs text-green-400 flex items-center gap-1.5 font-medium">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              {activeMachine ? activeMachine.name : 'FLSUN Kossel'} ({activeMachine?.firmware.toUpperCase()})
              {activeMachine?.isDelta && <span className="text-purple-400 font-bold">Δ</span>}
            </span>
          </div>
          {generatedResults && (
            <button
              onClick={handleDownloadGCode}
              className="bg-red-600 hover:bg-red-500 text-black px-4 py-1.5 rounded font-bold text-xs tracking-tight transition-all duration-200 cursor-pointer accent-glow"
            >
              GENERATE G-CODE
            </button>
          )}
        </div>
      </header>

      {/* Delta Reachability Warning Banner */}
      {hasDeltaWarnings && (
        <div className="bg-amber-950/60 border-b border-amber-800/50 px-6 py-2.5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <div className="text-xs leading-relaxed">
              <strong className="text-amber-400 font-bold uppercase tracking-wider">Delta Reachability Warning</strong>
              <span className="mx-1.5 text-amber-600">—</span>
              {generatedResults!.deltaWarnings!.length} segment{generatedResults!.deltaWarnings!.length > 1 ? 's' : ''} may be outside your delta's print radius.
              <span className="ml-1.5 text-amber-500/80">Try reducing block size or pattern step count.</span>
            </div>
          </div>
          <button
            onClick={() => setDismissedDeltaWarnings(true)}
            className="text-amber-600 hover:text-amber-300 transition shrink-0 mt-0.5"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-full">

        {/* Left: Machine + Material */}
        <div className="lg:col-span-4 space-y-6 flex flex-col h-full justify-start">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <MachineSelector
              machines={machines}
              selectedMachineId={selectedMachineId}
              onSelectMachine={setSelectedMachineId}
              onUpdateMachine={handleUpdateMachine}
              onCreateMachine={handleCreateMachine}
              onDeleteMachine={handleDeleteMachine}
              theme={theme}
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="flex-1">
            <MaterialDatabase
              materials={materials}
              selectedMaterialId={selectedMaterialId}
              pwmMax={activeMachine ? activeMachine.pwmMax : 255}
              onSelectMaterial={setSelectedMaterialId}
              onUpdateMaterial={handleUpdateMaterial}
              onCreateMaterial={handleCreateMaterial}
              onDeleteMaterial={handleDeleteMaterial}
              theme={theme}
            />
          </motion.div>
        </div>

        {/* Middle: Pattern Configurator + Presets */}
        <div className="lg:col-span-4 h-full flex flex-col justify-start space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
            <PatternConfigurator
              selectedPattern={selectedPattern}
              onSelectPattern={setSelectedPattern}
              powerMin={powerMin}
              powerMax={powerMax}
              speedMin={speedMin}
              speedMax={speedMax}
              powerSteps={powerSteps}
              speedSteps={speedSteps}
              blockSize={blockSize}
              nominalThickness={nominalThickness}
              kerfValues={kerfValues}
              zMin={zMin}
              zMax={zMax}
              zSteps={zSteps}
              pwmMax={activeMachine ? activeMachine.pwmMax : 255}
              onSetPowerMin={setPowerMin}
              onSetPowerMax={setPowerMax}
              onSetSpeedMin={setSpeedMin}
              onSetSpeedMax={setSpeedMax}
              onSetPowerSteps={setPowerSteps}
              onSetSpeedSteps={setSpeedSteps}
              onSetNominalThickness={setNominalThickness}
              onSetKerfValues={setKerfValues}
              onSetZMin={setZMin}
              onSetZMax={setZMax}
              onSetZSteps={setZSteps}
              onSetBlockSize={setBlockSize}
              theme={theme}
            />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.18 }}>
            <PresetManager
              currentPattern={selectedPattern}
              powerMin={powerMin}
              powerMax={powerMax}
              speedMin={speedMin}
              speedMax={speedMax}
              powerSteps={powerSteps}
              speedSteps={speedSteps}
              blockSize={blockSize}
              nominalThickness={nominalThickness}
              kerfValues={kerfValues}
              zMin={zMin}
              zMax={zMax}
              zSteps={zSteps}
              pwmMax={activeMachine ? activeMachine.pwmMax : 255}
              onLoadPreset={(preset) => {
                setSelectedPattern(preset.patternType);
                setPowerMin(preset.powerMin);
                setPowerMax(preset.powerMax);
                setSpeedMin(preset.speedMin);
                setSpeedMax(preset.speedMax);
                setPowerSteps(preset.powerSteps);
                setSpeedSteps(preset.speedSteps);
                setBlockSize(preset.blockSize);
                setNominalThickness(preset.nominalThickness);
                setKerfValues(preset.kerfValues);
                setZMin(preset.zMin);
                setZMax(preset.zMax);
                setZSteps(preset.zSteps);
                setCenterTab('pattern');
              }}
              theme={theme}
            />
          </motion.div>
        </div>

        {/* Right: Visualizer + G-Code + Console */}
        <div className="lg:col-span-4 space-y-6 h-full flex flex-col justify-start">
          {generatedResults && activeMachine && activeMaterial && (
            <>
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, delay: 0.2 }} className="flex-1">
                <SVGVisualizer
                  svgPathData={generatedResults.svgPathData}
                  machine={activeMachine}
                  material={activeMaterial}
                  patternType={selectedPattern}
                  paths={generatedResults.paths}
                  theme={theme}
                  hoveredPathIndex={hoveredPathIndex}
                  onHoverPath={setHoveredPathIndex}
                />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.25 }}>
                <GCodeOutput
                  gcode={generatedResults.gcode}
                  patternType={selectedPattern}
                  machine={activeMachine}
                  material={activeMaterial}
                  paths={generatedResults.paths}
                  theme={theme}
                  hoveredPathIndex={hoveredPathIndex}
                  onHoverPath={setHoveredPathIndex}
                  onPrint={() => { setOutputTab('console'); printGCode(generatedResults.gcode); }}
                  isPrinterConnected={isConnected}
                  isPrinting={isPrinting}
                />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }}>
                <PrinterConsole
                  isConnected={isConnected}
                  messages={messages}
                  isPrinting={isPrinting}
                  progress={progress}
                  onConnect={() => connect(250000)}
                  onDisconnect={disconnect}
                  onSend={send}
                  onClear={clearMessages}
                  activeMachine={activeMachine}
                  theme={theme}
                />
              </motion.div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="h-10 bg-[#0E0E0E] border-t border-white/10 flex items-center px-6 justify-between text-[11px] text-[#888] shrink-0 select-none">
        <div className="flex gap-4 font-mono text-[10px] items-center">
          <span>BUFFER: READY</span>
          <span>Z-FOCUS: {activeMaterial ? `${activeMaterial.focusZ}mm` : '-40.00mm'}</span>
          <span>LASER: {activeMaterial ? activeMaterial.laser.toUpperCase() : 'DIODE 5W'}</span>
          {activeMachine?.isDelta && (
            <span className="text-purple-400 font-bold border-l border-white/10 pl-4 flex items-center gap-1">
              Δ DELTA · R={activeMachine.deltaPrintRadius ?? 85}mm
            </span>
          )}
          {estimatedTimeStr && (
            <span className="text-amber-500 font-bold border-l border-white/10 pl-4 flex items-center gap-1">
              ⏱️ EST. BURN TIME: {estimatedTimeStr}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowDictionary(true)}
            className="text-indigo-500 hover:text-indigo-400 font-semibold underline flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition select-none"
          >
            <BookOpen className="w-3.5 h-3.5 inline" />
            G-Code Dictionary
          </button>
          <span className="text-zinc-700 select-none">|</span>
          <button
            onClick={() => setShowHelpModal(true)}
            className="text-red-500 hover:text-red-400 font-semibold underline flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition select-none"
          >
            <Info className="w-3.5 h-3.5 inline" />
            Troubleshoot instructions
          </button>
        </div>
      </footer>

      {/* Help Modal */}
      {showHelpModal && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowHelpModal(false)}
        >
          <div
            className="bg-[#0E0E0E] border border-red-900/60 rounded p-6 max-w-lg w-full text-[#E0E0E0] shadow-2xl relative space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-white/8 pb-3">
              <Info className="text-red-500 w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">LaserBench Calibration Guide</h3>
            </div>
            <div className="space-y-3.5 text-xs leading-relaxed text-neutral-300">
              {[
                ['01', 'Config Machine Profile', 'Select your machine (Marlin Delta or GRBL Rectangular). Configure physical coordinate bounds, focal elevations, and feed rates. Enable Delta Kinematics to validate pattern reachability.'],
                ['02', 'Load Material Database', 'Load timber wood or cast acrylic sheets. Record completed burns directly into the localized log history database.'],
                ['03', 'Customize Patterns', 'Select Matrix grids, power blocks, speed ramps, Z focus ladders, or clearance kerf combs to isolate properties.'],
                ['04', 'Run & Save Optimal Log', 'Burn G-code physically, evaluate visual result, key in optimum values, and build your benchmark library.'],
              ].map(([step, title, desc]) => (
                <div key={step} className="flex gap-2.5">
                  <span className="font-mono text-xs text-red-400 font-bold bg-red-950/45 px-2 py-0.5 rounded h-fit">{step}</span>
                  <div>
                    <h4 className="font-bold text-white mb-0.5">{title}</h4>
                    <p>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-red-950/15 border border-red-900/30 p-2.5 rounded text-[10px] text-red-300/80 leading-normal font-sans">
              <strong>⚠️ Laser Ignition & Optical Safety:</strong> Always operate inside a fire-resistant enclosure. Wear laser safety glasses calibrated for your diode wavelength (e.g., OD5+ protection).
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowHelpModal(false)}
                className="bg-red-650 hover:bg-red-600 text-white px-4 py-1.5 rounded font-bold text-xs tracking-tight transition cursor-pointer"
              >
                DISMISS GUIDE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* G-Code Dictionary Modal */}
      {showDictionary && (
        <GCodeDictionary
          onClose={() => setShowDictionary(false)}
          theme={theme}
        />
      )}
    </div>
  );
}
