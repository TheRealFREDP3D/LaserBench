import { useState, useEffect, useMemo, useCallback } from 'react';
import { MachineProfile, MaterialProfile, PatternType, CalibrationHistoryEntry } from './types';
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
import { downloadGCode, makeGCodeFilename } from './lib/downloadGCode';

import MachineSelector from './components/MachineSelector';
import MaterialDatabase from './components/MaterialDatabase';
import PatternConfigurator from './components/PatternConfigurator';
import PresetManager from './components/PresetManager';
import SVGVisualizer from './components/SVGVisualizer';
import GCodeOutput from './components/GCodeOutput';
import { PrinterConsole } from './components/PrinterConsole';
import { useWebSerial } from './lib/useWebSerial';
import GCodeDictionary from './components/GCodeDictionary';
import QuickLogModal from './components/QuickLogModal';
import LeftSidebar from './components/layout/LeftSidebar';
import CenterPanel from './components/layout/CenterPanel';
import MainCanvas, { CanvasView } from './components/layout/MainCanvas';
import GenerateFAB from './components/layout/GenerateFAB';
import StatusBar from './components/layout/StatusBar';
import WorkflowStepper, { WorkflowStage } from './components/layout/WorkflowStepper';

import { Sun, Moon, BookOpen, AlertTriangle, X, Menu } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';

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
    abortPrint,
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
  const [showDictionary, setShowDictionary] = useState<boolean>(false);
  const [dismissedDeltaWarnings, setDismissedDeltaWarnings] = useState(false);

  // ── New workflow-aware state ───────────────────────────────────────
  // sidebarTab: 'machine' | 'material'  (kept for backward compat with LeftSidebar)
  const [sidebarTab, setSidebarTab] = useState<'machine' | 'material'>('machine');
  // canvasView: replaces old outputTab. 3 view modes for the main canvas.
  const [canvasView, setCanvasView] = useState<CanvasView>('preview');
  // Preset flyout (controlled by App so we can close it after a preset is loaded)
  const [presetFlyoutOpen, setPresetFlyoutOpen] = useState<boolean>(false);
  // Quick Log Modal
  const [showQuickLogModal, setShowQuickLogModal] = useState<boolean>(false);
  // Track last-touched panel to derive the active workflow stage
  const [lastTouched, setLastTouched] = useState<WorkflowStage>('machine');

  // Mobile sidebar slide-over
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    const loadedMachines = getStoredMachines();
    const loadedMaterials = getStoredMaterials();
    setMachines(loadedMachines);
    setMaterials(loadedMaterials);
    if (loadedMachines.length > 0) setSelectedMachineId(loadedMachines[0].id);
    if (loadedMaterials.length > 0) setSelectedMaterialId(loadedMaterials[0].id);
  }, []);

  const activeMachine = machines.find((m) => m.id === selectedMachineId) || machines[0] || null;
  const activeMaterial = materials.find((m) => m.id === selectedMaterialId) || materials[0] || null;

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
  }, [selectedMachineId, selectedMaterialId, activeMachine, activeMaterial]);

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

  // ── Keyboard shortcuts ─────────────────────────────────────────────
  // New mapping (1-6 + L for log):
  //   1 → sidebar machine         2 → sidebar material
  //   3 → pattern (close flyout, focus pattern)
  //   4 → canvas preview          5 → canvas code     6 → canvas operate
  //   L → toggle Quick Log modal
  //   Esc → close any modal / flyout
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement).isContentEditable;
      if (isEditable) return;

      switch (e.key) {
        case '1':
          setSidebarTab('machine');
          setLastTouched('machine');
          break;
        case '2':
          setSidebarTab('material');
          setLastTouched('material');
          break;
        case '3':
          setPresetFlyoutOpen(false);
          setLastTouched('pattern');
          break;
        case '4':
          setCanvasView('preview');
          setLastTouched('preview');
          break;
        case '5':
          setCanvasView('code');
          setLastTouched('burn');
          break;
        case '6':
          setCanvasView('operate');
          setLastTouched('burn');
          break;
        case 'l':
        case 'L':
          setShowQuickLogModal((v) => !v);
          break;
        case 'Escape':
          if (showDictionary) setShowDictionary(false);
          if (showQuickLogModal) setShowQuickLogModal(false);
          if (presetFlyoutOpen) setPresetFlyoutOpen(false);
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showDictionary, showQuickLogModal, presetFlyoutOpen]);

  // ── Machine / Material CRUD (unchanged) ────────────────────────────
  const handleUpdateMachine = useCallback((updated: MachineProfile) => {
    setMachines((prev) => {
      const updatedList = prev.map((m) => (m.id === updated.id ? updated : m));
      saveStoredMachines(updatedList);
      return updatedList;
    });
  }, []);

  const handleCreateMachine = useCallback((created: MachineProfile) => {
    setMachines((prev) => {
      const updatedList = [...prev, created];
      saveStoredMachines(updatedList);
      return updatedList;
    });
  }, []);

  const handleDeleteMachine = useCallback((id: string) => {
    setMachines((prev) => {
      const updatedList = prev.filter((m) => m.id !== id);
      saveStoredMachines(updatedList);
      if (selectedMachineId === id && updatedList.length > 0) {
        setSelectedMachineId(updatedList[0].id);
      }
      return updatedList;
    });
  }, [selectedMachineId]);

  const handleUpdateMaterial = useCallback((updated: MaterialProfile) => {
    setMaterials((prev) => {
      const updatedList = prev.map((m) => (m.id === updated.id ? updated : m));
      saveStoredMaterials(updatedList);
      return updatedList;
    });
  }, []);

  const handleCreateMaterial = useCallback((created: MaterialProfile) => {
    setMaterials((prev) => {
      const updatedList = [...prev, created];
      saveStoredMaterials(updatedList);
      return updatedList;
    });
  }, []);

  const handleDeleteMaterial = useCallback((id: string) => {
    setMaterials((prev) => {
      const updatedList = prev.filter((m) => m.id !== id);
      saveStoredMaterials(updatedList);
      if (selectedMaterialId === id && updatedList.length > 0) {
        setSelectedMaterialId(updatedList[0].id);
      }
      return updatedList;
    });
  }, [selectedMaterialId]);

  // ── Download / Print / Log handlers ────────────────────────────────
  const handleDownloadGCode = useCallback(() => {
    if (!generatedResults) return;
    const filename = makeGCodeFilename(selectedPattern, activeMaterial ? activeMaterial.name : 'material');
    downloadGCode(generatedResults.gcode, filename);
    setCanvasView('code');
    setLastTouched('burn');
  }, [generatedResults, selectedPattern, activeMaterial]);

  const handlePrint = useCallback(() => {
    if (!generatedResults) return;
    setCanvasView('operate');
    setLastTouched('burn');
    printGCode(generatedResults.gcode);
  }, [generatedResults, printGCode]);

  const handleQuickLogSave = useCallback((entry: CalibrationHistoryEntry, optimal: { power: number; speed: number; focusZ: number }) => {
    if (!activeMaterial) return;
    handleUpdateMaterial({
      ...activeMaterial,
      history: [entry, ...activeMaterial.history],
      engrave: {
        power: optimal.power,
        speed: optimal.speed,
      },
      focusZ: optimal.focusZ,
    });
    setShowQuickLogModal(false);
  }, [activeMaterial, handleUpdateMaterial]);

  // ── Workflow stepper derivation ────────────────────────────────────
  const activeStage: WorkflowStage = lastTouched;
  const completedStages: WorkflowStage[] = [
    selectedMachineId ? 'machine' : null,
    selectedMaterialId ? 'material' : null,
    generatedResults ? 'pattern' : null,
    generatedResults ? 'preview' : null,
    (activeMaterial?.history?.length ?? 0) > 0 ? 'burn' : null,
  ].filter(Boolean) as WorkflowStage[];

  const handleStageClick = useCallback((stage: WorkflowStage) => {
    switch (stage) {
      case 'machine':
        setSidebarTab('machine');
        setLastTouched('machine');
        break;
      case 'material':
        setSidebarTab('material');
        setLastTouched('material');
        break;
      case 'pattern':
        setPresetFlyoutOpen(false);
        setLastTouched('pattern');
        break;
      case 'preview':
        setCanvasView('preview');
        setLastTouched('preview');
        break;
      case 'burn':
        setCanvasView('operate');
        setLastTouched('burn');
        break;
    }
  }, []);

  const hasDeltaWarnings =
    !dismissedDeltaWarnings &&
    generatedResults?.deltaWarnings &&
    generatedResults.deltaWarnings.length > 0;

  return (
    <div id="laserbench-root" className={`min-h-screen bg-[#0A0A0A] text-[#E0E0E0] flex flex-col antialiased pb-8 ${theme === 'light' ? 'theme-light' : ''}`}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:top-2 focus:left-2 focus:bg-red-600 focus:text-white focus:px-4 focus:py-2 focus:rounded focus:font-bold"
      >
        Skip to content
      </a>
      {/* Skip to content — keyboard accessibility */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:bg-indigo-600 focus:text-white focus:px-4 focus:py-2 focus:rounded focus:outline-none">
        Skip to main content
      </a>
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-white/10 bg-[#0E0E0E] sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-red-600 flex items-center justify-center rounded-sm font-bold text-black font-sans select-none">LB</div>
          <h1 className="text-base font-medium tracking-tight text-white flex items-center gap-1.5">
            LaserBench
            <span className="text-[#666] font-normal italic text-xs">v1.4-ui</span>
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
                <Moon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
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

      {/* Workflow Stepper — new persistent navigation showing the 5-stage workflow */}
      <WorkflowStepper
        activeStage={activeStage}
        completedStages={completedStages}
        onStageClick={handleStageClick}
      />

      {/* Delta Reachability Warning Banner (kept inline, no longer interrupts header) */}
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

      {/* Main Layout — refined 3-pane structure */}
      <div id="main-content" tabIndex={-1} className="flex flex-1 overflow-hidden overflow-x-hidden">
        <LeftSidebar
          activeTab={sidebarTab}
          onTabChange={(tab) => {
            setSidebarTab(tab);
            setLastTouched(tab);
          }}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        >
          <MachineSelector
            machines={machines}
            selectedMachineId={selectedMachineId}
            onSelectMachine={(id) => { setSelectedMachineId(id); setLastTouched('machine'); }}
            onUpdateMachine={handleUpdateMachine}
            onCreateMachine={handleCreateMachine}
            onDeleteMachine={handleDeleteMachine}
            theme={theme}
          />
          <MaterialDatabase
            materials={materials}
            selectedMaterialId={selectedMaterialId}
            pwmMax={activeMachine ? activeMachine.pwmMax : 255}
            onSelectMaterial={(id) => { setSelectedMaterialId(id); setLastTouched('material'); }}
            onUpdateMaterial={handleUpdateMaterial}
            onCreateMaterial={handleCreateMaterial}
            onDeleteMaterial={handleDeleteMaterial}
            onQuickLog={() => setShowQuickLogModal(true)}
            theme={theme}
          />
        </LeftSidebar>
        <CenterPanel
          presetFlyoutOpen={presetFlyoutOpen}
          onPresetFlyoutToggle={setPresetFlyoutOpen}
        >
          <PatternConfigurator
            selectedPattern={selectedPattern}
            onSelectPattern={(p) => { setSelectedPattern(p); setLastTouched('pattern'); }}
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
            onSetPowerMin={(v) => { setPowerMin(v); setLastTouched('pattern'); }}
            onSetPowerMax={(v) => { setPowerMax(v); setLastTouched('pattern'); }}
            onSetSpeedMin={(v) => { setSpeedMin(v); setLastTouched('pattern'); }}
            onSetSpeedMax={(v) => { setSpeedMax(v); setLastTouched('pattern'); }}
            onSetPowerSteps={(v) => { setPowerSteps(v); setLastTouched('pattern'); }}
            onSetSpeedSteps={(v) => { setSpeedSteps(v); setLastTouched('pattern'); }}
            onSetNominalThickness={(v) => { setNominalThickness(v); setLastTouched('pattern'); }}
            onSetKerfValues={(v) => { setKerfValues(v); setLastTouched('pattern'); }}
            onSetZMin={(v) => { setZMin(v); setLastTouched('pattern'); }}
            onSetZMax={(v) => { setZMax(v); setLastTouched('pattern'); }}
            onSetZSteps={(v) => { setZSteps(v); setLastTouched('pattern'); }}
            onSetBlockSize={(v) => { setBlockSize(v); setLastTouched('pattern'); }}
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
              setPresetFlyoutOpen(false);
              setLastTouched('pattern');
            }}
            theme={theme}
          />
        </CenterPanel>
        <MainCanvas
          canvasView={canvasView}
          onViewChange={(v) => { setCanvasView(v); setLastTouched(v === 'preview' ? 'preview' : 'burn'); }}
          isConnected={isConnected}
          isPrinting={isPrinting}
        >
          {generatedResults && activeMachine && activeMaterial ? (
            <SVGVisualizer
              svgPaths={generatedResults.svgPaths}
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
              onPrint={handlePrint}
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
            onAbortPrint={abortPrint}
            activeMachine={activeMachine}
            theme={theme}
          />
        </MainCanvas>
      </div>

      {/* Floating Action Buttons — primary (Download) + secondary (Log Burn) */}
      <GenerateFAB
        disabled={!generatedResults}
        estimatedTimeStr={estimatedTimeStr}
        onClick={handleDownloadGCode}
        onLogClick={() => setShowQuickLogModal(true)}
        logDisabled={!activeMaterial}
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
        onConnect={() => connect(250000)}
        onDisconnect={disconnect}
      />

      {/* Quick Log Modal — opens from FAB area, Material tab, or 'L' keyboard shortcut */}
      <QuickLogModal
        open={showQuickLogModal}
        onClose={() => setShowQuickLogModal(false)}
        activeMaterial={activeMaterial}
        activeMachineName={activeMachine?.name ?? ''}
        patternType={selectedPattern}
        pwmMax={activeMachine ? activeMachine.pwmMax : 255}
        paramSnapshot={{
          powerMin, powerMax, speedMin, speedMax, zMin, zMax, blockSize,
        }}
        onSave={handleQuickLogSave}
        theme={theme}
      />

      {/* G-Code Dictionary Modal */}
      {showDictionary && (
        <GCodeDictionary
          onClose={() => setShowDictionary(false)}
          theme={theme}
        />
      )}

      {/* Vercel Web Analytics */}
      <Analytics />
    </div>
  );
}
