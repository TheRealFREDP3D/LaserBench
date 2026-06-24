import { create } from 'zustand';
import { MachineProfile } from '../types';
import { getStoredMachines, saveStoredMachines, INITIAL_MACHINES } from '../lib/materialPresets';

interface MachineState {
  machines: MachineProfile[];
  activeMachineId: string | null;
  setActiveMachineId: (id: string) => void;
  updateMachine: (updated: MachineProfile) => void;
  addMachine: (machine: MachineProfile) => void;
  deleteMachine: (id: string) => void;
  getActiveMachine: () => MachineProfile | null;
}

const initialMachines = getStoredMachines();

export const useMachineStore = create<MachineState>((set, get) => ({
  machines: initialMachines,
  activeMachineId: initialMachines[0]?.id || null,
  setActiveMachineId: (id) => set({ activeMachineId: id }),
  updateMachine: (updated) => {
    set((state) => {
      const newMachines = state.machines.map((m) => (m.id === updated.id ? updated : m));
      saveStoredMachines(newMachines);
      return { machines: newMachines };
    });
  },
  addMachine: (machine) => {
    set((state) => {
      const newMachines = [...state.machines, machine];
      saveStoredMachines(newMachines);
      return { machines: newMachines };
    });
  },
  deleteMachine: (id) => {
    set((state) => {
      let newMachines = state.machines.filter((m) => m.id !== id);
      if (newMachines.length === 0) {
        newMachines = [...INITIAL_MACHINES];
      }
      saveStoredMachines(newMachines);
      let nextId = state.activeMachineId;
      if (nextId === id || !newMachines.find((m) => m.id === nextId)) {
        nextId = newMachines[0]?.id || null;
      }
      return { machines: newMachines, activeMachineId: nextId };
    });
  },
  getActiveMachine: () => {
    const { machines, activeMachineId } = get();
    return machines.find((m) => m.id === activeMachineId) || machines[0] || null;
  },
}));
