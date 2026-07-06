import { Cpu, Layers, Sliders, Eye, Flame } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useUIStore, WorkflowStep } from '../../store/useUIStore';
import { useMachineStore, selectActiveMachine } from '../../store/useMachineStore';
import { useMaterialStore, selectActiveMaterial } from '../../store/useMaterialStore';

const STAGES: { key: WorkflowStep; label: string; icon: LucideIcon; shortcut: string }[] = [
  { key: 'machine', label: 'Machine', icon: Cpu, shortcut: '1' },
  { key: 'material', label: 'Material', icon: Layers, shortcut: '2' },
  { key: 'pattern', label: 'Pattern', icon: Sliders, shortcut: '3' },
  { key: 'preview', label: 'Preview', icon: Eye, shortcut: '4' },
  { key: 'operate', label: 'Operate', icon: Flame, shortcut: '5' },
];

export default function WorkflowStepper() {
  const { currentStep, setStep } = useUIStore();
  const activeMachine = useMachineStore(selectActiveMachine);
  const activeMaterial = useMaterialStore(selectActiveMaterial);

  const isStepComplete = (step: WorkflowStep) => {
    switch (step) {
      case 'machine':
        return activeMachine !== null;
      case 'material':
        return activeMaterial !== null;
      case 'pattern':
        return true;
      case 'preview':
        return true;
      default:
        return false;
    }
  };

  return (
    <div
      className="h-full w-full flex items-center px-2 md:px-4 gap-0.5 md:gap-1 select-none overflow-x-auto"
      role="navigation"
      aria-label="Workflow progress"
    >
      {STAGES.map((stage, idx) => {
        const Icon = stage.icon;
        const isActive = currentStep === stage.key;
        const isComplete = isStepComplete(stage.key);
        const isLast = idx === STAGES.length - 1;

        return (
          <div key={stage.key} className="flex items-center flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setStep(stage.key)}
              className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-md transition-all duration-200 cursor-pointer outline-none hover:bg-white/5 ${isActive ? 'bg-white/5 shadow-inner' : ''}`}
            >
              <div className="relative shrink-0">
                <div
                  className={`flex items-center justify-center w-6 h-6 md:w-7 md:h-7 rounded-full border transition-all duration-300 font-mono text-[10px] md:text-[11px] font-bold ${
                    isActive
                      ? 'bg-red-600 text-black border-red-500 shadow-[0_0_12px_rgba(220,38,38,0.4)]'
                      : 'bg-[#151515] text-neutral-500 border-white/10'
                  }`}
                >
                  {idx + 1}
                </div>
                {isComplete && (
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 md:w-2.5 md:h-2.5 bg-green-500 border border-[#0A0A0A] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                )}
              </div>
              <span
                className={`hidden sm:flex items-center gap-1.5 text-[10px] md:text-[11px] uppercase tracking-widest transition-colors ${
                  isActive ? 'text-white font-bold' : 'text-neutral-500'
                }`}
              >
                <Icon className={`w-3 h-3 md:w-3.5 md:h-3.5 ${isActive ? 'text-red-500' : ''}`} />
                {stage.label}
              </span>
            </button>
            {!isLast && (
              <div
                className={`flex-1 h-[1px] mx-1 md:mx-2 transition-colors duration-500 ${
                  isComplete ? 'bg-green-900/30' : 'bg-white/5'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
