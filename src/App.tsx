import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MachineProfile, MaterialProfile, CalibrationHistoryEntry } from './types';
import { generatePatternPaths, GeneratedData } from './lib/gcodeGenerator';
import { estimateToolpathTime, formatEstimatedTime } from './lib/timeEstimator';
import { downloadGCode, makeGCodeFilename } from './lib/downloadGCode';

import { useMachineStore } from './hooks/useMachineStore';
import { useMaterialStore } from './hooks/useMaterialStore';
import { usePatternParams } from './hooks/usePatternParams';

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
import MainCanvas, { CanvasView } from './components/layout/MainCanvas';
import GenerateFAB from './components/layout/GenerateFAB';
import StatusBar from './components/layout/StatusBar';
import WorkflowStepper, { WorkflowStage } from './components/layout/WorkflowStepper';

import { Sun, Moon, BookOpen, AlertTriangle, X, Sliders, FolderOpen, ChevronDown } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const {
    isConnected, connectionState, messages, isPrinting, progress,
    connect, disconnect, send, printGCode, abortPrint, clearMessages,
  } = useWebSerial();

  const {
    machines, selectedMachineId, setSelectedMachineId,
    handleUpdateMachine, handleCreateMachine, handleDeleteMachine,
  } = useMachineStore();

  const {
    materials, selectedMaterialId, setSelectedMaterialId,
    handleUpdateMaterial, handleCreateMaterial, handleDeleteMaterial,
  } = useMaterialStore();

  const pattern = usePatternParams();

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

  const [generatedResults, setGeneratedResults] = useState<GeneratedData | null>(null);
  const [hoveredPathIndex, setHoveredPathIndex] = useState<number | null>(null);
  const [showDictionary, setShowDictionary] = useState<boolean>(false);
  const [dismissedDeltaWarnings, setDismissedDeltaWarnings] = useState(false);

  // ── New workflow-aware state ───────────────────────────────────────
  // canvasView: 2 view modes — Code and Operate (Preview lives in left panel)
  const [canvasView, setCanvasView] = useState<CanvasView>('code');
  // Preset flyout (controlled by App so we can close it after a preset is loaded)
  const [presetFlyoutOpen, setPresetFlyoutOpen] = useState<boolean>(false);
  // Quick Log Modal
  const [showQuickLogModal, setShowQuickLogModal] = useState<boolean>(false);
  // Track last-touched panel to derive the active workflow stage
  const [lastTouched, setLastTouched] = useState<WorkflowStage>('machine');

  // Preset flyout ref for outside-click detection
  const presetFlyoutRef = useRef<HTMLDivElement>(null);

  // Close preset flyout on outside click
  useEffect(() => {
    if (!presetFlyoutOpen) return;
    const handler = (e: MouseEvent) => {
      if (presetFlyoutRef.current && !presetFlyoutRef.current.contains(e.target as Node)) {
        setPresetFlyoutOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [presetFlyoutOpen]);

  const activeMachine = machines.find((m) => m.id === selectedMachineId) || machines[0] || null;
  const activeMaterial = materials.find((m) => m.id === selectedMaterialId) || materials[0] || null;

  const estimatedTimeStr = useMemo(() => {
    if (!generatedResults || !activeMachine || !generatedResults.paths) return null;
    const seconds = estimateToolpathTime(generatedResults.paths, activeMachine);
    return formatEstimatedTime(seconds);
  }, [generatedResults, activeMachine]);

  useEffect(() => {
    if (activeMachine) {
      pattern.setPowerMin(Math.round(activeMachine.pwmMax * 0.2));
      pattern.setPowerMax(activeMachine.pwmMax);
      pattern.setZMin(activeMachine.workZ - 3.0);
      pattern.setZMax(activeMachine.workZ + 3.0);
    }
    if (activeMaterial) {
      pattern.setNominalThickness(activeMaterial.thickness);
    }
  }, [selectedMachineId, selectedMaterialId, activeMachine, activeMaterial]);

  // Reset dismissed warnings when pattern or machine changes
  useEffect(() => {
    setDismissedDeltaWarnings(false);
  }, [selectedMachineId, pattern.selectedPattern, pattern.blockSize, pattern.powerSteps, pattern.speedSteps]);

  useEffect(() => {
    if (!activeMachine || !activeMaterial) return;
    const res = generatePatternPaths(pattern.selectedPattern, activeMachine, activeMaterial, {
      powerMin: pattern.powerMin, powerMax: pattern.powerMax,
      speedMin: pattern.speedMin, speedMax: pattern.speedMax,
      powerSteps: pattern.powerSteps, speedSteps: pattern.speedSteps,
      blockSize: pattern.blockSize,
      nominalThickness: pattern.nominalThickness, kerfValues: pattern.kerfValues,
      zMin: pattern.zMin, zMax: pattern.zMax, zSteps: pattern.zSteps,
    });
    setGeneratedResults(res);
  }, [
    pattern.selectedPattern, selectedMachineId, selectedMaterialId,
    pattern.powerMin, pattern.powerMax, pattern.speedMin, pattern.speedMax,
    pattern.powerSteps, pattern.speedSteps, pattern.blockSize,
    pattern.nominalThickness, pattern.kerfValues,
    pattern.zMin, pattern.zMax, pattern.zSteps,
    machines, materials,
  ]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────
  //   1 → scroll to machine section     2 → scroll to material section
  //   3 → close preset flyout            4 → switch to code view (Preview step)
  //   5 → canvas code                    6 → canvas operate
  //   L → toggle Quick Log modal
  //   Esc → close any modal / flyout
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement).isContentEditable;
      if (isEditable) return;

      switch (e.key) {
        case '1':
          document.getElementById('machine-selector-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          setLastTouched('machine');
          break;
        case '2':
          document.getElementById('material-database-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          setLastTouched('material');
          break;
        case '3':
          setPresetFlyoutOpen(false);
          setLastTouched('pattern');
          break;
        case '4':
          setCanvasView('code');
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

  // ── Download / Print / Log handlers ────────────────────────────────
  const handleDownloadGCode = useCallback(() => {
    if (!generatedResults) return;
    const filename = makeGCodeFilename(pattern.selectedPattern, activeMaterial ? activeMaterial.name : 'material');
    downloadGCode(generatedResults.gcode, filename);
    setCanvasView('code');
    setLastTouched('burn');
  }, [generatedResults, pattern.selectedPattern, activeMaterial]);

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
        document.getElementById('machine-selector-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setLastTouched('machine');
        break;
      case 'material':
        document.getElementById('material-database-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setLastTouched('material');
        break;
      case 'pattern':
        document.getElementById('pattern-configurator-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setPresetFlyoutOpen(false);
        setLastTouched('pattern');
        break;
      case 'preview':
        setCanvasView('code');
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
    <div id="laserbench-root" className={`h-screen flex flex-col bg-[#080808] text-[#E8E8E8] antialiased overflow-hidden ${theme === 'light' ? 'theme-light' : ''}`}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:bg-red-600 focus:text-white focus:px-4 focus:py-2 focus:rounded focus:font-bold focus:outline-none"
      >
        Skip to content
      </a>
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-white/10 bg-[#0F0F0F] sticky top-0 z-50 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-red-600 flex items-center justify-center rounded-sm font-bold text-black font-sans select-none">LB</div>
          <h1 className="text-base font-medium tracking-tight text-white flex items-center gap-1.5">
            LaserBench
            <span className="text-[#505050] font-normal italic text-xs">v{__APP_VERSION__}</span>
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={() => setShowDictionary(true)}
            id="gcode-dict-header-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#252525] border border-white/10 hover:bg-[#333333] rounded text-[#9A9A9A] hover:text-white transition-all duration-200 cursor-pointer text-xs font-semibold uppercase tracking-wider select-none outline-none"
            title="Open G-Code and M-Code Dictionary"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="hidden sm:inline">G-Code Dict</span>
          </button>

          <button
            onClick={toggleTheme}
            id="theme-toggle-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#252525] border border-white/10 hover:bg-[#333333] rounded text-[#9A9A9A] hover:text-white transition-all duration-200 cursor-pointer text-xs font-semibold uppercase tracking-wider select-none outline-none"
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

      {/* Main Layout — 2-row: config top, output bottom */}
      <div id="main-content" tabIndex={-1} className="flex flex-col flex-1 min-h-0 overflow-hidden">

        {/* ── Top Row: Machine | Material | Pattern (config) ── */}
        <div className="flex shrink-0 border-b border-white/8" style={{ height: '42%', minHeight: '280px' }}>
          {/* Machine Selector */}
          <div className="flex-1 overflow-y-auto border-r border-white/8">
            <MachineSelector
              machines={machines}
              selectedMachineId={selectedMachineId}
              onSelectMachine={(id) => { setSelectedMachineId(id); setLastTouched('machine'); }}
              onUpdateMachine={handleUpdateMachine}
              onCreateMachine={handleCreateMachine}
              onDeleteMachine={handleDeleteMachine}
              isConnected={isConnected}
              onConnect={() => connect(activeMachine?.baudRate)}
              onDisconnect={disconnect}
              theme={theme}
            />
          </div>

          {/* Material Database */}
          <div className="flex-[1.2] overflow-y-auto border-r border-white/8">
            <MaterialDatabase
              materials={materials}
              selectedMaterialId={selectedMaterialId}
              pwmMax={activeMachine ? activeMachine.pwmMax : 255}
              firmware={activeMachine?.firmware ?? 'grbl'}
              onSelectMaterial={(id) => { setSelectedMaterialId(id); setLastTouched('material'); }}
              onUpdateMaterial={handleUpdateMaterial}
              onCreateMaterial={handleCreateMaterial}
              onDeleteMaterial={handleDeleteMaterial}
              onQuickLog={() => setShowQuickLogModal(true)}
              theme={theme}
            />
          </div>

          {/* Pattern Configurator + Preset Flyout */}
          <div className="flex-1 overflow-y-auto relative">
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/8 bg-[#0F0F0F] sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Sliders className="text-red-500 w-4 h-4" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-white">Pattern</h2>
              </div>
              <div className="relative" ref={presetFlyoutRef}>
                <button
                  type="button"
                  id="load-preset-btn"
                  onClick={() => setPresetFlyoutOpen(!presetFlyoutOpen)}
                  aria-expanded={presetFlyoutOpen}
                  aria-controls="preset-flyout"
                  data-testid="load-preset-toggle"
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer select-none outline-none border ${
                    presetFlyoutOpen
                      ? 'bg-red-600 text-black border-red-500 shadow-[0_0_8px_rgba(220,38,38,0.4)]'
                      : 'bg-[#252525] border-white/10 text-[#9A9A9A] hover:bg-[#333333] hover:text-white'
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Load Preset</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${presetFlyoutOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {presetFlyoutOpen && (
                    <motion.div
                      id="preset-flyout"
                      data-testid="preset-flyout"
                      initial={{ opacity: 0, y: -4, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.97 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute right-0 top-full mt-1 w-[340px] max-w-[90vw] bg-[#0F0F0F] border border-white/10 rounded-md shadow-2xl z-50 max-h-[50vh] overflow-y-auto"
                    >
                      <PresetManager
                        currentPattern={pattern.selectedPattern}
                        powerMin={pattern.powerMin}
                        powerMax={pattern.powerMax}
                        speedMin={pattern.speedMin}
                        speedMax={pattern.speedMax}
                        powerSteps={pattern.powerSteps}
                        speedSteps={pattern.speedSteps}
                        blockSize={pattern.blockSize}
                        nominalThickness={pattern.nominalThickness}
                        kerfValues={pattern.kerfValues}
                        zMin={pattern.zMin}
                        zMax={pattern.zMax}
                        zSteps={pattern.zSteps}
                        pwmMax={activeMachine ? activeMachine.pwmMax : 255}
                        onLoadPreset={(preset) => {
                          pattern.loadPreset(preset);
                          setPresetFlyoutOpen(false);
                          setLastTouched('pattern');
                        }}
                        theme={theme}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <PatternConfigurator
              selectedPattern={pattern.selectedPattern}
              onSelectPattern={(p) => { pattern.setSelectedPattern(p); setLastTouched('pattern'); }}
              powerMin={pattern.powerMin}
              powerMax={pattern.powerMax}
              speedMin={pattern.speedMin}
              speedMax={pattern.speedMax}
              powerSteps={pattern.powerSteps}
              speedSteps={pattern.speedSteps}
              blockSize={pattern.blockSize}
              nominalThickness={pattern.nominalThickness}
              kerfValues={pattern.kerfValues}
              zMin={pattern.zMin}
              zMax={pattern.zMax}
              zSteps={pattern.zSteps}
              pwmMax={activeMachine ? activeMachine.pwmMax : 255}
              onSetPowerMin={(v) => { pattern.setPowerMin(v); setLastTouched('pattern'); }}
              onSetPowerMax={(v) => { pattern.setPowerMax(v); setLastTouched('pattern'); }}
              onSetSpeedMin={(v) => { pattern.setSpeedMin(v); setLastTouched('pattern'); }}
              onSetSpeedMax={(v) => { pattern.setSpeedMax(v); setLastTouched('pattern'); }}
              onSetPowerSteps={(v) => { pattern.setPowerSteps(v); setLastTouched('pattern'); }}
              onSetSpeedSteps={(v) => { pattern.setSpeedSteps(v); setLastTouched('pattern'); }}
              onSetNominalThickness={(v) => { pattern.setNominalThickness(v); setLastTouched('pattern'); }}
              onSetKerfValues={(v) => { pattern.setKerfValues(v); setLastTouched('pattern'); }}
              onSetZMin={(v) => { pattern.setZMin(v); setLastTouched('pattern'); }}
              onSetZMax={(v) => { pattern.setZMax(v); setLastTouched('pattern'); }}
              onSetZSteps={(v) => { pattern.setZSteps(v); setLastTouched('pattern'); }}
              onSetBlockSize={(v) => { pattern.setBlockSize(v); setLastTouched('pattern'); }}
              theme={theme}
            />
          </div>
        </div>

        {/* ── Bottom Row: Toolpath Preview | G-Code Output + Operate ── */}
        <div className="flex flex-1 min-h-0">
          {/* SVG Toolpath Preview — always visible */}
          <div className="flex-1 min-w-0 border-r border-white/8 flex flex-col min-h-0 overflow-hidden">
            {generatedResults && activeMachine && activeMaterial ? (
              <SVGVisualizer
                svgPaths={generatedResults.svgPaths}
                machine={activeMachine}
                material={activeMaterial}
                patternType={pattern.selectedPattern}
                paths={generatedResults.paths}
                theme={theme}
                hoveredPathIndex={hoveredPathIndex}
                onHoverPath={setHoveredPathIndex}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#505050]">
                <svg className="w-12 h-12 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18M3 9h18" strokeDasharray="2 2" />
                  <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.3" />
                </svg>
                <p className="text-xs text-center max-w-[200px] leading-relaxed">
                  Toolpath preview will appear here once a pattern is generated.
                </p>
              </div>
            )}
          </div>

          {/* G-Code Output + Operate (tabbed) */}
          <div className="flex-1 min-w-0 flex flex-col">
            <MainCanvas
              canvasView={canvasView}
              onViewChange={(v) => { setCanvasView(v); setLastTouched('burn'); }}
              isConnected={isConnected}
              isPrinting={isPrinting}
            >
              {generatedResults ? (
                <GCodeOutput
                  gcode={generatedResults.gcode}
                  patternType={pattern.selectedPattern}
                  machine={activeMachine}
                  material={activeMaterial}
                  paths={generatedResults.paths}
                  theme={theme}
                  hoveredPathIndex={hoveredPathIndex}
                  onHoverPath={setHoveredPathIndex}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-[#505050] text-xs p-4">
                  <p>G-Code output will appear here once a pattern is generated.</p>
                </div>
              )}
              <PrinterConsole
                isConnected={isConnected}
                messages={messages}
                isPrinting={isPrinting}
                progress={progress}
                onConnect={() => connect(activeMachine?.baudRate)}
                onDisconnect={disconnect}
                onSend={send}
                onClear={clearMessages}
                onAbortPrint={abortPrint}
                onPrint={handlePrint}
                gcode={generatedResults?.gcode}
                activeMachine={activeMachine}
                theme={theme}
              />
            </MainCanvas>
          </div>
        </div>
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
        onConnect={() => connect(activeMachine?.baudRate)}
        onDisconnect={disconnect}
      />

      {/* Quick Log Modal — opens from FAB area, Material tab, or 'L' keyboard shortcut */}
      <QuickLogModal
        open={showQuickLogModal}
        onClose={() => setShowQuickLogModal(false)}
        activeMaterial={activeMaterial}
        activeMachineName={activeMachine?.name ?? ''}
        patternType={pattern.selectedPattern}
        pwmMax={activeMachine ? activeMachine.pwmMax : 255}
        paramSnapshot={{
          powerMin: pattern.powerMin, powerMax: pattern.powerMax,
          speedMin: pattern.speedMin, speedMax: pattern.speedMax,
          zMin: pattern.zMin, zMax: pattern.zMax, blockSize: pattern.blockSize,
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
      <SpeedInsights />
    </div>
  );
}
