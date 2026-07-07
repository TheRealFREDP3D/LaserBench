import { Wifi, WifiOff, Cpu, Layers, Clock, Activity, Move } from 'lucide-react';

interface StatusBarProps {
  isConnected: boolean;
  machineName: string;
  firmware: string;
  materialName: string;
  estimatedTimeStr: string | null;
  isPrinting: boolean;
  progress: number;
  movementMode: 'G90' | 'G91';
  onConnect: () => void;
  onDisconnect: () => void;
}

const StatusBar = ({
  isConnected,
  machineName,
  firmware,
  materialName,
  estimatedTimeStr,
  isPrinting,
  progress,
  movementMode,
  onConnect,
  onDisconnect,
}: StatusBarProps) => {
  return (
    <div className="h-8 bg-[#0D0D0D] border-t border-white/8 flex items-center px-4 justify-between text-[10px] uppercase tracking-wider font-bold select-none">
      <div className="flex items-center gap-6">
        <button
          onClick={isConnected ? onDisconnect : onConnect}
          data-tour="connect-button"
          className={`flex items-center gap-2 transition-colors ${isConnected ? 'text-green-500 hover:text-green-400' : 'text-red-500 hover:text-red-400'}`}
        >
          {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </button>

        <div className="flex items-center gap-2 text-neutral-500">
          <Cpu className="w-3.5 h-3.5 text-neutral-600" />
          <span className="text-neutral-300">{machineName || 'None'}</span>
          <span className="px-1.5 py-0.5 bg-white/5 rounded text-[8px] text-neutral-500">
            {firmware}
          </span>
        </div>

        <div className="flex items-center gap-2 text-neutral-500">
          <Layers className="w-3.5 h-3.5 text-neutral-600" />
          <span className="text-neutral-300">{materialName || 'None'}</span>
        </div>

        {isConnected && (
          <div className="flex items-center gap-1.5 text-neutral-500">
            <Move className="w-3.5 h-3.5 text-neutral-600" />
            <span
              className={`px-1.5 py-0.5 rounded text-[8px] font-mono ${
                movementMode === 'G91'
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'bg-white/5 text-neutral-500'
              }`}
            >
              {movementMode === 'G91' ? 'Incremental' : 'Absolute'}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        {isPrinting && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-amber-500 animate-pulse">
              <Activity className="w-3.5 h-3.5" />
              <span>Burning: {progress}%</span>
            </div>
            <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {estimatedTimeStr && (
          <div className="flex items-center gap-2 text-neutral-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Est: {estimatedTimeStr}</span>
          </div>
        )}

        <div className="text-neutral-600 font-mono">v{__APP_VERSION__}</div>
      </div>
    </div>
  );
};

export default StatusBar;
