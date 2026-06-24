import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Trash2,
  Play,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Home,
  Flame,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import type { SerialMessage } from '../lib/useWebSerial';
import type { MachineProfile } from '../types';
import PanelBoundary from './PanelBoundary';

interface PrinterConsoleProps {
  isConnected: boolean;
  messages: SerialMessage[];
  isPrinting: boolean;
  progress: number;
  onConnect: () => void;
  onDisconnect: () => void;
  onSend: (cmd: string) => void;
  onClear: () => void;
  onAbortPrint: () => void;
  onPrint?: (gcode: string) => void;
  gcode?: string;
  activeMachine: MachineProfile | null;
}

const PrinterConsoleComponent = React.memo(function PrinterConsole({
  isConnected,
  messages,
  isPrinting,
  progress,
  onConnect,
  onDisconnect,
  onSend,
  onClear,
  onAbortPrint,
  onPrint,
  gcode,
  activeMachine,
}: PrinterConsoleProps) {
  const [command, setCommand] = useState('');
  const [showHomingWarning, setShowHomingWarning] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const isLight = false;

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleManualSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim()) {
      onSend(command.trim().toUpperCase());
      setCommand('');
    }
  };

  const handleRunJob = useCallback(() => {
    if (onPrint && gcode) {
      onPrint(gcode);
    }
    setShowHomingWarning(false);
  }, [onPrint, gcode]);

  const handleHome = () => onSend('G28');

  const jog = (axis: string, dist: number) => {
    onSend('G91');
    onSend(`G0 ${axis}${dist} F3000`);
    onSend('G90');
  };

  const handleFire = () => {
    const power = Math.round((activeMachine?.pwmMax ?? 255) * 0.3);
    const cmd = activeMachine?.laserOn.replace('{power}', power.toString()) ?? `M3 S${power}`;
    onSend(cmd);
  };

  const handleStopFire = () => {
    onSend(activeMachine?.laserOff ?? 'M5');
  };

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

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {isPrinting && (
          <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-lg p-3 space-y-2 animate-pulse">
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
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-amber-950/60 border border-amber-800/50 rounded-lg text-xs">
            <div className="flex items-center gap-2 text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Machine should be homed before running a job.</span>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => {
                  handleHome();
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

        <div className="grid grid-cols-3 gap-4 border-b border-white/5 pb-4">
          <div className="flex flex-col items-center gap-1">
            <div className="grid grid-cols-3 gap-1">
              <div />
              <button
                onClick={() => jog('Y', 10)}
                disabled={isControlDisabled}
                className="p-2 bg-zinc-800 rounded hover:bg-zinc-700 transition disabled:opacity-50"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <div />
              <button
                onClick={() => jog('X', -10)}
                disabled={isControlDisabled}
                className="p-2 bg-zinc-800 rounded hover:bg-zinc-700 transition disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => onSend('G28')}
                disabled={isControlDisabled}
                className="p-2 bg-indigo-600/20 text-indigo-400 rounded hover:bg-indigo-600/30 transition disabled:opacity-50"
              >
                <Home className="w-4 h-4" />
              </button>
              <button
                onClick={() => jog('X', 10)}
                disabled={isControlDisabled}
                className="p-2 bg-zinc-800 rounded hover:bg-zinc-700 transition disabled:opacity-50"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
              <div />
              <button
                onClick={() => jog('Y', -10)}
                disabled={isControlDisabled}
                className="p-2 bg-zinc-800 rounded hover:bg-zinc-700 transition disabled:opacity-50"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              <div />
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">JOG XY</span>
          </div>

          <div className="flex flex-col items-center justify-center gap-2">
            <div className="flex flex-col gap-1">
              <button
                onClick={() => jog('Z', 5)}
                disabled={isControlDisabled}
                className="p-2 bg-zinc-800 rounded hover:bg-zinc-700 transition flex items-center gap-2 text-[10px] disabled:opacity-50"
              >
                <ArrowUp className="w-3 h-3" /> Z+
              </button>
              <button
                onClick={() => jog('Z', -5)}
                disabled={isControlDisabled}
                className="p-2 bg-zinc-800 rounded hover:bg-zinc-700 transition flex items-center gap-2 text-[10px] disabled:opacity-50"
              >
                <ArrowDown className="w-3 h-3" /> Z-
              </button>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">JOG Z</span>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onMouseDown={handleFire}
              onMouseUp={handleStopFire}
              onMouseLeave={handleStopFire}
              disabled={isControlDisabled}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-500 rounded-lg text-xs font-bold transition border border-amber-500/30 disabled:opacity-50"
            >
              <Flame className="w-3.5 h-3.5" />
              FIRE
            </button>
            <button
              onClick={() => onSend('M112')}
              disabled={!isConnected}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-500 rounded-lg text-xs font-bold transition border border-red-500/30 disabled:opacity-50"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              E-STOP
            </button>
            {onPrint && gcode && (
              <button
                onClick={() => {
                  if (!isConnected) return;
                  setShowHomingWarning(true);
                }}
                disabled={!isConnected || isPrinting}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition border shadow-sm disabled:opacity-50 ${
                  isPrinting
                    ? 'bg-zinc-700 border-zinc-600 text-zinc-400'
                    : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-500/30 text-white'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                {isPrinting ? 'Printing...' : 'Run Job'}
              </button>
            )}
          </div>
        </div>

        <div
          className={`h-[350px] rounded-lg border overflow-hidden transition-all duration-200 flex flex-col ${
            isLight
              ? 'bg-zinc-50 border-zinc-200 text-zinc-800'
              : 'bg-black border-white/5 text-emerald-400/90'
          }`}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-white/5">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              Live Feed
            </span>
            <button onClick={onClear} className="text-zinc-500 hover:text-zinc-300 transition">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-3 font-mono text-[11px] leading-relaxed">
            {messages.length === 0 && <div className="text-zinc-700 italic">No activity yet.</div>}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2 ${msg.type === 'sent' ? 'text-indigo-400/80' : ''}`}
              >
                <span className="text-zinc-600 shrink-0 select-none">
                  [
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                  ]
                </span>
                <span className="shrink-0 font-bold opacity-60">
                  {msg.type === 'sent' ? '>' : '<'}
                </span>
                <span className="break-all whitespace-pre-wrap">{msg.text}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
          <form onSubmit={handleManualSend} className="border-t border-white/5 p-2 flex gap-2">
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value.toUpperCase())}
              placeholder={isPrinting ? 'Printing...' : 'Send command...'}
              className="flex-1 bg-transparent border-none outline-none text-[11px] font-mono px-2 py-1"
              disabled={isControlDisabled}
            />
            <button
              type="submit"
              disabled={isControlDisabled || !command.trim()}
              className="text-indigo-500 disabled:text-zinc-700 transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
});
PrinterConsoleComponent.displayName = 'PrinterConsole';
export { PrinterConsoleComponent as PrinterConsole };
