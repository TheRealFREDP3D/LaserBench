import { create } from 'zustand';

export type WorkflowStep = 'machine' | 'material' | 'pattern' | 'preview' | 'operate';

interface UIState {
  currentStep: WorkflowStep;
  setStep: (step: WorkflowStep) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  activePanel: WorkflowStep | null;
  setActivePanel: (panel: WorkflowStep | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentStep: 'machine',
  setStep: (step) => set({ currentStep: step, activePanel: step }),
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  activePanel: 'machine',
  setActivePanel: (panel) => set({ activePanel: panel }),
}));
