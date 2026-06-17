import {useEffect, type ReactNode} from 'react';

interface LeftSidebarProps {
  activeTab: 'machine' | 'material';
  onTabChange: (tab: 'machine' | 'material') => void;
  isOpen: boolean;
  onClose: () => void;
  children: [ReactNode, ReactNode];
}

const TABS: {key: 'machine' | 'material'; label: string; controls: string}[] = [
  {key: 'machine', label: 'Machine', controls: 'panel-machine'},
  {key: 'material', label: 'Material', controls: 'panel-material'},
];

export default function LeftSidebar({activeTab, onTabChange, isOpen, onClose, children}: LeftSidebarProps) {
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) onClose();
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [onClose]);

  const sidebarContent = (
    <>
      <div role="tablist" className="flex border-b border-white/8 shrink-0" aria-label="Sidebar tabs">
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
        <div id="panel-machine" className={activeTab === 'machine' ? 'block' : 'hidden'} data-testid="machine-panel">
          {children[0]}
        </div>
        <div id="panel-material" className={activeTab === 'material' ? 'block' : 'hidden'} data-testid="material-panel">
          {children[1]}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* lg+ inline sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[360px] lg:shrink-0 lg:border-r lg:border-white/8 overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* sm/md slide-over */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-[360px] max-w-[85vw] bg-[#0E0E0E] border-r border-white/8
          flex flex-col overflow-y-auto transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        aria-hidden={!isOpen}
      >
        {sidebarContent}
      </aside>

      {/* backdrop */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
    </>
  );
}
