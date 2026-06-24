import { create } from 'zustand';
import { MaterialProfile } from '../types';
import { getStoredMaterials, saveStoredMaterials } from '../lib/materialPresets';

interface MaterialState {
  materials: MaterialProfile[];
  activeMaterialId: string | null;
  setActiveMaterialId: (id: string) => void;
  updateMaterial: (updated: MaterialProfile) => void;
  addMaterial: (material: MaterialProfile) => void;
  deleteMaterial: (id: string) => void;
  getActiveMaterial: () => MaterialProfile | null;
}

export const useMaterialStore = create<MaterialState>((set, get) => ({
  materials: getStoredMaterials(),
  activeMaterialId: getStoredMaterials()[0]?.id || null,
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
  deleteMaterial: (id) => {
    set((state) => {
      const newMaterials = state.materials.filter((m) => m.id !== id);
      saveStoredMaterials(newMaterials);
      let nextId = state.activeMaterialId;
      if (nextId === id) {
        nextId = newMaterials[0]?.id || null;
      }
      return { materials: newMaterials, activeMaterialId: nextId };
    });
  },
  getActiveMaterial: () => {
    const { materials, activeMaterialId } = get();
    return materials.find((m) => m.id === activeMaterialId) || null;
  },
}));
