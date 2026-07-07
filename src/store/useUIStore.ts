import { create } from 'zustand';

export type WorkflowStep = 'machine' | 'material' | 'pattern' | 'preview' | 'operate';

interface UIState {
  currentStep: WorkflowStep;
  setStep: (step: WorkflowStep) => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentStep: 'machine',
  setStep: (step) => set({ currentStep: step }),
}));
