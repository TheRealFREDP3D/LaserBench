import type { ReactNode } from 'react';
import { Eye, FileCode, Terminal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type CanvasView = 'preview' | 'code' | 'operate';

interface MainCanvasProps {
  /** Current view mode */
  canvasView: CanvasView;
  onViewChange: (view: CanvasView) => void;
  /** Whether serial is connected — shows badge on Operate tab */
  isConnected: boolean;
  /** Whether a print job is currently running — auto-promotes Operate badge */
  isPrinting: boolean;
  /** Children: [SVGVisualizer, GCodeOutput, PrinterConsole] */
  children: [ReactNode, ReactNode, ReactNode];
}

const VIEWS: { key: CanvasView; label: string; icon: LucideIcon; controls: string; shortcut: string }[] = [
  { key: 'preview', label: 'Preview', icon: Eye,       controls: 'panel-preview', shortcut: '4' },
  { key: 'code',    label: 'Code',    icon: FileCode,  controls: 'panel-gcode',   shortcut: '5' },
  { key: 'operate', label: 'Operate', icon: Terminal,  controls: 'panel-console', shortcut: '6' },
];

export default function MainCanvas({ canvasView, onViewChange, isConnected, isPrinting, children }: MainCanvasProps) {
  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* View-mode toggle (replaces old bottom G-Code/Console tab bar) */}
      <div
        role="tablist"
        className="flex border-b border-white/8 shrink-0 bg-[#0E0E0E]"
        aria-label="Canvas view mode"
        data-testid="canvas-view-toggle"
      >
        {VIEWS.map(({ key, label, icon: Icon, controls, shortcut }) => {
          const isActive = canvasView === key;
          const showBadge = key === 'operate' && (isConnected || isPrinting);
          const badgeClass = isPrinting
            ? 'bg-amber-500 animate-pulse'
            : 'bg-emerald-500 animate-pulse';

          return (
            <button
              key={key}
              role="tab"
              aria-selected={isActive}
              aria-controls={controls}
              id={`tab-${key}`}
              onClick={() => onViewChange(key)}
              className={`min-h-[40px] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer select-none outline-none flex items-center gap-2 border-b-2
                ${isActive
                  ? 'border-red-600 text-white'
                  : 'text-[#888] hover:text-[#E0E0E0] border-transparent'
                }`}
              data-testid={`view-tab-${key}`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-red-500' : ''}`} />
              <span>{label}</span>
              <kbd className={`hidden lg:inline-block text-[9px] font-mono px-1 py-0.5 rounded border ${isActive ? 'border-red-500/40 text-red-300 bg-red-950/30' : 'border-white/10 text-neutral-600 bg-[#0A0A0A]'}`}>
                {shortcut}
              </kbd>
              {showBadge && (
                <span
                  className={`w-2 h-2 rounded-full ${badgeClass}`}
                  data-testid="connection-badge"
                  title={isPrinting ? 'Print in progress' : 'Printer connected'}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* View content — each panel kept in DOM (hidden when inactive) for state preservation */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div id="panel-preview" className={canvasView === 'preview' ? 'flex-1 flex flex-col min-h-0' : 'hidden'} data-testid="preview-panel">
          {children[0]}
        </div>
        <div id="panel-gcode" className={canvasView === 'code' ? 'flex-1 flex flex-col min-h-0' : 'hidden'} data-testid="gcode-panel">
          {children[1]}
        </div>
        <div id="panel-console" className={canvasView === 'operate' ? 'flex-1 flex flex-col min-h-0' : 'hidden'} data-testid="console-panel">
          {children[2]}
        </div>
      </div>
    </div>
  );
}
