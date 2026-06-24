import { useState, useEffect, useMemo, useCallback } from 'react';
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

  const [generatedResults, setGeneratedResults] = useState<GeneratedData | null>(null);

  const estimatedTimeStr = useMemo(() => {
    if (!generatedResults || !activeMachine) return null;
    return formatEstimatedTime(estimateToolpathTime(generatedResults.paths, activeMachine));
  }, [generatedResults, activeMachine]);

  // Real-time generation
  useEffect(() => {
    if (!activeMachine || !activeMaterial) return;
    const res = generatePatternPaths(pattern.selectedPattern, activeMachine, activeMaterial, {
      ...pattern,
      patternPosition: pattern.patternPosition,
    });
    setGeneratedResults(res);
    pattern.setStepComplete('pattern', true);
  }, [
    pattern.selectedPattern,
    pattern.powerMin,
    pattern.powerMax,
    pattern.speedMin,
    pattern.speedMax,
    pattern.powerSteps,
    pattern.speedSteps,
    pattern.blockSize,
    pattern.patternPosition,
    activeMachine,
    activeMaterial,
    pattern.setStepComplete,
  ]);

  const handlePrint = useCallback(() => {
    if (generatedResults) printGCode(generatedResults.gcode);
  }, [generatedResults, printGCode]);

  const handleJog = useCallback(
    (x: number, y: number) => {
      if (!isConnected) return;
      send(`G0 X${x.toFixed(2)} Y${y.toFixed(2)}`);
    },
    [isConnected, send]
  );

  return (
    <div className="h-screen w-full flex flex-col bg-[#050505] text-[#E0E0E0] font-sans selection:bg-red-500/30 overflow-hidden">
      <WorkflowStepper />

      <div className="flex-1 flex min-h-0">
        <div className="w-[400px] border-r border-white/8 flex flex-col bg-[#0A0A0A] overflow-y-auto">
          <div className="p-6">
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
        </div>

        <div className="flex-1 flex flex-col min-w-0 bg-[#000]">
          <div className="flex-1 relative">
            {generatedResults && activeMachine && activeMaterial ? (
              <SVGVisualizer
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

        <div className="w-[400px] border-l border-white/8 flex flex-col bg-[#0A0A0A]">
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
          />
        </div>
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
