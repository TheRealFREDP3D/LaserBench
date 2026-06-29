import { create } from 'zustand';
import { MachineProfile } from '../types';
import { getStoredMachines, saveStoredMachines, INITIAL_MACHINES } from '../lib/materialPresets';

interface MachineState {
  machines: MachineProfile[];
  activeMachineId: string | null;
  setActiveMachineId: (id: string) => void;
  updateMachine: (updated: MachineProfile) => void;
  addMachine: (machine: MachineProfile) => void;
  addMachines: (machines: MachineProfile[]) => void;
  deleteMachine: (id: string) => void;
}

const initialMachines = getStoredMachines();

export const useMachineStore = create<MachineState>((set) => ({
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
  addMachines: (machines) => {
    set((state) => {
      const newMachines = [...state.machines, ...machines];
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
}));

export function selectActiveMachine(state: {
  machines: MachineProfile[];
  activeMachineId: string | null;
}): MachineProfile | null {
  return state.machines.find((m) => m.id === state.activeMachineId) || state.machines[0] || null;
}
