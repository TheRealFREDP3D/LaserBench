import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Sliders, FolderOpen, ChevronDown } from 'lucide-react';

interface CenterPanelProps {
  /** Children: [PatternConfigurator, PresetManager] */
  children: [ReactNode, ReactNode];
  /** Whether the preset flyout is open (controlled) */
  presetFlyoutOpen?: boolean;
  /** Toggle the preset flyout */
  onPresetFlyoutToggle?: (open: boolean) => void;
}

export default function CenterPanel({ children, presetFlyoutOpen = false, onPresetFlyoutToggle }: CenterPanelProps) {
  const flyoutRef = useRef<HTMLDivElement>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = onPresetFlyoutToggle ? presetFlyoutOpen : internalOpen;

  // Close flyout on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (flyoutRef.current && !flyoutRef.current.contains(e.target as Node)) {
        if (onPresetFlyoutToggle) onPresetFlyoutToggle(false);
        else setInternalOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onPresetFlyoutToggle]);

  const toggleFlyout = () => {
    if (onPresetFlyoutToggle) onPresetFlyoutToggle(!isOpen);
    else setInternalOpen(!isOpen);
  };

  return (
    <div className="flex flex-col overflow-y-auto border-r border-white/8 w-[360px] shrink-0 relative">
      {/* Header — single section title + Load Preset button (replaces old 2-tab bar) */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0 bg-[#0E0E0E]" data-testid="center-panel-header">
        <div className="flex items-center gap-2">
          <Sliders className="text-red-500 w-4 h-4" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white">Pattern</h2>
        </div>
        <div className="relative" ref={flyoutRef}>
          <button
            type="button"
            id="load-preset-btn"
            onClick={toggleFlyout}
            aria-expanded={isOpen}
            aria-controls="preset-flyout"
            aria-label="Load a saved preset"
            data-testid="load-preset-toggle"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer select-none outline-none border ${
              isOpen
                ? 'bg-red-600 text-black border-red-500 shadow-[0_0_8px_rgba(220,38,38,0.4)]'
                : 'bg-[#222] border-white/10 text-[#AAA] hover:bg-[#333] hover:text-white'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Load Preset</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div
              id="preset-flyout"
              data-testid="preset-flyout"
              className="absolute right-0 top-full mt-1 w-[340px] max-w-[90vw] bg-[#0E0E0E] border border-white/10 rounded-md shadow-2xl z-50 max-h-[70vh] overflow-y-auto"
            >
              {children[1]}
            </div>
          )}
        </div>
      </div>

      {/* Pattern panel — always visible (no tab switching needed) */}
      <div id="panel-pattern" className="block" data-testid="pattern-panel">
        {children[0]}
      </div>
      {/* Hidden presets panel for backward compat with any external test selectors */}
      <div id="panel-presets" className="hidden" data-testid="presets-panel" aria-hidden="true" />
    </div>
  );
}
