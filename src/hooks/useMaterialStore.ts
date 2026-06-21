import { useState, useEffect, useCallback } from 'react';
import type { MaterialProfile } from '../types';
import { getStoredMaterials, saveStoredMaterials } from '../lib/materialPresets';

export function useMaterialStore() {
  const [materials, setMaterials] = useState<MaterialProfile[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');

  useEffect(() => {
    const loaded = getStoredMaterials();
    setMaterials(loaded);
    if (loaded.length > 0) setSelectedMaterialId(loaded[0].id);
  }, []);

  const handleUpdateMaterial = useCallback((updated: MaterialProfile) => {
    setMaterials((prev) => {
      const list = prev.map((m) => (m.id === updated.id ? updated : m));
      saveStoredMaterials(list);
      return list;
    });
  }, []);

  const handleCreateMaterial = useCallback((created: MaterialProfile) => {
    setMaterials((prev) => {
      const list = [...prev, created];
      saveStoredMaterials(list);
      return list;
    });
  }, []);

  const handleDeleteMaterial = useCallback((id: string) => {
    setMaterials((prev) => {
      const list = prev.filter((m) => m.id !== id);
      saveStoredMaterials(list);
      if (selectedMaterialId === id && list.length > 0) {
        setSelectedMaterialId(list[0].id);
      }
      return list;
    });
  }, [selectedMaterialId]);

  return {
    materials,
    selectedMaterialId,
    setSelectedMaterialId,
    handleUpdateMaterial,
    handleCreateMaterial,
    handleDeleteMaterial,
  } as const;
}
