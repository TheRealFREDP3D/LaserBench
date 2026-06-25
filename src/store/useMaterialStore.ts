import { create } from 'zustand';
import { MaterialProfile } from '../types';
import { getStoredMaterials, saveStoredMaterials, INITIAL_MATERIALS } from '../lib/materialPresets';

interface MaterialState {
  materials: MaterialProfile[];
  activeMaterialId: string | null;
  setActiveMaterialId: (id: string) => void;
  updateMaterial: (updated: MaterialProfile) => void;
  addMaterial: (material: MaterialProfile) => void;
  deleteMaterial: (id: string) => void;
  getActiveMaterial: () => MaterialProfile | null;
}

const initialMaterials = getStoredMaterials();

export const useMaterialStore = create<MaterialState>((set, get) => ({
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
  getActiveMaterial: () => {
    const { materials, activeMaterialId } = get();
    return materials.find((m) => m.id === activeMaterialId) || materials[0] || null;
  },
}));
