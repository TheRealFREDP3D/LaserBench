import React, { useMemo, useState, useCallback } from 'react';
import { MaterialProfile, PatternType } from '../types';
import { FileCode, Copy, Download, Pencil, Check, X } from 'lucide-react';
import { downloadGCode, makeGCodeFilename } from '../lib/downloadGCode';

interface GCodeOutputProps {
  gcode: string;
  patternType: PatternType;
  material: MaterialProfile;
  onEdit?: (editedGcode: string) => void;
}

const GCodeOutput: React.FC<GCodeOutputProps> = ({ gcode, patternType, material, onEdit }) => {
  const lines = useMemo(() => gcode.split('\n'), [gcode]);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(gcode);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(gcode);
    } catch {
      // clipboard unavailable
    }
  };

  const handleDownload = () => {
    const filename = makeGCodeFilename(patternType, material.name);
    downloadGCode(gcode, filename);
  };

  const handleStartEdit = useCallback(() => {
    setDraft(gcode);
    setIsEditing(true);
  }, [gcode]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setDraft(gcode);
  }, [gcode]);

  const handleConfirmEdit = useCallback(() => {
    setIsEditing(false);
    onEdit?.(draft);
  }, [draft, onEdit]);

  const handleReset = useCallback(() => {
    setDraft(gcode);
  }, [gcode]);

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="flex items-center justify-between p-3 border-b border-white/5 bg-[#0A0A0A]">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-indigo-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Lines: {isEditing ? draft.split('\n').length : lines.length}
          </span>
          {isEditing && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500/80">
              Editing
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <button
                onClick={handleReset}
                className="p-1.5 hover:bg-white/5 rounded text-neutral-500 hover:text-amber-400 transition-colors"
                title="Reset to original"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCancelEdit}
                className="p-1.5 hover:bg-white/5 rounded text-neutral-500 hover:text-white transition-colors"
                title="Cancel edit"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleConfirmEdit}
                className="p-1.5 hover:bg-white/5 rounded text-neutral-500 hover:text-green-400 transition-colors"
                title="Apply edits"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              {onEdit && (
                <button
                  onClick={handleStartEdit}
                  className="p-1.5 hover:bg-white/5 rounded text-neutral-500 hover:text-white transition-colors"
                  title="Edit G-Code"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
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
            </>
          )}
        </div>
      </div>
      {isEditing ? (
        <div className="flex-1 relative">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            className="w-full h-full bg-black p-4 font-mono text-[11px] leading-relaxed text-emerald-500/80 selection:bg-emerald-500/20 resize-none outline-none border-none"
          />
        </div>
      ) : (
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
      )}
    </div>
  );
};

export default GCodeOutput;
