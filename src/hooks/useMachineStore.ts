import { useState, useEffect, useCallback } from 'react';
import type { MachineProfile } from '../types';
import { getStoredMachines, saveStoredMachines } from '../lib/materialPresets';

export function useMachineStore() {
  const [machines, setMachines] = useState<MachineProfile[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState('');

  useEffect(() => {
    const loaded = getStoredMachines();
    setMachines(loaded);
    if (loaded.length > 0) setSelectedMachineId(loaded[0].id);
  }, []);

  const handleUpdateMachine = useCallback((updated: MachineProfile) => {
    setMachines((prev) => {
      const list = prev.map((m) => (m.id === updated.id ? updated : m));
      saveStoredMachines(list);
      return list;
    });
  }, []);

  const handleCreateMachine = useCallback((created: MachineProfile) => {
    setMachines((prev) => {
      const list = [...prev, created];
      saveStoredMachines(list);
      return list;
    });
  }, []);

  const handleDeleteMachine = useCallback((id: string) => {
    setMachines((prev) => {
      const list = prev.filter((m) => m.id !== id);
      saveStoredMachines(list);
      if (selectedMachineId === id && list.length > 0) {
        setSelectedMachineId(list[0].id);
      }
      return list;
    });
  }, [selectedMachineId]);

  return {
    machines,
    selectedMachineId,
    setSelectedMachineId,
    handleUpdateMachine,
    handleCreateMachine,
    handleDeleteMachine,
  } as const;
}
