import MachineFrontView from './components/MachineFrontView';
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
import { getFirmwareCapabilities, validateMachineSafetyProfile } from './lib/firmwareCapabilities';
import { useConfirmModal } from './hooks/useConfirmModal';
import WorkflowStepper from './components/layout/WorkflowStepper';
import StatusBar from './components/layout/StatusBar';
import OnboardingTooltip from './components/OnboardingTooltip';

import GCodeDictionary from './components/GCodeDictionary';

import { motion, AnimatePresence } from 'motion/react';
import { Settings, Terminal, Upload, Book } from 'lucide-react';
import { clampToBed, buildJogCommand, getFreshCurrentPos } from './helpers/jog';
import { useUnhomedJogGuard } from './hooks/useUnhomedJogGuard';
import { useSafeZGuard } from './hooks/useSafeZGuard';

const isVercel = import.meta.env.VERCEL === '1';

type MobilePanel = 'config' | 'console' | null;

export default function App() {
  const {
    isConnected,
    messages,
    isPrinting,
    progress,
    currentPos,
    movementMode,
    isHomed,
    connect,
    disconnect,
    send,
    printGCode,
    abortPrint,
    emergencyStop,
    home,
    laserOff,
    clearMessages,
    setFirmwareCapabilities,
    setLaserOffCmd,
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

  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const [showDictionary, setShowDictionary] = useState(false);
  const [uploadedGCode, setUploadedGCode] = useState<GeneratedData | null>(null);
  const [editedGCode, setEditedGCode] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { confirm, ConfirmModalComponent } = useConfirmModal();

  // Register the machine-specific laser-off command with the serial store so
  // lasers are shut down correctly on disconnect / abort / error even if the
  // React tree is gone. Runs whenever the machine's laserOff setting changes.
  useEffect(() => {
    const safety = activeMachine ? validateMachineSafetyProfile(activeMachine) : null;
    const capabilities = safety?.valid && activeMachine ? getFirmwareCapabilities(activeMachine.firmware) : null;
    setFirmwareCapabilities(capabilities);
    // Fall back to universal M5 if profile is invalid or missing - never leave laserOffCmd empty
    setLaserOffCmd(safety?.valid ? activeMachine?.laserOff ?? 'M5' : 'M5');
  }, [activeMachine, setFirmwareCapabilities, setLaserOffCmd]);

  // Encapsulate homing confirmation logic in a dedicated hook
  const { requireHomingConfirm, onHome: resetHomingOverride } = useUnhomedJogGuard();
  // Ensure Z is raised to safe height before any XY jog
  const { requireSafeZ, resetSafeZFlag } = useSafeZGuard(activeMachine);

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
      const hasRealBounds =
        parsed.bounds.minX !== 0 ||
        parsed.bounds.minY !== 0 ||
        parsed.bounds.maxX !== 100 ||
        parsed.bounds.maxY !== 100;
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
    async (x: number, y: number) => {
      if (!isConnected || !activeMachine) return;
      if (!(await requireHomingConfirm())) return;
      await requireSafeZ();

      const pos = getFreshCurrentPos();
      const { x: clampedX, y: clampedY } = clampToBed(activeMachine, x, y);

      const dx = Math.round((clampedX - pos.x) * 100) / 100;
      const dy = Math.round((clampedY - pos.y) * 100) / 100;

      const targetX = pos.x + dx;
      const targetY = pos.y + dy;

      send(buildJogCommand(activeMachine, targetX, targetY));
    },
    [isConnected, requireHomingConfirm, requireSafeZ, send, activeMachine]
  );

  const handleJogRelative = useCallback(
    async (dx: number, dy: number) => {
      if (!isConnected || !activeMachine) return;
      if (!(await requireHomingConfirm())) return;
      await requireSafeZ();

      const pos = getFreshCurrentPos();
      const targetX = pos.x + dx;
      const targetY = pos.y + dy;
      const { x: clampedX, y: clampedY } = clampToBed(activeMachine, targetX, targetY);

      send(buildJogCommand(activeMachine, clampedX, clampedY));
    },
    [isConnected, requireHomingConfirm, requireSafeZ, send, activeMachine]
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
      onEmergencyStop={emergencyStop}
      onLaserOff={laserOff}
      onPrint={printGCode}
      gcode={effectiveResults?.gcode}
      activeMachine={activeMachine}
      onJogRelative={handleJogRelative}
      isHomed={isHomed}
      onHome={async () => {
        resetHomingOverride();
        resetSafeZFlag();
        await home();
      }}
    />
  );

  const svgPanel = (
    <div className="flex-1 flex flex-col min-w-0 bg-[#000] items-center justify-center">
      <div className="flex-1 relative w-full h-full">
        {effectiveResults && activeMachine && activeMaterial ? (
          <>
            <SVGVisualizer
              key={`${activeMachine.id}-${activeMachine.bedWidth}-${activeMachine.bedHeight}-${activeMachine.bedShape}`}
              svgPaths={effectiveResults.svgPaths}
              paths={effectiveResults.paths}
              machine={activeMachine}
              onJog={handleJog}
              isPrinting={isPrinting}
            />
            <div className="absolute bottom-4 right-4 z-10 pointer-events-none opacity-80 hover:opacity-100 transition-opacity">
              <MachineFrontView
                machine={activeMachine}
                currentPos={currentPos}
                materialThickness={activeMaterial.thickness}
              />
            </div>
          </>
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
        isHomed={isHomed}
        onConnect={handleConnect}
        onDisconnect={disconnect}
      />

      <OnboardingTooltip />

      {/* Safe Z enforcement overlay — blocks all interaction until zSecure > 0 */}
      {activeMachine && activeMachine.zSecure === 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="max-w-sm w-full mx-4 bg-[#111] border border-amber-500/50 rounded-2xl p-6 shadow-2xl shadow-amber-500/10">
            <div className="flex items-start gap-3 mb-4">
              <div className="shrink-0 w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center animate-pulse">
                <span className="text-amber-400 text-sm font-bold">!</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-1">
                  Safe Z Height Required
                </h2>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  The <span className="text-amber-400 font-bold">Z Secure</span> value for{' '}
                  <span className="text-white font-semibold">"{activeMachine.name}"</span> is set
                  to <span className="font-mono text-amber-400">0 mm</span>.
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-500 leading-relaxed mb-5 pl-11">
              This is the height the laser head travels to between moves to avoid
              collisions with clamps, material edges, and fixtures. A value of{' '}
              <span className="font-mono">0</span> means the head will travel at bed
              level — which can damage your material, your machine, or both.
            </p>

            <p className="text-[10px] text-amber-500/80 mb-5 pl-11 font-semibold uppercase tracking-wider">
              Set a value greater than 0 to continue.
            </p>

            <div className="pl-11">
              <button
                onClick={() => ui.setStep('machine')}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold uppercase tracking-wider rounded-lg transition-colors"
              >
                Go to Machine Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {showDictionary && <GCodeDictionary onClose={() => setShowDictionary(false)} />}

      {ConfirmModalComponent}

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
