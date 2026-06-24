import { useMemo, useCallback, useState } from 'react';
import { generatePatternPaths } from './lib/gcodeGenerator';
import { GeneratedData } from './types';
import { estimateToolpathTime, formatEstimatedTime } from './lib/timeEstimator';

import { useMachineStore } from './store/useMachineStore';
import { useMaterialStore } from './store/useMaterialStore';
import { usePatternStore } from './store/usePatternStore';
import { useUIStore } from './store/useUIStore';

import MachineSelector from './components/MachineSelector';
import MaterialDatabase from './components/MaterialDatabase';
import PatternConfigurator from './components/PatternConfigurator';
import SVGVisualizer from './components/SVGVisualizer';
import GCodeOutput from './components/GCodeOutput';
import { PrinterConsole } from './components/PrinterConsole';
import { useWebSerial } from './lib/useWebSerial';
import WorkflowStepper from './components/layout/WorkflowStepper';
import StatusBar from './components/layout/StatusBar';

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Terminal } from 'lucide-react';

type MobilePanel = 'config' | 'console' | null;

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
    clearMessages,
  } = useWebSerial();

  const {
    getActiveMachine,
    machines,
    setActiveMachineId,
    updateMachine,
    addMachine,
    deleteMachine,
  } = useMachineStore();
  const {
    getActiveMaterial,
    materials,
    setActiveMaterialId,
    updateMaterial,
    addMaterial,
    deleteMaterial,
  } = useMaterialStore();
  const pattern = usePatternStore();
  const ui = useUIStore();

  const activeMachine = getActiveMachine();
  const activeMaterial = getActiveMaterial();

  // Deriving results using useMemo instead of useEffect+useState to avoid cascading renders
  const generatedResults = useMemo<GeneratedData | null>(() => {
    if (!activeMachine || !activeMaterial) return null;
    return generatePatternPaths(pattern.selectedPattern, activeMachine, activeMaterial, {
      ...pattern,
      patternPosition: pattern.patternPosition,
    });
  }, [pattern, activeMachine, activeMaterial]);

  const estimatedTimeStr = useMemo(() => {
    if (!generatedResults || !activeMachine) return null;
    return formatEstimatedTime(estimateToolpathTime(generatedResults.paths, activeMachine));
  }, [generatedResults, activeMachine]);

  const handlePrint = useCallback(() => {
    if (generatedResults) printGCode(generatedResults.gcode);
  }, [generatedResults, printGCode]);

  const [jogPos, setJogPos] = useState({ x: 0, y: 0 });
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);

  const handleJog = useCallback(
    (x: number, y: number) => {
      if (!isConnected) return;
      send(`G0 X${x.toFixed(2)} Y${y.toFixed(2)}`);
      setJogPos({ x, y });
    },
    [isConnected, send]
  );

  const handleJogRelative = useCallback(
    (dx: number, dy: number) => {
      if (!isConnected) return;
      const nx = Math.round((jogPos.x + dx) * 100) / 100;
      const ny = Math.round((jogPos.y + dy) * 100) / 100;
      send(`G0 X${nx.toFixed(2)} Y${ny.toFixed(2)}`);
      setJogPos({ x: nx, y: ny });
    },
    [isConnected, send, jogPos]
  );

  const configPanel = (
    <div className="p-4 md:p-6">
      <AnimatePresence mode="wait">
        {ui.currentStep === 'machine' && (
          <motion.div
            key="machine"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <MachineSelector
              machines={machines}
              selectedId={activeMachine?.id || ''}
              onSelect={setActiveMachineId}
              onUpdate={updateMachine}
              onCreate={addMachine}
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
          >
            <MaterialDatabase
              materials={materials}
              selectedId={activeMaterial?.id || ''}
              onSelect={setActiveMaterialId}
              onUpdate={updateMaterial}
              onCreate={addMaterial}
              onDelete={deleteMaterial}
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
          >
            <div className="space-y-6">
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500 mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  G-Code Preview
                </h3>
                <div className="bg-[#0D0D0D] rounded-xl border border-white/5 h-[60vh]">
                  {generatedResults ? (
                    <GCodeOutput
                      gcode={generatedResults.gcode}
                      patternType={pattern.selectedPattern}
                      machine={activeMachine!}
                      material={activeMaterial!}
                      paths={generatedResults.paths}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-neutral-700 text-xs italic">
                      Generate a pattern first
                    </div>
                  )}
                </div>
              </section>
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
      onConnect={connect}
      onDisconnect={disconnect}
      onSend={send}
      onClear={clearMessages}
      onAbortPrint={abortPrint}
      onPrint={handlePrint}
      gcode={generatedResults?.gcode}
      activeMachine={activeMachine}
      onJogRelative={handleJogRelative}
    />
  );

  const svgPanel = (
    <div className="flex-1 flex flex-col min-w-0 bg-[#000] items-center justify-center">
      <div className="flex-1 relative w-full h-full">
        {generatedResults && activeMachine && activeMaterial ? (
          <SVGVisualizer
            key={`${activeMachine.id}-${activeMachine.bedWidth}-${activeMachine.bedHeight}-${activeMachine.bedShape}`}
            svgPaths={generatedResults.svgPaths}
            machine={activeMachine}
            material={activeMaterial}
            patternType={pattern.selectedPattern}
            paths={generatedResults.paths}
            onJog={handleJog}
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
      <header className="shrink-0 h-12 bg-[#0A0A0A] border-b border-white/8">
        <WorkflowStepper />
      </header>

      {/* Desktop & Tablet: 3-column layout */}
      <div className="hidden md:flex flex-1 min-h-0">
        <div className="w-[280px] xl:w-[340px] 2xl:w-[400px] border-r border-white/8 bg-[#0A0A0A] overflow-y-auto shrink-0">
          {configPanel}
        </div>
        {svgPanel}
        <div className="w-[280px] xl:w-[340px] 2xl:w-[400px] border-l border-white/8 bg-[#0A0A0A] overflow-y-auto shrink-0">
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
        connectionState={connectionState}
        machineName={activeMachine?.name || ''}
        firmware={activeMachine?.firmware || 'grbl'}
        materialName={activeMaterial?.name || ''}
        estimatedTimeStr={estimatedTimeStr}
        isDelta={activeMachine?.isDelta || false}
        isPrinting={isPrinting}
        progress={progress}
        onConnect={connect}
        onDisconnect={disconnect}
      />

      <Analytics />
      <SpeedInsights />
    </div>
  );
}
