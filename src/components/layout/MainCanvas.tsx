import type {ReactNode} from 'react';

interface MainCanvasProps {
  outputTab: 'gcode' | 'console';
  onOutputTabChange: (tab: 'gcode' | 'console') => void;
  isConnected: boolean;
  children: [ReactNode, ReactNode, ReactNode];
}

export default function MainCanvas({outputTab, onOutputTabChange, isConnected, children}: MainCanvasProps) {
  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <div className="flex-1 min-h-[300px] md:min-h-[400px]">
        {children[0]}
      </div>

      <div className="border-t border-white/8">
        <div role="tablist" className="flex border-b border-white/8" aria-label="Output panel tabs">
          <button
            role="tab"
            aria-selected={outputTab === 'gcode'}
            aria-controls="panel-gcode"
            id="tab-gcode"
            onClick={() => onOutputTabChange('gcode')}
            className={`min-h-[44px] px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer select-none outline-none
              ${outputTab === 'gcode'
                ? 'border-b-2 border-red-600 text-white'
                : 'text-[#888] hover:text-[#E0E0E0] border-b-2 border-transparent'
              }`}
          >
            G-Code
          </button>
          <button
            role="tab"
            aria-selected={outputTab === 'console'}
            aria-controls="panel-console"
            id="tab-console"
            onClick={() => onOutputTabChange('console')}
            className={`min-h-[44px] px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer select-none outline-none flex items-center gap-2
              ${outputTab === 'console'
                ? 'border-b-2 border-red-600 text-white'
                : 'text-[#888] hover:text-[#E0E0E0] border-b-2 border-transparent'
              }`}
          >
            Console
            {isConnected && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" data-testid="connection-badge" />
            )}
          </button>
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          <div id="panel-gcode" className={outputTab === 'gcode' ? 'block' : 'hidden'} data-testid="gcode-panel">
            {children[1]}
          </div>
          <div id="panel-console" className={outputTab === 'console' ? 'block' : 'hidden'} data-testid="console-panel">
            {children[2]}
          </div>
        </div>
      </div>
    </div>
  );
}
