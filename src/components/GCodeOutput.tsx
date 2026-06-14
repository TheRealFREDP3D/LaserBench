import React, { useState } from 'react';
import { Copy, FileDown, Check, FileCode, Clock, Compass } from 'lucide-react';
import { MachineProfile, MaterialProfile, PatternType } from '../types';

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
}

export default function GCodeOutput({
  gcode,
  patternType,
  machine,
  material,
  paths,
}: GCodeOutputProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(gcode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadGCode = () => {
    const blob = new Blob([gcode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const safeMatName = material.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    link.download = `laserbench_${patternType}_${safeMatName}.gcode`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Estimate total job parameters (Craftsmanship detail)
  const estimateMotionStats = () => {
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
  };

  const stats = estimateMotionStats();

  return (
    <div id="gcode-output-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm text-slate-100 flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <FileCode className="text-indigo-400 w-5 h-5" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-indigo-300">G-code Generator Output</h2>
        </div>
        <div className="flex gap-1.5">
          <button
            id="copy-gcode-btn"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
          <button
            id="download-gcode-btn"
            onClick={handleDownloadGCode}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-md"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Download .gcode</span>
          </button>
        </div>
      </div>

      {/* Production stats analysis info panel */}
      <div id="gcode-stats-banner" className="grid grid-cols-2 bg-slate-950/80 rounded-lg border border-slate-850 p-3 text-[11px] font-mono text-slate-300 divide-x divide-slate-850">
        <div className="space-y-1 pr-3">
          <div className="flex justify-between">
            <span className="text-slate-500">Engraving lines:</span>
            <span className="text-slate-200">{stats.pathsCount} paths</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Scribing feed:</span>
            <span className="text-lime-400">{stats.cutDistance} mm</span>
          </div>
        </div>
        <div className="space-y-1 pl-3">
          <div className="flex justify-between">
            <span className="text-slate-500">Travel distance:</span>
            <span className="text-slate-400">{stats.travelDistance} mm</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Estimated duration:</span>
            <span className="text-indigo-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-400/80 inline" />
              {stats.estimatedDuration}
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Code Viewer */}
      <div className="flex-1 min-h-[220px] relative">
        <textarea
          id="gcode-textarea"
          readOnly
          value={gcode}
          className="w-full h-full font-mono text-[11px] leading-relaxed p-4 bg-black border border-slate-950 rounded-lg text-emerald-400/90 focus:outline-none overflow-y-auto"
          style={{ resize: 'none' }}
        />
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-slate-950/90 border border-slate-900 rounded px-2 py-0.5 text-[9px] text-slate-500 font-mono select-none">
          <span>G-CODE G90/G21</span>
        </div>
      </div>

      <div className="text-[10px] text-slate-500 leading-relaxed italic bg-slate-950/20 border border-slate-900/40 p-2.5 rounded-lg flex gap-1.5 items-start">
        <Compass className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
        <span>
          Save this G-code file onto an SD card or stream it through gcode-senders (e.g. LaserGRBL, OctoPrint, LightBurn, candle). Run at your machine&apos;s default origin coords, wearing proper safety goggles.
        </span>
      </div>
    </div>
  );
}
