import React, { useEffect, useRef, useState } from 'react';
import {
  Terminal,
  Power,
  PowerOff,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Home,
  Flame,
  ShieldAlert,
  Send
} from 'lucide-react';
import { SerialMessage } from '../lib/useWebSerial';
import { MachineProfile } from '../types';

interface PrinterConsoleProps {
  isConnected: boolean;
  messages: SerialMessage[];
  isPrinting: boolean;
  progress: number;
  onConnect: () => void;
  onDisconnect: () => void;
  onSend: (command: string) => void;
  onClear: () => void;
  activeMachine: MachineProfile | null;
  theme: 'light' | 'dark';
}

export const PrinterConsole: React.FC<PrinterConsoleProps> = ({
  isConnected,
  messages,
  isPrinting,
  progress,
  onConnect,
  onDisconnect,
  onSend,
  onClear,
  activeMachine,
  theme,
}) => {
  const [command, setCommand] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);
  const isLight = theme === 'light';

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleManualSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (command.trim()) {
      onSend(command.trim());
      setCommand('');
    }
  };

  const handleFire = () => {
    if (!activeMachine) return;
    const powerValue = Math.round(activeMachine.pwmMax * 0.3);
    const fireCmd = activeMachine.laserOn.replace('{power}', powerValue.toString());
    onSend(fireCmd);
  };

  const handleStopFire = () => {
    if (!activeMachine) return;
    onSend(activeMachine.laserOff);
  };

  const jog = (axis: 'X' | 'Y' | 'Z', amount: number) => {
    onSend(`G91`); // Relative positioning
    onSend(`G1 ${axis}${amount} F${activeMachine?.travelSpeed || 3000}`);
    onSend(`G90`); // Back to absolute
  };

  const isControlDisabled = !isConnected || isPrinting;

  return (
    <div className={`border rounded-xl p-5 shadow-sm flex flex-col h-full space-y-4 transition-all duration-200 ${
      isLight
        ? 'bg-white border-zinc-200 text-zinc-800'
        : 'bg-[#0E0E0E] border-white/10 text-[#E0E0E0]'
    }`}>
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <Terminal className="text-indigo-500 w-5 h-5" />
          <h2 className={`text-sm font-semibold tracking-wide uppercase font-sans ${isLight ? 'text-zinc-800' : 'text-indigo-300'}`}>Printer Console</h2>
          {isConnected && (
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </div>
        <div className="flex gap-2">
          {isConnected ? (
            <button
              onClick={onDisconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-500 rounded-lg text-xs font-semibold transition border border-red-500/30"
            >
              <PowerOff className="w-3.5 h-3.5" />
              Disconnect
            </button>
          ) : (
            <button
              onClick={onConnect}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-md"
            >
              <Power className="w-3.5 h-3.5" />
              Connect (250k)
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar for Printing */}
      {isPrinting && (
        <div className="w-full bg-zinc-800 rounded-full h-1.5">
          <div
            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
          <p className="text-[10px] mt-1 text-indigo-400 font-mono">PRINTING: {progress}%</p>
        </div>
      )}

      {/* Manual Controls Grid */}
      <div className="grid grid-cols-3 gap-4 border-b border-white/5 pb-4">
        {/* Jogging Controls */}
        <div className="flex flex-col items-center gap-1">
          <div className="grid grid-cols-3 gap-1">
            <div />
            <button onClick={() => jog('Y', 10)} disabled={isControlDisabled} className="p-2 bg-zinc-800 rounded hover:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed"><ArrowUp className="w-4 h-4" /></button>
            <div />
            <button onClick={() => jog('X', -10)} disabled={isControlDisabled} className="p-2 bg-zinc-800 rounded hover:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed"><ArrowLeft className="w-4 h-4" /></button>
            <button onClick={() => onSend('G28')} disabled={isControlDisabled} className="p-2 bg-indigo-600/20 text-indigo-400 rounded hover:bg-indigo-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed"><Home className="w-4 h-4" /></button>
            <button onClick={() => jog('X', 10)} disabled={isControlDisabled} className="p-2 bg-zinc-800 rounded hover:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed"><ArrowRight className="w-4 h-4" /></button>
            <div />
            <button onClick={() => jog('Y', -10)} disabled={isControlDisabled} className="p-2 bg-zinc-800 rounded hover:bg-zinc-700 transition disabled:opacity-50 disabled:cursor-not-allowed"><ArrowDown className="w-4 h-4" /></button>
            <div />
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">JOG XY (10mm)</span>
        </div>

        {/* Z Controls */}
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="flex flex-col gap-1">
            <button onClick={() => jog('Z', 5)} disabled={isControlDisabled} className="p-2 bg-zinc-800 rounded hover:bg-zinc-700 transition flex items-center gap-2 text-[10px] disabled:opacity-50 disabled:cursor-not-allowed">
              <ArrowUp className="w-3 h-3" /> Z+
            </button>
            <button onClick={() => jog('Z', -5)} disabled={isControlDisabled} className="p-2 bg-zinc-800 rounded hover:bg-zinc-700 transition flex items-center gap-2 text-[10px] disabled:opacity-50 disabled:cursor-not-allowed">
              <ArrowDown className="w-3 h-3" /> Z-
            </button>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">JOG Z (5mm)</span>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col gap-2">
          <button
            onMouseDown={handleFire}
            onMouseUp={handleStopFire}
            onMouseLeave={handleStopFire}
            disabled={isControlDisabled}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-500 rounded-lg text-xs font-bold transition border border-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Flame className="w-3.5 h-3.5" />
            FIRE (30%)
          </button>
          <button
            onClick={() => onSend('M112')}
            disabled={!isConnected}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-500 rounded-lg text-xs font-bold transition border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            E-STOP
          </button>
        </div>
      </div>

      {/* Log Terminal */}
      <div className={`flex-1 min-h-[200px] rounded-lg border overflow-hidden transition-all duration-200 flex flex-col ${
        isLight
          ? 'bg-zinc-50 border-zinc-200 text-zinc-800'
          : 'bg-black border-white/5 text-emerald-400/90'
      }`}>
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-white/5">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Live Feed</span>
          <button onClick={onClear} className="text-zinc-500 hover:text-zinc-300 transition">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-3 font-mono text-[11px] leading-relaxed">
          {messages.length === 0 && (
            <div className="text-zinc-700 italic">No activity yet. Connect to start...</div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.type === 'sent' ? 'text-indigo-400/80' : ''}`}>
              <span className="text-zinc-600 shrink-0 select-none">
                [{new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
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
            placeholder={isPrinting ? "Printing in progress..." : "Send G-Code command..."}
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
  );
};
