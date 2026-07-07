import type { PatternType } from '../types';

/**
 * Shared download trigger — creates a temporary anchor, clicks it, and revokes
 * the object URL after a short delay. Used by both gcode and JSON downloads.
 */
export function triggerDownload(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/** Shared G-code download utility */
export function downloadGCode(gcode: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([gcode], { type: 'text/plain;charset=utf-8' }));
  triggerDownload(url, filename);
}

export function makeGCodeFilename(patternType: PatternType, materialName: string): string {
  const safeMatName = materialName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `laserbench_${patternType}_${safeMatName}.gcode`;
}
