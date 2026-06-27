import { create } from 'zustand';
import { MaterialProfile } from '../types';
import { getStoredMaterials, saveStoredMaterials, INITIAL_MATERIALS } from '../lib/materialPresets';

interface MaterialState {
  materials: MaterialProfile[];
  activeMaterialId: string | null;
  setActiveMaterialId: (id: string) => void;
  updateMaterial: (updated: MaterialProfile) => void;
  addMaterial: (material: MaterialProfile) => void;
  addMaterials: (materials: MaterialProfile[]) => void;
  deleteMaterial: (id: string) => void;
}

const initialMaterials = getStoredMaterials();

export const useMaterialStore = create<MaterialState>((set) => ({
  materials: initialMaterials,
  activeMaterialId: initialMaterials[0]?.id || null,
  setActiveMaterialId: (id) => set({ activeMaterialId: id }),
  updateMaterial: (updated) => {
    set((state) => {
      const newMaterials = state.materials.map((m) => (m.id === updated.id ? updated : m));
      saveStoredMaterials(newMaterials);
      return { materials: newMaterials };
    });
  },
  addMaterial: (material) => {
    set((state) => {
      const newMaterials = [...state.materials, material];
      saveStoredMaterials(newMaterials);
      return { materials: newMaterials };
    });
  },
  addMaterials: (materials) => {
    set((state) => {
      const newMaterials = [...state.materials, ...materials];
      saveStoredMaterials(newMaterials);
      return { materials: newMaterials };
    });
  },
  deleteMaterial: (id) => {
    set((state) => {
      let newMaterials = state.materials.filter((m) => m.id !== id);
      if (newMaterials.length === 0) {
        newMaterials = [...INITIAL_MATERIALS];
      }
      saveStoredMaterials(newMaterials);
      let nextId = state.activeMaterialId;
      if (nextId === id || !newMaterials.find((m) => m.id === nextId)) {
        nextId = newMaterials[0]?.id || null;
      }
      return { materials: newMaterials, activeMaterialId: nextId };
    });
  },
}));

export function selectActiveMaterial(state: {
  materials: MaterialProfile[];
  activeMaterialId: string | null;
}): MaterialProfile | null {
  return state.materials.find((m) => m.id === state.activeMaterialId) || state.materials[0] || null;
}
