import { useState, useRef } from 'react';
import { Book, Search, X, Check, Copy, Zap, Settings, ArrowRight, CornerDownRight } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

export interface GCodeEntry {
  code: string;
  name: string;
  category: 'motion' | 'laser' | 'coords' | 'system';
  description: string;
  syntax: string;
  example: string;
  explanation: string;
  compatibility: 'GRBL & Marlin' | 'GRBL Only' | 'Marlin Only';
}

const GCODE_DATABASE: GCodeEntry[] = [
  {
    code: 'G0',
    name: 'Rapid Positioning (Non-cutting Move)',
    category: 'motion',
    description: 'Moves the laser head at maximum machine travel feedrate to the target coordinate without firing the laser.',
    syntax: 'G0 X[pos] Y[pos] Z[pos]',
    example: 'G0 X15.00 Y25.50',
    explanation: 'Safely and rapidly shifts the laser nozzle between separate burning segments. By default, laser controllers shut off the beam completely during G0 travel commands to prevent unwanted scorch marks.',
    compatibility: 'GRBL & Marlin'
  },
  {
    code: 'G1',
    name: 'Linear Cutting Motion',
    category: 'motion',
    description: 'Straight line translation at a specified cutting speed (F) while generating a regulated laser beam (S).',
    syntax: 'G1 X[pos] Y[pos] Z[pos] F[feedrate] S[power]',
    example: 'G1 X50.00 Y10.00 F1800 S120',
    explanation: 'The fundamental building block of all vector engraving and cutting paths. Coordinate dimensions dictate target destinations, F defines travel rate in millimeters per minute, and S scales the duty-cycle output of the laser.',
    compatibility: 'GRBL & Marlin'
  },
  {
    code: 'G20',
    name: 'Set Coordinates to Imperial (Inches)',
    category: 'coords',
    description: 'Instructs the controller firmware to calculate all coordinate numbers as inches.',
    syntax: 'G20',
    example: 'G20',
    explanation: 'Signals that subsequent numbers correspond to inches (where 1.0 = 25.4mm). Almost all modern hobbyist and industrial diode lasers default to Metric (G21), and it is not recommended to mix them.',
    compatibility: 'GRBL & Marlin'
  },
  {
    code: 'G21',
    name: 'Set Coordinates to Metric (Millimeters)',
    category: 'coords',
    description: 'Instructs the controller firmware to calculate all input coordinates as millimeters.',
    syntax: 'G21',
    example: 'G21',
    explanation: 'Forces the system to read numbers in standard millimeters. This is the global standard for laser engraving, ensuring highly reproducible calibration step widths.',
    compatibility: 'GRBL & Marlin'
  },
  {
    code: 'G28',
    name: 'Home All Axes / Reference Run',
    category: 'system',
    description: 'Triggers a homing sequence to locate physical microswitches/limits to assert a safe coordinate system.',
    syntax: 'G28',
    example: 'G28',
    explanation: 'Moves the laser carriage slowly until triggering limit sensor bars on the X, Y, and Z frame rails. Crucial step to define physical absolute zero bounds before calibration jigs are burnt.',
    compatibility: 'GRBL & Marlin'
  },
  {
    code: 'G90',
    name: 'Absolute Machine Positioning',
    category: 'coords',
    description: 'Directs the control firmware to define X/Y/Z positions relative to the absolute origin (0,0) of the workbed.',
    syntax: 'G90',
    example: 'G90',
    explanation: 'Instructs that G1 X10 will move the nozzle exactly 10mm from coordinate origin. LaserBench compiles the entire layout suite in G90 Mode to protect machine limits.',
    compatibility: 'GRBL & Marlin'
  },
  {
    code: 'G91',
    name: 'Incremental / Relative Positioning',
    category: 'coords',
    description: 'Directs the control firmware to count positions relative to the carriage\'s immediate position.',
    syntax: 'G91',
    example: 'G91',
    explanation: 'If the nozzle rests at X10, committing G1 X10 in Relative mode offsets the head an extra 10mm to the right, landing at physical position X20.',
    compatibility: 'GRBL & Marlin'
  },
  {
    code: 'M3',
    name: 'Laser Fire (Spindle On - Constant Power)',
    category: 'laser',
    description: 'Turns on the laser beam right away with absolute continuous power proportionate to S parameter.',
    syntax: 'M3 S[power]',
    example: 'M3 S10',
    explanation: 'Fires the laser immediately regardless of travel speed. Safe for low-intensity focal testing (e.g. S1 to create a visible dot). DO NOT use for high-power patterns since it will overburn pauses, sharp corners, or slower accelerations.',
    compatibility: 'GRBL & Marlin'
  },
  {
    code: 'M4',
    name: 'Laser Fire (Dynamic Power Mode)',
    category: 'laser',
    description: 'Enables GRBL dynamic laser tuning. Modulates beam strength dynamically based on speed and acceleration.',
    syntax: 'M4 S[power]',
    example: 'M4 S150',
    explanation: 'Essential for superior engraving quality on GRBL hardware. As the machine slows down to execute pivot corners, the microcontroller auto-dims the laser proportionally to guarantee highly consistent line densities.',
    compatibility: 'GRBL Only'
  },
  {
    code: 'M5',
    name: 'Laser Cutter Off / Power Stop',
    category: 'laser',
    description: 'Immediately de-energizes the laser PWM output, shutting off the optical beam.',
    syntax: 'M5',
    example: 'M5',
    explanation: 'The standard safety deconstruction command. Added preceding all rapid travels (G0) and at the absolute termination of calibration scripts to safeguard hands and materials.',
    compatibility: 'GRBL & Marlin'
  },
  {
    code: 'M106',
    name: 'Air Assist / Auxiliary Fan Turn On',
    category: 'system',
    description: 'Powers manual electronics relays or active cooling/shielding accessories.',
    syntax: 'M106 S[pwm_value]',
    example: 'M106 S255',
    explanation: 'Controls on-board fan outputs. Intelligently utilized in laser setups to trigger air-assist pumps to purge carbon fumes, keeping the optical target smoke-free for maximum wood bite.',
    compatibility: 'Marlin Only'
  },
  {
    code: 'M107',
    name: 'Air Assist / Auxiliary Fan Cutoff',
    category: 'system',
    description: 'Deactivates the cooling fan power lines or high pressure solenoids.',
    syntax: 'M107',
    example: 'M107',
    explanation: 'Shuts off fume fans and accessory nozzles once engraving steps have wound down completely.',
    compatibility: 'Marlin Only'
  },
  {
    code: 'F',
    name: 'Feedrate Specifier (Movement Speed)',
    category: 'motion',
    description: 'Configures travel velocity of cutting/marking paths.',
    syntax: 'F[value_mm_per_min]',
    example: 'G1 X40.0 F1500',
    explanation: 'Feeds coordinates inside motion cycles. Configured in Millimeters per Minute (mm/min). To translate, divide F by 60 for mm/sec (e.g. F1200 equates to a marking rate of 20 mm/sec).',
    compatibility: 'GRBL & Marlin'
  },
  {
    code: 'S',
    name: 'Laser Power Scale Selector',
    category: 'laser',
    description: 'Dictates the voltage PWM duty cycles representing laser strength.',
    syntax: 'S[pwm_value]',
    example: 'G1 X20.0 S180',
    explanation: 'Typically ranges from S0 (0%) up to S255 (100% on 8-bit boards) or S1000 (standard in 32-bit GRBL controllers). Scaling is handled relative to the active Machine configurations.',
    compatibility: 'GRBL & Marlin'
  },
  {
    code: 'M112',
    name: 'Emergency Stop / Immediate Halt',
    category: 'system',
    description: 'Triggers an immediate emergency hardware shutoff, disabling all stepper motors, heaters, and laser outputs instantly.',
    syntax: 'M112',
    example: 'M112',
    explanation: 'The ultimate emergency safety overrides command. If a fire starts or the machine crashes into physical carriage bounds, M112 commands the firmware to freeze everything on the spot and disconnect communication, requiring physical power-cycling to recover.',
    compatibility: 'GRBL & Marlin'
  },
  {
    code: 'M114',
    name: 'Get Current Position Reading',
    category: 'coords',
    description: 'Queries the laser controller to return the instantaneous physical coordinate locations of all axes.',
    syntax: 'M114',
    example: 'M114',
    explanation: 'Instructs the board to return X, Y, Z coordinates to help stream software tools map real-time positional progress or verify calibration offsets.',
    compatibility: 'GRBL & Marlin'
  },
  {
    code: 'M115',
    name: 'Get Firmware Version & Capabilities',
    category: 'system',
    description: 'Requests the hardware board state, detailing active capabilities, buffer sizes, and manufacturer firmware descriptors.',
    syntax: 'M115',
    example: 'M115',
    explanation: 'Useful for laser hosting senders during initial handshake connections to automatically adapt parsing logic to GRBL or Marlin configurations.',
    compatibility: 'GRBL & Marlin'
  },
  {
    code: 'M2',
    name: 'Program Termination / End of Session',
    category: 'system',
    description: 'Signals to the controller that the active G-code program script has completed fully.',
    syntax: 'M2',
    example: 'M2',
    explanation: 'Historically used to finalize tapes. In compact laser operations, it reset controller defaults, shut down spindles/lasers, and prepared memory buffers for subsequent design cycles.',
    compatibility: 'GRBL & Marlin'
  },
  {
    code: 'M30',
    name: 'Program End and Rewind Buffer',
    category: 'system',
    description: 'Instructs the controller that the job file has ended, powers down active subsystems, and resets the parsing buffer line target back to the start index.',
    syntax: 'M30',
    example: 'M30',
    explanation: 'Appended at the absolute bottom of industrial cut layouts to close the stream file, turn off relays, and reset feed pointers for safety.',
    compatibility: 'GRBL & Marlin'
  },
  {
    code: 'M500',
    name: 'Save Configuration Settings to EEPROM',
    category: 'system',
    description: 'Saves active settings (like steps/mm, acceleration, max speeds, power limits) permanently to onboard EEPROM memory.',
    syntax: 'M500',
    example: 'M500',
    explanation: 'Ensures custom calibration values parsed on-the-fly survive power cycles. Vital when tuning machine motor steps or acceleration characteristics.',
    compatibility: 'GRBL & Marlin'
  },
  {
    code: 'M501',
    name: 'Restore Loaded EEPROM Settings',
    category: 'system',
    description: 'Reloads saved config parameters from EEPROM memory into active RAM runtime buffers.',
    syntax: 'M501',
    example: 'M501',
    explanation: 'Safely discards temporary configurations or diagnostic parameters back to stable, saved default profiles without requiring a hard hardware reboot.',
    compatibility: 'GRBL & Marlin'
  }
];

interface GCodeDictionaryProps {
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export default function GCodeDictionary({ onClose, theme = 'dark' }: GCodeDictionaryProps) {
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
            : 'bg-[#0E0E0E] border-white/10 text-[#E0E0E0]'
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
                  : 'bg-[#151515] border-white/10 focus:bg-black focus:ring-1 focus:ring-red-500 focus:border-red-550'
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
                      : 'bg-[#151515] border-white/5 text-emerald-400/95'
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
