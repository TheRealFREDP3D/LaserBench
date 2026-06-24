import React, { useMemo } from 'react';
import { MachineProfile, MaterialProfile } from '../types';
import { FileCode, Copy, Download } from 'lucide-react';
import { downloadGCode, makeGCodeFilename } from '../lib/downloadGCode';
import { downloadGCode, makeGCodeFilename } from '../lib/downloadGCode';

interface GCodeOutputProps {
  gcode: string;
  patternType: string;
  machine: MachineProfile;
  material: MaterialProfile;
  paths: PathSegment[];
}

const GCodeOutput: React.FC<GCodeOutputProps> = ({ gcode, patternType, material }) => {
  const lines = useMemo(() => gcode.split('\n'), [gcode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(gcode);
  };

  const handleDownload = () => {
    const filename = makeGCodeFilename(patternType, material.name);
    downloadGCode(gcode, filename);
  };

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="flex items-center justify-between p-3 border-b border-white/5 bg-[#0A0A0A]">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-indigo-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Lines: {lines.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-white/5 rounded text-neutral-500 hover:text-white transition-colors"
            title="Copy to Clipboard"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 hover:bg-white/5 rounded text-neutral-500 hover:text-white transition-colors"
            title="Download File"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto font-mono text-[11px] p-4 text-emerald-500/80 selection:bg-emerald-500/20">
        {lines.map((line, i) => (
          <div key={i} className="flex gap-4 hover:bg-white/5 transition-colors group">
            <span className="w-8 text-neutral-800 text-right shrink-0 select-none group-hover:text-neutral-600">
              {i + 1}
            </span>
            <span>{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GCodeOutput;
