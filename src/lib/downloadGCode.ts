import type { PatternType } from '../types';

/** Shared G-code download utility — deduplicates GCodeOutput and App handleDownloadGCode */
export function downloadGCode(gcode: string, filename: string) {
  const blob = new Blob([gcode], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function makeGCodeFilename(patternType: PatternType, materialName: string): string {
  const safeMatName = materialName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `laserbench_${patternType}_${safeMatName}.gcode`;
}
