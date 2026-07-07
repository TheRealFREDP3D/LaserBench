import {
  useMemo,
  useCallback,
  useState,
  useRef,
  useEffect,
  type ComponentType,
  type ChangeEvent,
} from 'react';
import { generatePatternPaths } from './lib/gcodeGenerator';
import { GeneratedData } from './types';
import { estimateToolpathTime, formatEstimatedTime } from './lib/timeEstimator';
import { parseGCodeFile, readGCodeFile } from './lib/gcodeFileUpload';
import { parseGCode } from './lib/gcodeParser';

import { useMachineStore, selectActiveMachine } from './store/useMachineStore';
import { useMaterialStore, selectActiveMaterial } from './store/useMaterialStore';
import { usePatternStore } from './store/usePatternStore';
import { useUIStore } from './store/useUIStore';

import MachineSelector from './components/MachineSelector';
import MaterialDatabase from './components/MaterialDatabase';
import PatternConfigurator from './components/PatternConfigurator';
import SVGVisualizer from './components/SVGVisualizer';
import GCodeOutput from './components/GCodeOutput';
import { PrinterConsole } from './components/PrinterConsole';
import { useSerialStore } from './store/useSerialStore';
import WorkflowStepper from './components/layout/WorkflowStepper';
import StatusBar from './components/layout/StatusBar';
import OnboardingTooltip from './components/OnboardingTooltip';

import GCodeDictionary from './components/GCodeDictionary';

import { motion, AnimatePresence } from 'motion/react';
import { Settings, Terminal, Upload, Book } from 'lucide-react';

const isVercel = import.meta.env.VERCEL === '1';

type MobilePanel = 'config' | 'console' | null;

