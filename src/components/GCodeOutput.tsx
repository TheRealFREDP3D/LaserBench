import { useState, useRef, useMemo, useCallback, memo } from 'react';
import { Copy, FileDown, Check, FileCode, Clock, Compass, Hash } from 'lucide-react';
import { MachineProfile, MaterialProfile, PatternType } from '../types';
import { downloadGCode, makeGCodeFilename } from '../lib/downloadGCode';

interface GCodeOutputProps {
  gcode: string;
  patternType: PatternType;
  machine: MachineProfile;
  material: MaterialProfile;
  paths: {
    points: [number, number][];
    power: number;
    speed: number;
    z: number;
    isLaserOn: boolean;
  }[];
  theme?: 'dark' | 'light';
  hoveredPathIndex?: number | null;
  onHoverPath?: (index: number | null) => void;
}

export default memo(function GCodeOutput({
  gcode,
  patternType,
  machine,
  material,
  paths,
  theme = 'dark',
  hoveredPathIndex,
  onHoverPath,
}: GCodeOutputProps) {
  const isLight = theme === 'light';
  const [copied, setCopied] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const gutterRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(gcode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleDownloadGCode = useCallback(() => {
    const filename = makeGCodeFilename(patternType, material.name);
    downloadGCode(gcode, filename);
  }, [gcode, patternType, material.name]);

  // Estimate total job parameters (Craftsmanship detail)
  const stats = useMemo(() => {
    let totalCutLength = 0;
    let totalTravelLength = 0;
    let estimatedTimeSec = 0;

    paths.forEach((p) => {
      let length = 0;
      for (let i = 1; i < p.points.length; i++) {
        const p1 = p.points[i - 1];
        const p2 = p.points[i];
        length += Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      }

      if (p.isLaserOn) {
        totalCutLength += length;
        // speed is in mm/min, so calculate seconds: length / (speed / 60)
        const speedRatio = p.speed > 0 ? p.speed / 60 : 1000/60;
        estimatedTimeSec += length / speedRatio;
      } else {
        totalTravelLength += length;
        const travelRatio = machine.travelSpeed > 0 ? machine.travelSpeed / 60 : 3000/60;
        estimatedTimeSec += length / travelRatio;
      }
    });

    // Add general overhead (e.g., laser start delay M106/M3, safe Z moves)
    estimatedTimeSec += paths.length * 0.5 + 4; // 0.5s overhead per continuous stroke

    const mins = Math.floor(estimatedTimeSec / 60);
    const secs = Math.round(estimatedTimeSec % 60);
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    return {
      cutDistance: Math.round(totalCutLength),
      travelDistance: Math.round(totalTravelLength),
      estimatedDuration: timeStr,
      pathsCount: paths.filter(p => p.isLaserOn).length,
    };
  }, [paths, machine.travelSpeed]);

  const gcodeLines = useMemo(() => gcode.split('\n'), [gcode]);

  return (
    <div id="gcode-output-card" className={`border rounded-xl p-5 shadow-sm flex flex-col h-full space-y-4 transition-all duration-200 ${
      isLight 
        ? 'bg-white border-zinc-200 text-zinc-800' 
        : 'bg-[#0F0F0F] border-white/10 text-[#E8E8E8]'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <FileCode className="text-indigo-500 w-5 h-5 shrink-0" />
          <h2 className={`text-sm font-semibold tracking-wide uppercase font-sans ${isLight ? 'text-zinc-800' : 'text-indigo-300'}`}>G-code Generator Output</h2>
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono select-none border whitespace-nowrap ${
            isLight 
              ? 'bg-zinc-100 border-zinc-250 text-zinc-500' 
              : 'bg-slate-950/90 border-slate-900 text-slate-500'
          }`}>
            G90 / G21
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:justify-end animate-fade-in">
          <button
            id="toggle-line-numbers-btn"
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border cursor-pointer shrink-0 whitespace-nowrap ${
              showLineNumbers
                ? isLight 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' 
                  : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-400 hover:bg-slate-700/80'
                : isLight 
                  ? 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200' 
                  : 'bg-slate-800 border-transparent hover:bg-slate-700 text-slate-300'
            }`}
            title="Toggle Line Numbers"
          >
            <Hash className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Line Numbers</span>
          </button>
          <button
            id="copy-gcode-btn"
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition border cursor-pointer shrink-0 whitespace-nowrap ${
              isLight 
                ? 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200' 
                : 'bg-slate-800 border-transparent hover:bg-slate-700 text-slate-300'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-emerald-500">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 shrink-0" />
                <span>Copy</span>
              </>
            )}
          </button>
          <button
            id="download-gcode-btn"
            onClick={handleDownloadGCode}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-md cursor-pointer shrink-0 whitespace-nowrap animate-fade-in"
          >
            <FileDown className="w-3.5 h-3.5 shrink-0" />
            <span>Download .gcode</span>
          </button>
        </div>
      </div>

      {/* Production stats analysis info panel */}
      <div id="gcode-stats-banner" className={`grid grid-cols-2 rounded-lg border p-3 text-[11px] font-mono divide-x transition-all duration-200 ${
        isLight 
          ? 'bg-zinc-50 border-zinc-200 text-zinc-700 divide-zinc-200' 
          : 'bg-slate-950/80 border-slate-850 text-slate-350 divide-slate-850'
      }`}>
        <div className="space-y-1 pr-3">
          <div className="flex justify-between">
            <span className={isLight ? 'text-zinc-400' : 'text-slate-500'}>Engraving lines:</span>
            <span className={isLight ? 'text-zinc-800 font-bold' : 'text-slate-200'}>{stats.pathsCount} paths</span>
          </div>
          <div className="flex justify-between">
            <span className={isLight ? 'text-zinc-400' : 'text-slate-500'}>Scribing feed:</span>
            <span className="text-lime-600 font-bold dark:text-lime-400">{stats.cutDistance} mm</span>
          </div>
        </div>
        <div className="space-y-1 pl-3">
          <div className="flex justify-between">
            <span className={isLight ? 'text-zinc-400' : 'text-slate-500'}>Travel distance:</span>
            <span className={isLight ? 'text-zinc-800 font-bold' : 'text-slate-400'}>{stats.travelDistance} mm</span>
          </div>
          <div className="flex justify-between">
            <span className={isLight ? 'text-zinc-400' : 'text-slate-500'}>Estimated duration:</span>
            <span className="text-indigo-600 font-bold dark:text-indigo-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-500 inline" />
              {stats.estimatedDuration}
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Code Viewer */}
      <div className={`flex-1 min-h-[220px] max-h-[400px] flex rounded-lg border overflow-hidden transition-all duration-200 ${
        isLight
          ? 'bg-zinc-50 border-zinc-200 text-zinc-800 focus-within:bg-white focus-within:border-indigo-400'
          : 'bg-black border-slate-950 text-emerald-400/90 focus-within:border-indigo-900/60'
      }`}>
        {showLineNumbers && (
          <div
            ref={gutterRef}
            className={`select-none text-right pr-2.5 pl-3 py-4 border-r shrink-0 font-mono text-[11px] leading-[18px] overflow-hidden transition-all duration-200 ${
              isLight
                ? 'bg-zinc-100/60 border-zinc-200 text-zinc-400'
                : 'bg-slate-950/60 border-slate-900 text-slate-600'
            }`}
          >
            {gcode.split('\n').map((_, i) => (
              <div key={i} className="h-[18px]">
                {i + 1}
              </div>
            ))}
          </div>
        )}
        <div
          ref={textareaRef}
          id="gcode-editor-viewport"
          onScroll={(e) => {
            if (gutterRef.current) {
              gutterRef.current.scrollTop = e.currentTarget.scrollTop;
            }
          }}
          className={`w-full h-full font-mono text-[11px] leading-[18px] overflow-auto transition-all duration-200 select-text ${
            showLineNumbers ? 'py-4 pr-4 pl-2.5' : 'p-4'
          }`}
          style={{ maxHeight: '400px' }}
        >
          {gcodeLines.map((line, idx) => {
            const linePathMatch = line.match(/; path:(\d+)/);
            const linePathIdx = linePathMatch ? parseInt(linePathMatch[1]) : null;
            const isLineHighlighted = hoveredPathIndex !== null && linePathIdx === hoveredPathIndex;

            // Segment command and comment for pretty colorings
            const commentIdx = line.indexOf(';');
            let commandPart = line;
            let commentPart = '';
            
            if (commentIdx !== -1) {
              commandPart = line.substring(0, commentIdx);
              commentPart = line.substring(commentIdx);
            }

            return (
              <div
                key={idx}
                onMouseEnter={() => {
                  if (linePathIdx !== null && onHoverPath) {
                    onHoverPath(linePathIdx);
                  }
                }}
                onMouseLeave={() => {
                  if (onHoverPath) {
                    onHoverPath(null);
                  }
                }}
                className={`h-[18px] px-1 flex items-center transition-colors duration-100 rounded-sm cursor-pointer whitespace-pre ${
                  isLineHighlighted
                    ? isLight
                      ? 'bg-amber-100/80 text-zinc-950 font-semibold border-l-2 border-amber-500 pl-0.5'
                      : 'bg-indigo-950/75 text-white font-semibold border-l-2 border-indigo-500 pl-0.5'
                    : isLight
                      ? 'hover:bg-zinc-200/50 text-zinc-800'
                      : 'hover:bg-zinc-900/60 text-emerald-400/90'
                }`}
              >
                <span className={isLight ? 'text-[#1e1b4b] font-medium' : 'text-emerald-400 font-medium'}>
                  {commandPart}
                </span>
                {commentPart && (
                  <span className={isLight ? 'text-zinc-400 font-normal' : 'text-slate-500 font-light'}>
                    {commentPart}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className={`text-[10px] leading-relaxed italic border p-2.5 rounded-lg flex gap-1.5 items-start transition-all duration-200 ${
        isLight 
          ? 'bg-zinc-50 border-zinc-200 text-zinc-500' 
          : 'bg-slate-950/20 border-slate-900/40 text-slate-500'
      }`}>
        <Compass className={`w-4 h-4 shrink-0 mt-0.5 ${isLight ? 'text-zinc-400' : 'text-slate-600'}`} />
        <span>
          Save this G-code file onto an SD card or stream it through gcode-senders (e.g. LaserGRBL, OctoPrint, LightBurn, candle). Run at your machine&apos;s default origin coords, wearing proper safety goggles.
        </span>
      </div>
    </div>
  );
});
