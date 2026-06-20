import type {ReactNode} from 'react';
import {Triangle} from 'lucide-react';

interface StatusBarProps {
  isConnected: boolean;
  connectionState: 'connected' | 'offline' | 'connecting';
  machineName: string;
  firmware: string;
  materialName: string;
  estimatedTimeStr: string | null;
  isDelta: boolean;
  deltaPrintRadius?: number;
  isPrinting: boolean;
  progress: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

const CONNECTION_CONFIG: Record<string, {dotClass: string; label: string}> = {
  connected:  {dotClass: 'bg-emerald-500 animate-pulse', label: 'CONNECTED'},
  offline:    {dotClass: 'bg-zinc-500',                   label: 'OFFLINE'},
  connecting: {dotClass: 'bg-amber-400 animate-pulse',    label: 'CONNECTING'},
};

export default function StatusBar({
  isConnected, connectionState, machineName, firmware, materialName,
  estimatedTimeStr, isDelta, deltaPrintRadius, isPrinting, progress,
  onConnect, onDisconnect,
}: StatusBarProps) {
  const cfg = CONNECTION_CONFIG[connectionState] || CONNECTION_CONFIG.offline;

  let progressIndicator: ReactNode = null;
  if (isPrinting) {
    if (progress > 0 && progress < 100) {
      progressIndicator = <span className="text-emerald-400 font-bold">{progress}%</span>;
    } else {
      progressIndicator = <span className="text-emerald-400 font-bold">PRINTING…</span>;
    }
  }

  return (
    <footer className="h-8 bg-[#0F0F0F] border-t border-white/8 flex items-center px-4 gap-4 text-[10px] font-mono shrink-0 fixed bottom-0 inset-x-0 z-40">
      {/* Connection status — clickable to connect/disconnect */}
      <button
        onClick={() => { if (isConnected) onDisconnect?.(); else onConnect?.(); }}
        aria-label={isConnected ? 'Disconnect from printer' : 'Connect to printer'}
        className="flex items-center gap-1.5 shrink-0 hover:text-white transition"
        title={isConnected ? 'Disconnect from printer' : 'Connect to printer'}
        data-testid="connection-label"
      >
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
        {cfg.label}
      </button>

      {/* Machine name */}
      <span className="truncate max-w-[120px]" title={machineName} data-testid="machine-name">
        {machineName}
      </span>

      {/* Firmware */}
      <span className="text-[#707070] shrink-0" data-testid="firmware">{firmware.toUpperCase()}</span>

      {/* Material name */}
      <span className="truncate max-w-[120px]" title={materialName} data-testid="material-name">
        {materialName}
      </span>

      {/* Estimated burn time */}
      <span className="text-[#707070] shrink-0" data-testid="burn-time">
        {estimatedTimeStr ?? '—'}
      </span>

      {/* Delta indicator */}
      {isDelta && (
        <span className="text-purple-400 shrink-0 flex items-center gap-1" title={`Delta radius: ${deltaPrintRadius ?? '?'}mm`}>
          <Triangle className="w-2.5 h-2.5 fill-purple-400" />
          Δ
        </span>
      )}

      {/* Progress */}
      {progressIndicator}
    </footer>
  );
}
