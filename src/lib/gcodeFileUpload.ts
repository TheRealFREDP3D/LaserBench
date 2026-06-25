import { GeneratedData } from '../types';
import { parseGCode } from './gcodeParser';

export function parseGCodeFile(fileContent: string, pwmMax: number = 1000): GeneratedData {
  const result = parseGCode(fileContent, pwmMax);
  const width = result.bounds.maxX - result.bounds.minX;
  const height = result.bounds.maxY - result.bounds.minY;

  return {
    gcode: fileContent,
    svgPaths: result.svgPaths,
    paths: result.paths,
    width: width || 100,
    height: height || 100,
    offsetX: -result.bounds.minX,
    offsetY: -result.bounds.minY,
  };
}

export function readGCodeFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
