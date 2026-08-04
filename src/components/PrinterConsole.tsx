import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { MachineProfile, SerialMessage } from '../types';
import { JogControls } from './console/JogControls';
import { FireControls } from './console/FireControls';
import { SerialLog } from './console/SerialLog';
import { validateGCode } from '../lib/gcodeDatabase';
import { sanitizeGCodeLine } from '../lib/gcodeGenerator';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

/** Max continuous FIRE duration before the laser is force-stopped (dead-man). */
const MAX_FIRE_MS = 60_000;

interface PrinterConsoleProps {
  isConnected: boolean;
  messages: SerialMessage[];
  isPrinting: boolean;
  progress: number;
  isHomed: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSend: (command: string) => Promise<void>;
  onClear: () => void;
  onAbortPrint: () => void;
  onPrint?: (gcode: string) => void;
  gcode?: string;
  activeMachine: MachineProfile | null;
  onJogRelative: (dx: number, dy: number) => void;
  onHome?: () => void;
}

const PrinterConsoleComponent = memo(function PrinterConsole({
  isConnected,
  messages,
  isPrinting,
  progress,
  isHomed,
  onConnect,
  onDisconnect,
  onSend,
  onClear,
  onAbortPrint,
  onPrint,
  gcode,
  activeMachine,
  onJogRelative,
  onHome,
}: PrinterConsoleProps) {
  const [showHomingWarning, setShowHomingWarning] = useState(false);
  const [showSafeZPrompt, setShowSafeZPrompt] = useState(false);
  const [jogStep, setJogStep] = useState(10);
  const [pendingWarning, setPendingWarning] = useState<{
    command: string;
    message: string;
    level: 'warn' | 'block';
  } | null>(null);

  // Dead-man timer that force-stops the laser if FIRE is held too long.
  const fireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Canonical laser-off command for the active machine (safety paths use this
  // directly instead of a hardcoded M5). Sanitized to a single line so a
  // crafted profile can't inject extra commands through the release path.
  const laserOffCmd = (activeMachine && sanitizeGCodeLine(activeMachine.laserOff)) || 'M5';

  const handleStopFire = useCallback(() => {
    if (fireTimerRef.current) {
      clearTimeout(fireTimerRef.current);
      fireTimerRef.current = null;
    }
    onSend(laserOffCmd).catch(() => {});
  }, [onSend, laserOffCmd]);

  const stopFireRef = useRef(handleStopFire);
  stopFireRef.current = handleStopFire;

  const handleFire = useCallback(() => {
    const power = Math.round((activeMachine?.pwmMax ?? 255) * 0.3);
    const cmd = activeMachine?.laserOn.replace('{power}', power.toString()) ?? `M3 S${power}`;
    onSend(cmd).catch(() => {});
    if (fireTimerRef.current) clearTimeout(fireTimerRef.current);
    // Dead-man cutoff: the laser can never stay on longer than MAX_FIRE_MS.
    fireTimerRef.current = setTimeout(() => {
      fireTimerRef.current = null;
      stopFireRef.current();
    }, MAX_FIRE_MS);
  }, [activeMachine, onSend]);

  // Cancel the dead-man timer on unmount so a pending fire can't outlive the UI.
  useEffect(() => {
    return () => {
      if (fireTimerRef.current) clearTimeout(fireTimerRef.current);
    };
  }, []);

  // X/Y jogging is owned by App (onJogRelative), which enforces homing with a
  // single confirm-gate for every entry point (buttons, keyboard, canvas) —
  // do not gate it here too. Z jogging and homing stay ungated (they're how
  // you get to a known position in the first place).
  const jog = useCallback(
    async (axis: string, dist: number) => {
      try {
        if (axis === 'Z') {
          await onSend('G91');
          await onSend(`G0 Z${dist} F${activeMachine?.travelSpeed || 4000}`);
          await onSend('G90');
          return;
        }
        const dx = axis === 'X' ? dist : 0;
        const dy = axis === 'Y' ? dist : 0;
        onJogRelative(dx, dy);
      } catch {
        // Connection dropped between jog initiation and send — ignore silently;
        // the serial store already logs the disconnect event.
      }
    },
    [onSend, onJogRelative, activeMachine?.travelSpeed]
  );

  const handleHome = useCallback(async () => {
    onHome?.();
    await onSend('G28');
    if (activeMachine?.zSecure !== undefined) {
      setShowSafeZPrompt(true);
    }
  }, [onSend, activeMachine, onHome]);

  const handleMoveToSafeZ = useCallback(async () => {
    setShowSafeZPrompt(false);
    if (activeMachine?.zSecure !== undefined) {
      await onSend('G90');
      await onSend(`G0 Z${activeMachine.zSecure} F${activeMachine.travelSpeed || 4000}`);
    }
  }, [onSend, activeMachine]);

  const handleCancelSafeZ = useCallback(() => {
    setShowSafeZPrompt(false);
  }, []);

  const handleEStop = useCallback(() => {
    if (isConnected) onSend('M112');
  }, [isConnected, onSend]);

  const handleRunJob = useCallback(() => {
    if (onPrint && gcode) {
      onPrint(gcode);
    }
    setShowHomingWarning(false);
  }, [onPrint, gcode]);

  const handleSendWithValidation = useCallback(
    (cmd: string) => {
      const trimmed = cmd.trim();
      if (!trimmed) return;

      const upper = trimmed.toUpperCase();
      const { level, message } = validateGCode(upper);

      if (level === 'safe') {
        onSend(upper);
      } else {
        setPendingWarning({ command: upper, message, level });
      }
    },
    [onSend]
  );

  const handleConfirmSend = useCallback(() => {
    if (pendingWarning) {
      onSend(pendingWarning.command);
      setPendingWarning(null);
    }
  }, [pendingWarning, onSend]);

  const handleCancelSend = useCallback(() => {
    setPendingWarning(null);
  }, []);

  const handleConnectKey = useCallback(() => {
    if (isConnected) onDisconnect();
    else onConnect();
  }, [isConnected, onConnect, onDisconnect]);

  const handleAbortKey = useCallback(() => {
    if (isPrinting) onAbortPrint();
  }, [isPrinting, onAbortPrint]);

  const handleFireKey = useCallback(() => {
    if (isConnected && !isPrinting) handleFire();
  }, [isConnected, isPrinting, handleFire]);

  // Collapsed: no extra logic needed beyond calling handleStopFire directly
  const handleHomeKey = useCallback(() => {
    if (isConnected && !isPrinting) handleHome();
  }, [isConnected, isPrinting, handleHome]);

  const handleJogUp = useCallback(() => {
    if (isConnected && !isPrinting) onJogRelative(0, jogStep);
  }, [isConnected, isPrinting, onJogRelative, jogStep]);

  const handleJogDown = useCallback(() => {
    if (isConnected && !isPrinting) onJogRelative(0, -jogStep);
  }, [isConnected, isPrinting, onJogRelative, jogStep]);

  const handleJogLeft = useCallback(() => {
    if (isConnected && !isPrinting) onJogRelative(-jogStep, 0);
  }, [isConnected, isPrinting, onJogRelative, jogStep]);

  const handleJogRight = useCallback(() => {
    if (isConnected && !isPrinting) onJogRelative(jogStep, 0);
  }, [isConnected, isPrinting, onJogRelative, jogStep]);

  useKeyboardShortcuts({
    onEStop: handleEStop,
    onFire: handleFireKey,
    onStopFire: handleStopFire,
    onHome: handleHomeKey,
    onJogUp: handleJogUp,
    onJogDown: handleJogDown,
    onJogLeft: handleJogLeft,
    onJogRight: handleJogRight,
    onConnect: handleConnectKey,
    onAbortPrint: handleAbortKey,
  });

  const isControlDisabled = !isConnected || isPrinting;

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] border-l border-white/5">
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 opacity-50'}`}
          />
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400">
            Hardware Console
          </h2>
        </div>
        <button
          onClick={isConnected ? onDisconnect : onConnect}
          className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${
            isConnected
              ? 'bg-red-950/20 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-black'
              : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'
          }`}
        >
          {isConnected ? 'Disconnect' : 'Connect'}
        </button>
      </div>

      <div className="flex-1 flex flex-col min-h-0 p-4 gap-3">
        {isPrinting && (
          <div className="shrink-0 bg-indigo-950/20 border border-indigo-500/20 rounded-lg p-3 space-y-2 animate-pulse">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-indigo-400 font-mono">PRINTING: {progress}%</p>
              <button
                onClick={onAbortPrint}
                className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[10px] rounded font-bold transition shadow-sm"
              >
                Abort Print
              </button>
            </div>
          </div>
        )}

        {showHomingWarning && !isPrinting && (
          <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 bg-amber-950/60 border border-amber-800/50 rounded-lg text-xs">
            <div className="flex items-center gap-2 text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Machine should be homed before running a job.</span>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={async () => {
                  await handleHome();
                  handleRunJob();
                }}
                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] rounded font-bold transition"
              >
                Home &amp; Run
              </button>
              <button
                onClick={handleRunJob}
                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] rounded font-bold transition"
              >
                Run Anyway
              </button>
              <button
                onClick={() => setShowHomingWarning(false)}
                className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-[10px] rounded font-bold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {showSafeZPrompt && !isPrinting && (
          <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 bg-blue-950/60 border border-blue-800/50 rounded-lg text-xs">
            <div className="flex items-center gap-2 text-blue-300">
              <span>Move to safe Z position ({activeMachine?.zSecure}mm)?</span>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={handleMoveToSafeZ}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] rounded font-bold transition"
              >
                Move to Safe Z
              </button>
              <button
                onClick={handleCancelSafeZ}
                className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-[10px] rounded font-bold transition"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {pendingWarning && (
          <div
            className={`shrink-0 flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs border ${
              pendingWarning.level === 'block'
                ? 'bg-red-950/60 border-red-800/50'
                : 'bg-amber-950/60 border-amber-800/50'
            }`}
          >
            <div
              className={`flex items-center gap-2 ${
                pendingWarning.level === 'block' ? 'text-red-300' : 'text-amber-300'
              }`}
            >
              <AlertTriangle
                className={`w-4 h-4 shrink-0 ${
                  pendingWarning.level === 'block' ? 'text-red-400' : 'text-amber-400'
                }`}
              />
              <span>
                <code className="font-mono font-bold">{pendingWarning.command}</code> —{' '}
                {pendingWarning.message}
              </span>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={handleConfirmSend}
                className={`px-2 py-1 text-white text-[10px] rounded font-bold transition ${
                  pendingWarning.level === 'block'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                Send Anyway
              </button>
              <button
                onClick={handleCancelSend}
                className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-[10px] rounded font-bold transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="shrink-0">
          <JogControls
            onJog={jog}
            onHome={handleHome}
            disabled={isControlDisabled}
            jogStep={jogStep}
            onJogStepChange={setJogStep}
            rightSlot={
              <FireControls
                onFire={handleFire}
                onStopFire={handleStopFire}
                onEStop={handleEStop}
                onRunJob={
                  onPrint && gcode
                    ? () => {
                        if (!isConnected) return;
                        if (isHomed) handleRunJob();
                        else setShowHomingWarning(true);
                      }
                    : undefined
                }
                isConnected={isConnected}
                isPrinting={isPrinting}
                canPrint={!!(onPrint && gcode)}
              />
            }
          />
        </div>

        <div className="flex-1 min-h-0">
          <SerialLog
            messages={messages}
            onSend={handleSendWithValidation}
            onClear={onClear}
            isPrinting={isPrinting}
            isControlDisabled={isControlDisabled}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
});
PrinterConsoleComponent.displayName = 'PrinterConsole';
export { PrinterConsoleComponent as PrinterConsole };
