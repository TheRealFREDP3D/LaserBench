import { useState, useRef } from 'react';
import { Book, Search, X, Check, Copy, Zap, Settings, ArrowRight, CornerDownRight } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useTheme } from '../lib/themeContext';
import { GCODE_DATABASE, type GCodeEntry } from '../lib/gcodeDatabase';

interface GCodeDictionaryProps {
  onClose: () => void;
}

export default function GCodeDictionary({ onClose }: GCodeDictionaryProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'motion' | 'laser' | 'coords' | 'system'>('all');
  const [selectedEntry, setSelectedEntry] = useState<GCodeEntry | null>(GCODE_DATABASE[0]);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const trapRef = useFocusTrap<HTMLDivElement>(true);

  const filteredEntries = GCODE_DATABASE.filter(entry => {
    const matchesSearch = 
      entry.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = activeTab === 'all' || entry.category === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleCopyExample = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => {
        setCopiedText(null);
      }, 2000);
    } catch {
      setCopiedText(null);
    }
  };

  const getCategoryColor = (cat: GCodeEntry['category']) => {
    switch (cat) {
      case 'motion': return 'text-sky-500 bg-sky-550/10 border-sky-500/20';
      case 'laser': return 'text-red-500 bg-red-550/10 border-red-500/20';
      case 'coords': return 'text-amber-500 bg-amber-550/10 border-amber-500/20';
      case 'system': return 'text-indigo-500 bg-indigo-550/10 border-indigo-500/20';
    }
  };

  return (
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label="G-Code Dictionary"
      className="fixed inset-0 bg-black/80 backdrop-blur-xs z-[110] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-4xl h-[85vh] rounded-xl border flex flex-col overflow-hidden shadow-2xl transition-all duration-300 ${
          isLight 
            ? 'bg-white border-zinc-200 text-zinc-800' 
            : 'bg-[#0F0F0F] border-white/10 text-[#E8E8E8]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header section with G-Code Icon */}
        <div className={`p-4 border-b flex items-center justify-between ${isLight ? 'border-zinc-200 bg-zinc-50/50' : 'border-white/8 bg-black/20'}`}>
          <div className="flex items-center gap-2.5">
            <Book className="w-5 h-5 text-indigo-500" />
            <div>
              <h3 className={`text-sm font-bold uppercase tracking-wider ${isLight ? 'text-zinc-800' : 'text-white'}`}>
                G-Code & M-Code Laser Dictionary
              </h3>
              <p className={`text-[10px] ${isLight ? 'text-zinc-400' : 'text-neutral-500'}`}>Reference documentation for direct calibration adjustments</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dictionary"
            className={`p-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
              isLight ? 'hover:bg-zinc-200 text-zinc-400 hover:text-black' : 'hover:bg-white/5 text-neutral-500 hover:text-white'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters and search area */}
        <div className={`px-5 py-3 border-b flex flex-col sm:flex-row gap-3 items-center justify-between ${
          isLight ? 'bg-zinc-50/20 border-zinc-200' : 'bg-black/10 border-white/8'
        }`}>
          {/* Tabs for categories */}
          <div className="flex flex-wrap gap-1 w-full sm:w-auto">
            {(['all', 'motion', 'laser', 'coords', 'system'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  // Auto select first of filtered list if available
                  const firstComp = GCODE_DATABASE.find(e => tab === 'all' || e.category === tab);
                  if (firstComp) setSelectedEntry(firstComp);
                }}
                className={`px-3 py-1 text-[11px] font-bold rounded capitalize transition-all duration-200 cursor-pointer border ${
                  activeTab === tab
                    ? 'bg-indigo-650 text-white border-transparent shadow-xs'
                    : isLight
                      ? 'text-zinc-500 bg-zinc-100 border-zinc-200 hover:bg-zinc-200'
                      : 'text-neutral-400 bg-zinc-900/60 border-white/5 hover:bg-neutral-800/80 hover:text-white'
                }`}
              >
                {tab === 'all' ? 'All Commands' : tab}
              </button>
            ))}
          </div>

          {/* Search Box input */}
          <div className="relative w-full sm:w-64 select-none">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-zinc-400' : 'text-neutral-600'}`} />
            <input 
              type="text"
              placeholder="Search code, e.g. G1..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full text-xs pl-8.5 pr-3 py-1.5 rounded-lg outline-none transition border ${
                isLight 
                  ? 'bg-zinc-100/50 border-zinc-200 focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500' 
                  : 'bg-[#1A1A1A] border-white/10 focus:bg-black focus:ring-1 focus:ring-red-500 focus:border-red-550'
              }`}
            />
          </div>
        </div>

        {/* Main interactive split pane */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left panel - Search scrollable index */}
          <div className={`w-1/3 border-r h-full overflow-y-auto ${isLight ? 'border-zinc-200 bg-zinc-50/20' : 'border-white/8'}`}>
            {filteredEntries.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500">
                No matching codes found.
              </div>
            ) : (
              filteredEntries.map((entry) => {
                const isActive = selectedEntry?.code === entry.code;
                return (
                  <button
                    key={entry.code}
                    onClick={() => setSelectedEntry(entry)}
                    className={`w-full text-left p-3.5 border-b transition-all duration-150 flex flex-col gap-1 cursor-pointer select-none ${
                      isLight ? 'border-zinc-100' : 'border-white/5'
                    } ${
                      isActive 
                        ? isLight 
                          ? 'bg-indigo-50/50 hover:bg-indigo-50/50' 
                          : 'bg-indigo-950/20 hover:bg-indigo-950/20'
                        : isLight
                          ? 'hover:bg-zinc-100'
                          : 'hover:bg-white/2'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-mono text-xs font-black tracking-wide ${
                        isActive ? 'text-indigo-600' : isLight ? 'text-zinc-800' : 'text-white'
                      }`}>
                        {entry.code}
                      </span>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase ${getCategoryColor(entry.category)}`}>
                        {entry.category}
                      </span>
                    </div>
                    <span className={`text-[11px] truncate font-sans ${
                      isActive ? 'font-medium text-indigo-700' : isLight ? 'text-zinc-600' : 'text-neutral-400'
                    }`}>
                      {entry.name}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Right panel - Full details readout */}
          <div className="flex-1 h-full overflow-y-auto p-6 bg-transparent/2 text-xs">
            {selectedEntry ? (
              <div className="space-y-5">
                {/* Heading */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className={`text-xl font-mono font-black ${isLight ? 'text-zinc-900 border-b-2 border-indigo-200 pb-0.5' : 'text-white border-b-2 border-red-950 pb-0.5'}`}>
                      {selectedEntry.code}
                    </h2>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border ${getCategoryColor(selectedEntry.category)}`}>
                      {selectedEntry.category} category
                    </span>
                  </div>
                  <h3 className={`text-sm font-semibold ${isLight ? 'text-zinc-700' : 'text-neutral-300'}`}>
                    {selectedEntry.name}
                  </h3>
                </div>

                {/* Main Desc sentence */}
                <p className={`leading-relaxed ${isLight ? 'text-zinc-650' : 'text-neutral-400'}`}>
                  {selectedEntry.description}
                </p>

                {/* Syntax block */}
                <div className="space-y-1.5">
                  <span className={`block uppercase font-bold text-[9px] tracking-wider ${isLight ? 'text-zinc-500' : 'text-neutral-500'}`}>
                    Command Format Syntax:
                  </span>
                  <div className={`p-3 rounded-lg font-mono text-[11px] border ${
                    isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-800' : 'bg-black border-white/5 text-neutral-300'
                  }`}>
                    {selectedEntry.syntax}
                  </div>
                </div>

                {/* Example live block */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className={`block uppercase font-bold text-[9px] tracking-wider ${isLight ? 'text-zinc-500' : 'text-neutral-500'}`}>
                      Laser Job Code Example:
                    </span>
                    <button
                      onClick={() => handleCopyExample(selectedEntry.example)}
                      className={`flex items-center gap-1 transition-all duration-150 cursor-pointer ${
                        copiedText === selectedEntry.example 
                          ? 'text-emerald-500' 
                          : isLight ? 'text-zinc-500 hover:text-black hover:font-bold' : 'text-neutral-500 hover:text-[#FFF]'
                      }`}
                    >
                      {copiedText === selectedEntry.example ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Copied Example!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy G-Code</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className={`p-3.5 rounded-lg font-mono text-xs flex justify-between items-center border ${
                    isLight 
                      ? 'bg-zinc-100 border-zinc-200 text-indigo-700' 
                      : 'bg-[#1A1A1A] border-white/5 text-emerald-400/95'
                  }`}>
                    <span>{selectedEntry.example}</span>
                    <CornerDownRight className={`w-3.5 h-3.5 ${isLight ? 'text-zinc-300' : 'text-[#333]'}`} />
                  </div>
                </div>

                {/* Elaborate deep-dive explanation */}
                <div className="space-y-1.5">
                  <span className={`block uppercase font-bold text-[9px] tracking-wider ${isLight ? 'text-zinc-500' : 'text-neutral-500'}`}>
                    Functional Deep-dive Explanation:
                  </span>
                  <p className={`leading-relaxed leading-normal ${isLight ? 'text-zinc-600' : 'text-[#AAA]'}`}>
                    {selectedEntry.explanation}
                  </p>
                </div>

                {/* Compatibility Info and quick warning */}
                <div className={`p-3 rounded-lg flex items-center justify-between border ${
                  isLight 
                    ? 'bg-indigo-50/30 border-indigo-100 text-zinc-700' 
                    : 'bg-indigo-950/10 border-indigo-950/30 text-slate-300'
                }`}>
                  <div className="flex items-center gap-2">
                    <Settings className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="font-sans">Hardware Safety Profile:</span>
                  </div>
                  <span className={`font-mono font-bold ${
                    selectedEntry.compatibility.includes('GRBL Only') || selectedEntry.compatibility.includes('Marlin Only')
                      ? 'text-red-500'
                      : 'text-green-500'
                  }`}>
                    {selectedEntry.compatibility}
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-neutral-500 py-20">
                <Book className="w-8 h-8 text-neutral-600 mb-2 animate-bounce" />
                <p>Select any G-Code instruction from the menu list to read detailed laser definitions.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer info/legend */}
        <div className={`p-3 text-[10px] text-center border-t select-none ${
          isLight ? 'bg-zinc-100 text-zinc-400 border-zinc-200' : 'bg-[#0B0B0B] text-neutral-500 border-white/8'
        }`}>
          <span>Common laser firmware uses standard ISO formats. Always test coordinates via Dry Runs (laser disabled) first.</span>
        </div>
      </div>
    </div>
  );
}
