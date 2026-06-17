import { useState, useEffect, useMemo } from 'react';
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
import Workspace from './components/layout/Workspace';
import LeftSidebar from './components/layout/LeftSidebar';
import CenterPanel from './components/layout/CenterPanel';
import MainCanvas from './components/layout/MainCanvas';
import GenerateFAB from './components/layout/GenerateFAB';
import StatusBar from './components/layout/StatusBar';

import { Info, Sun, Moon, BookOpen, AlertTriangle, X, Menu } from 'lucide-react';

export default function App() {
  const {
    isConnected,
    connectionState,
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

  const estimatedTimeStr = useMemo(() => {
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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement).isContentEditable;
      if (isEditable) return;

      switch (e.key) {
        case '1': setSidebarTab('machine'); break;
        case '2': setSidebarTab('material'); break;
        case '3': setCenterTab('pattern'); break;
        case '4': setCenterTab('presets'); break;
        case '5': setOutputTab('gcode'); break;
        case '6': setOutputTab('console'); break;
        case 'Escape':
          if (showHelpModal) setShowHelpModal(false);
          if (showDictionary) setShowDictionary(false);
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showHelpModal, showDictionary]);

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

          <button
            onClick={() => setSidebarOpen(true)}
            id="sidebar-hamburger-btn"
            className="lg:hidden flex items-center px-3 py-1.5 bg-[#222] border border-white/10 hover:bg-[#333] rounded text-[#AAA] hover:text-white transition-all duration-200 cursor-pointer text-xs"
            aria-label="Open sidebar navigation"
            title="Open sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>
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

      {/* Main Layout — Workspace with tabbed panels */}
      <Workspace>
        <LeftSidebar activeTab={sidebarTab} onTabChange={setSidebarTab} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)}>
          <MachineSelector
            machines={machines}
            selectedMachineId={selectedMachineId}
            onSelectMachine={setSelectedMachineId}
            onUpdateMachine={handleUpdateMachine}
            onCreateMachine={handleCreateMachine}
            onDeleteMachine={handleDeleteMachine}
            theme={theme}
          />
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
        </LeftSidebar>
        <CenterPanel activeTab={centerTab} onTabChange={setCenterTab}>
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
        </CenterPanel>
        <MainCanvas outputTab={outputTab} onOutputTabChange={setOutputTab} isConnected={isConnected}>
          {generatedResults && activeMachine && activeMaterial ? (
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
          ) : (
            <div className="flex-1 min-h-[300px] md:min-h-[400px] flex items-center justify-center text-neutral-500 text-xs">
              Configure a pattern and material to generate G-Code
            </div>
          )}
          {generatedResults ? (
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
          ) : (
            <div />
          )}
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
        </MainCanvas>
      </Workspace>

      {/* Floating Action Button */}
      <GenerateFAB
        disabled={!generatedResults}
        estimatedTimeStr={estimatedTimeStr}
        onClick={handleDownloadGCode}
      />

      {/* Status Bar */}
      <StatusBar
        isConnected={isConnected}
        connectionState={connectionState}
        machineName={activeMachine?.name ?? ''}
        firmware={activeMachine?.firmware ?? 'grbl'}
        materialName={activeMaterial?.name ?? ''}
        estimatedTimeStr={estimatedTimeStr}
        isDelta={activeMachine?.isDelta ?? false}
        deltaPrintRadius={activeMachine?.deltaPrintRadius}
        isPrinting={isPrinting}
        progress={progress}
      />

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