export default function App() {
  const {
    isConnected,
    messages,
    isPrinting,
    progress,
    movementMode,
    connect,
    disconnect,
    send,
    printGCode,
    abortPrint,
    clearMessages,
  } = useSerialStore();

  const { machines, setActiveMachineId, updateMachine, addMachine, addMachines, deleteMachine } =
    useMachineStore();
  const {
    materials,
    setActiveMaterialId,
    updateMaterial,
    addMaterial,
    addMaterials,
    deleteMaterial,
  } = useMaterialStore();
  const pattern = usePatternStore();
  const ui = useUIStore();

  const activeMachine = useMachineStore(selectActiveMachine);
  const activeMaterial = useMaterialStore(selectActiveMaterial);

  const [jogPos, setJogPos] = useState({ x: 0, y: 0 });
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const [showDictionary, setShowDictionary] = useState(false);
  const [uploadedGCode, setUploadedGCode] = useState<GeneratedData | null>(null);
  const [editedGCode, setEditedGCode] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Deriving results using useMemo instead of useEffect+useState to avoid cascading renders
  const generatedResults = useMemo<GeneratedData | null>(() => {
    if (!activeMachine || !activeMaterial) return null;
    return generatePatternPaths(pattern.selectedPattern, activeMachine, activeMaterial, {
      ...pattern,
      patternPosition: pattern.patternPosition,
    });
  }, [pattern, activeMachine, activeMaterial]);

  const effectiveResults = useMemo<GeneratedData | null>(() => {
    const base = uploadedGCode || generatedResults;
    if (!base) return null;
    if (editedGCode !== null) {
      const parsed = parseGCode(editedGCode, activeMachine?.pwmMax || 1000);
      const hasRealBounds = parsed.bounds.minX !== 0 || parsed.bounds.minY !== 0 ||
        parsed.bounds.maxX !== 100 || parsed.bounds.maxY !== 100;
      const width = parsed.bounds.maxX - parsed.bounds.minX;
      const height = parsed.bounds.maxY - parsed.bounds.minY;
      return {
        ...base,
        gcode: editedGCode,
        svgPaths: parsed.svgPaths,
        paths: parsed.paths,
        width: width || base.width,
        height: height || base.height,
        // Only override offsets when the parser found real movement commands;
        // the fallback bounds (0,0→100,100) mean no moves were found so we
        // keep the base offsets to avoid clobbering a valid uploaded file.
        offsetX: hasRealBounds ? -parsed.bounds.minX : base.offsetX,
        offsetY: hasRealBounds ? -parsed.bounds.minY : base.offsetY,
      };
    }
    return base;
  }, [uploadedGCode, generatedResults, editedGCode, activeMachine]);

  const estimatedTimeStr = useMemo(() => {
    if (!effectiveResults || !activeMachine) return null;
    return formatEstimatedTime(estimateToolpathTime(effectiveResults.paths, activeMachine));
  }, [effectiveResults, activeMachine]);

  const handlePrint = useCallback(() => {
    if (effectiveResults) printGCode(effectiveResults.gcode);
  }, [effectiveResults, printGCode]);

  const handleFileUpload = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = '';
      try {
        const content = await readGCodeFile(file);
        const parsed = parseGCodeFile(content, activeMachine?.pwmMax || 1000);
        setUploadedGCode(parsed);
        setEditedGCode(null);
      } catch (err) {
        window.alert(
          `Failed to load G-Code file: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
      }
    },
    [activeMachine]
  );

  const handleClearUpload = useCallback(() => {
    setUploadedGCode(null);
    setEditedGCode(null);
  }, []);

  const handleEditGCode = useCallback((edited: string) => {
    setEditedGCode(edited);
  }, []);

  const handleConnect = useCallback(() => {
    connect(activeMachine?.baudRate);
  }, [connect, activeMachine]);

  const handleJog = useCallback(
    (x: number, y: number) => {
      if (!isConnected) return;
      setJogPos((prev) => {
        const dx = Math.round((x - prev.x) * 100) / 100;
        const dy = Math.round((y - prev.y) * 100) / 100;
        const nx = prev.x + dx;
        const ny = prev.y + dy;
        send(`G0 X${nx.toFixed(2)} Y${ny.toFixed(2)}`);
        return { x: nx, y: ny };
      });
    },
    [isConnected, send]
  );

  const handleJogRelative = useCallback(
    (dx: number, dy: number) => {
      if (!isConnected) return;
      setJogPos((prev) => {
        const nx = Math.round((prev.x + dx) * 100) / 100;
        const ny = Math.round((prev.y + dy) * 100) / 100;
        send(`G0 X${nx.toFixed(2)} Y${ny.toFixed(2)} F${activeMachine?.travelSpeed || 4000}`);
        return { x: nx, y: ny };
      });
    },
    [isConnected, send, activeMachine?.travelSpeed]
  );

  const configPanel = (
    <div className="p-4 md:p-6 flex flex-col flex-1 min-h-0">
      <AnimatePresence mode="wait">
        {ui.currentStep === 'machine' && (
          <motion.div
            key="machine"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-y-auto"
          >
            <MachineSelector
              machines={machines}
              selectedId={activeMachine?.id || ''}
              onSelect={setActiveMachineId}
              onUpdate={updateMachine}
              onCreate={addMachine}
              onCreateBatch={addMachines}
              onDelete={deleteMachine}
            />
          </motion.div>
        )}
        {ui.currentStep === 'material' && (
          <motion.div
            key="material"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-y-auto"
          >
            <MaterialDatabase
              materials={materials}
              selectedId={activeMaterial?.id || ''}
              onSelect={setActiveMaterialId}
              onUpdate={updateMaterial}
              onCreate={addMaterial}
              onCreateBatch={addMaterials}
              onDelete={deleteMaterial}
              pwmMax={activeMachine?.pwmMax ?? 1000}
            />
          </motion.div>
        )}
        {ui.currentStep === 'pattern' && (
          <motion.div
            key="pattern"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-y-auto"
          >
            <PatternConfigurator />
          </motion.div>
        )}
        {ui.currentStep === 'preview' && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1 min-h-0 flex flex-col"
          >
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  G-Code Preview
                  {uploadedGCode && (
                    <span className="text-[9px] font-normal text-indigo-400 normal-case tracking-normal ml-2">
                      (uploaded file)
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-1">
                  {uploadedGCode && (
                    <button
                      onClick={handleClearUpload}
                      className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-neutral-500 hover:text-red-400 bg-white/5 hover:bg-white/10 rounded transition-colors"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors"
                  >
                    <Upload className="w-3 h-3" />
                    Upload
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".gcode,.nc,.gc"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              <div className="flex-1 min-h-0 bg-[#0D0D0D] rounded-xl border border-white/5">
                {effectiveResults ? (
                  <GCodeOutput
                    gcode={effectiveResults.gcode}
                    patternType={uploadedGCode ? 'uploaded' : pattern.selectedPattern}
                    material={activeMaterial!}
                    onEdit={handleEditGCode}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-neutral-700 text-xs italic">
                    Generate a pattern or upload a G-Code file
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const consolePanel = (
    <PrinterConsole
      isConnected={isConnected}
      messages={messages}
      isPrinting={isPrinting}
      progress={progress}
      onConnect={handleConnect}
      onDisconnect={disconnect}
      onSend={send}
      onClear={clearMessages}
      onAbortPrint={abortPrint}
      onPrint={handlePrint}
      gcode={effectiveResults?.gcode}
      activeMachine={activeMachine}
      onJogRelative={handleJogRelative}
    />
  );

  const svgPanel = (
    <div className="flex-1 flex flex-col min-w-0 bg-[#000] items-center justify-center">
      <div className="flex-1 relative w-full h-full">
        {effectiveResults && activeMachine && activeMaterial ? (
          <SVGVisualizer
            key={`${activeMachine.id}-${activeMachine.bedWidth}-${activeMachine.bedHeight}-${activeMachine.bedShape}`}
            svgPaths={effectiveResults.svgPaths}
            paths={effectiveResults.paths}
            machine={activeMachine}
            onJog={handleJog}
            isPrinting={isPrinting}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-neutral-800 text-sm font-mono tracking-widest uppercase opacity-20">
            Waiting for generation...
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-screen w-full flex flex-col bg-[#050505] text-[#E0E0E0] font-sans selection:bg-red-500/30 overflow-hidden">
      <header className="shrink-0 h-12 bg-[#0A0A0A] border-b border-white/8 flex items-center">
        <div className="flex-1 min-w-0">
          <WorkflowStepper />
        </div>
        <button
          onClick={() => setShowDictionary(true)}
          className="shrink-0 flex items-center gap-1.5 px-3 h-full text-[10px] font-bold uppercase tracking-wider text-neutral-400 hover:text-white hover:bg-white/5 transition-colors border-l border-white/8"
          title="G-Code Dictionary"
        >
          <Book className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Dictionary</span>
        </button>
      </header>

      {/* Desktop & Tablet: 3-column layout */}
      <div className="hidden md:flex flex-1 min-h-0">
        <div className="w-[280px] xl:w-[340px] 2xl:w-[400px] border-r border-white/8 bg-[#0A0A0A] flex flex-col shrink-0">
          {configPanel}
        </div>
        {svgPanel}
        <div className="w-[320px] xl:w-[400px] 2xl:w-[480px] border-l border-white/8 bg-[#0A0A0A] overflow-y-auto shrink-0">
          {consolePanel}
        </div>
      </div>

      {/* Mobile: stacked layout with bottom tabs */}
      <div className="flex md:hidden flex-1 min-h-0 flex-col">
        <div className="flex-1 min-h-0">{svgPanel}</div>
        {mobilePanel && (
          <div className="h-[50vh] border-t border-white/8 bg-[#0A0A0A] overflow-y-auto shrink-0">
            {mobilePanel === 'config' ? configPanel : consolePanel}
          </div>
        )}
      </div>

      {/* Mobile bottom tab bar */}
      <div className="flex md:hidden shrink-0 h-14 bg-[#0A0A0A] border-t border-white/8">
        <button
          onClick={() => setMobilePanel(mobilePanel === 'config' ? null : 'config')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
            mobilePanel === 'config' ? 'text-red-500 bg-white/5' : 'text-neutral-500'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Config</span>
        </button>
        <button
          onClick={() => setMobilePanel(mobilePanel === 'console' ? null : 'console')}
          className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
            mobilePanel === 'console' ? 'text-red-500 bg-white/5' : 'text-neutral-500'
          }`}
        >
          <Terminal className="w-5 h-5" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Console</span>
        </button>
      </div>

      <StatusBar
        isConnected={isConnected}
        machineName={activeMachine?.name || ''}
        firmware={activeMachine?.firmware || 'grbl'}
        materialName={activeMaterial?.name || ''}
        estimatedTimeStr={estimatedTimeStr}
        isPrinting={isPrinting}
        progress={progress}
        movementMode={movementMode}
        onConnect={handleConnect}
        onDisconnect={disconnect}
      />

      <OnboardingTooltip />

      {showDictionary && <GCodeDictionary onClose={() => setShowDictionary(false)} />}

      {isVercel && <VercelAnalytics />}
    </div>
  );
}

function VercelAnalytics() {
  const [Analytics, setAnalytics] = useState<ComponentType | null>(null);
  const [SpeedInsights, setSpeedInsights] = useState<ComponentType | null>(null);

  useEffect(() => {
    import('@vercel/analytics/react').then((m) => setAnalytics(() => m.Analytics));
    import('@vercel/speed-insights/react').then((m) => setSpeedInsights(() => m.SpeedInsights));
  }, []);

  return (
    <>
      {Analytics && <Analytics />}
      {SpeedInsights && <SpeedInsights />}
    </>
  );
}
