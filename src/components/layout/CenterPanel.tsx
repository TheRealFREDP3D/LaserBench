import type {ReactNode} from 'react';

interface CenterPanelProps {
  activeTab: 'pattern' | 'presets';
  onTabChange: (tab: 'pattern' | 'presets') => void;
  children: [ReactNode, ReactNode];
}

const TABS: {key: 'pattern' | 'presets'; label: string; controls: string}[] = [
  {key: 'pattern', label: 'Pattern', controls: 'panel-pattern'},
  {key: 'presets', label: 'Presets', controls: 'panel-presets'},
];

export default function CenterPanel({activeTab, onTabChange, children}: CenterPanelProps) {
  return (
    <div className="flex flex-col overflow-y-auto border-r border-white/8 w-[360px] shrink-0">
      <div role="tablist" className="flex border-b border-white/8 shrink-0" aria-label="Center panel tabs">
        {TABS.map(({key, label, controls}) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
            aria-controls={controls}
            id={`tab-${key}`}
            onClick={() => onTabChange(key)}
            className={`min-h-[44px] px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer select-none outline-none
              ${activeTab === key
                ? 'border-b-2 border-red-600 text-white'
                : 'text-[#888] hover:text-[#E0E0E0] border-b-2 border-transparent'
              }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div id="panel-pattern" className={activeTab === 'pattern' ? 'block' : 'hidden'} data-testid="pattern-panel">
          {children[0]}
        </div>
        <div id="panel-presets" className={activeTab === 'presets' ? 'block' : 'hidden'} data-testid="presets-panel">
          {children[1]}
        </div>
      </div>
    </div>
  );
}
