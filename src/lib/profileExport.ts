import { MachineProfile, MaterialProfile } from '../types';
import {
  getStoredMachines,
  getStoredMaterials,
  isValidMachineProfile,
  isValidMaterialProfile,
} from './materialPresets';

export type ProfileType = 'machine' | 'material';

interface ExportEnvelope<T> {
  version: 1;
  type: ProfileType;
  exportedAt: string;
  profiles: T[];
}

function isExportEnvelope(obj: unknown): obj is ExportEnvelope<unknown> {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    o.version === 1 &&
    (o.type === 'machine' || o.type === 'material') &&
    typeof o.exportedAt === 'string' &&
    Array.isArray(o.profiles)
  );
}

function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateFilename(type: ProfileType): string {
  const date = new Date().toISOString().slice(0, 10);
  return `laserbench_${type}_profiles_${date}.json`;
}

export function exportAllProfiles(type: ProfileType): void {
  const profiles = type === 'machine' ? getStoredMachines() : getStoredMaterials();
  const envelope: ExportEnvelope<MachineProfile | MaterialProfile> = {
    version: 1,
    type,
    exportedAt: new Date().toISOString(),
    profiles,
  };
  downloadJson(generateFilename(type), envelope);
}

export function exportSelectedProfile(
  profile: MachineProfile | MaterialProfile,
  type: ProfileType
): void {
  const envelope: ExportEnvelope<MachineProfile | MaterialProfile> = {
    version: 1,
    type,
    exportedAt: new Date().toISOString(),
    profiles: [profile],
  };
  const safeName = profile.name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const date = new Date().toISOString().slice(0, 10);
  downloadJson(`laserbench_${type}_${safeName}_${date}.json`, envelope);
}

export interface ImportResult<T> {
  profiles: T[];
  duplicates: number;
  invalid: number;
}

export function parseImportFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result as string));
      } catch {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function importProfiles<T extends MachineProfile | MaterialProfile>(
  data: unknown,
  type: ProfileType,
  validate: (item: unknown) => item is T,
  existing: T[]
): ImportResult<T> {
  if (!isExportEnvelope(data)) {
    throw new Error('Unrecognized file format');
  }
  if (data.type !== type) {
    throw new Error(`Expected ${type} profiles, got ${data.type}`);
  }
  if (!Array.isArray(data.profiles)) {
    throw new Error('No profiles found in file');
  }

  const existingIds = new Set(existing.map((p) => p.id));
  const result: ImportResult<T> = { profiles: [], duplicates: 0, invalid: 0 };

  for (const item of data.profiles) {
    if (!validate(item)) {
      result.invalid++;
      continue;
    }
    if (existingIds.has(item.id)) {
      result.duplicates++;
      continue;
    }
    result.profiles.push(item);
    existingIds.add(item.id);
  }

  return result;
}

export function importMachineProfilesFromFile(
  file: File,
  existing: MachineProfile[]
): Promise<ImportResult<MachineProfile>> {
  return parseImportFile(file).then((data) =>
    importProfiles(data, 'machine', isValidMachineProfile, existing)
  );
}

export function importMaterialProfilesFromFile(
  file: File,
  existing: MaterialProfile[]
): Promise<ImportResult<MaterialProfile>> {
  return parseImportFile(file).then((data) =>
    importProfiles(data, 'material', isValidMaterialProfile, existing)
  );
}

export async function copyProfileToClipboard(
  profile: MachineProfile | MaterialProfile,
  type: ProfileType
): Promise<void> {
  if (!navigator.clipboard) {
    throw new Error('Clipboard API not available (requires HTTPS)');
  }
  const envelope: ExportEnvelope<MachineProfile | MaterialProfile> = {
    version: 1,
    type,
    exportedAt: new Date().toISOString(),
    profiles: [profile],
  };
  await navigator.clipboard.writeText(JSON.stringify(envelope, null, 2));
}

export function importProfilesFromClipboard<T extends MachineProfile | MaterialProfile>(
  type: ProfileType,
  validate: (item: unknown) => item is T,
  existing: T[]
): Promise<ImportResult<T>> {
  if (!navigator.clipboard) {
    return Promise.reject(new Error('Clipboard API not available (requires HTTPS)'));
  }
  return navigator.clipboard.readText().then((text) => {
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error('Clipboard does not contain valid JSON');
      }
      throw e;
    }
    return importProfiles(data, type, validate, existing);
  });
}
