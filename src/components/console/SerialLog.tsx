import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2 } from 'lucide-react';
import type { SerialMessage } from '../../lib/useWebSerial';
import { useTheme } from '../../lib/themeContext';

interface SerialLogProps {
  messages: SerialMessage[];
  onSend: (cmd: string) => void;
  onClear: () => void;
  isPrinting: boolean;
  isControlDisabled: boolean;
}

export const SerialLog = React.memo(function SerialLog({
  messages,
  onSend,
  onClear,
  isPrinting,
  isControlDisabled,
}: SerialLogProps) {
  const [command, setCommand] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const { theme } = useTheme();
  const isLight = theme === 'light';

  useEffect(() => {
    if (autoScrollRef.current) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleLogScroll = () => {
    const el = logContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    autoScrollRef.current = atBottom;
    setAutoScroll(atBottom);
  };

  const toggleAutoScroll = () => {
    const next = !autoScrollRef.current;
    autoScrollRef.current = next;
    setAutoScroll(next);
    if (next) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = command.trim();
    if (!trimmed) return;
    onSend(trimmed.toUpperCase());
    setCommand('');
  };

  return (
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
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAutoScroll}
            className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition ${
              autoScroll
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-zinc-700 text-zinc-400 border border-zinc-600'
            }`}
            title={autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF — scroll down to resume'}
          >
            {autoScroll ? '⬇ AUTO' : '⏸ PAUSED'}
          </button>
          <button onClick={onClear} className="text-zinc-500 hover:text-zinc-300 transition">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div
        ref={logContainerRef}
        onScroll={handleLogScroll}
        aria-live="polite"
        aria-label="Serial communication log"
        className="flex-1 overflow-auto p-3 font-mono text-[11px] leading-relaxed"
      >
        {messages.length === 0 && <div className="text-zinc-700 italic">No activity yet.</div>}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.type === 'sent' ? 'text-indigo-400/80' : ''}`}>
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
            <span className="shrink-0 font-bold opacity-60">{msg.type === 'sent' ? '>' : '<'}</span>
            <span className="break-all whitespace-pre-wrap">{msg.text}</span>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="border-t border-white/5 p-2 flex gap-2">
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
  );
});
SerialLog.displayName = 'SerialLog';
