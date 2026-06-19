import { Cpu, Layers, Sliders, Eye, Flame } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type WorkflowStage = 'machine' | 'material' | 'pattern' | 'preview' | 'burn';

interface WorkflowStepperProps {
  activeStage: WorkflowStage;
  completedStages: WorkflowStage[];
  onStageClick: (stage: WorkflowStage) => void;
}

const STAGES: { key: WorkflowStage; label: string; icon: LucideIcon; shortcut: string }[] = [
  { key: 'machine',  label: 'Machine',  icon: Cpu,     shortcut: '1' },
  { key: 'material', label: 'Material', icon: Layers,  shortcut: '2' },
  { key: 'pattern',  label: 'Pattern',  icon: Sliders, shortcut: '3' },
  { key: 'preview',  label: 'Preview',  icon: Eye,     shortcut: '4' },
  { key: 'burn',     label: 'Burn & Log', icon: Flame, shortcut: '6' },
];

export default function WorkflowStepper({ activeStage, completedStages, onStageClick }: WorkflowStepperProps) {
  return (
    <div
      className="h-10 bg-[#0E0E0E] border-b border-white/8 flex items-center px-4 gap-1 shrink-0 select-none"
      role="navigation"
      aria-label="Workflow progress"
      data-testid="workflow-stepper"
    >
      {STAGES.map((stage, idx) => {
        const Icon = stage.icon;
        const isActive = activeStage === stage.key;
        const isComplete = completedStages.includes(stage.key);
        const isLast = idx === STAGES.length - 1;

        const circleClass = isActive
          ? 'bg-red-600 text-black border-red-500 shadow-[0_0_8px_rgba(220,38,38,0.5)]'
          : isComplete
            ? 'bg-red-950/60 text-red-300 border-red-900/50'
            : 'bg-[#151515] text-neutral-500 border-white/10';

        const labelClass = isActive
          ? 'text-white font-semibold'
          : isComplete
            ? 'text-red-300/80'
            : 'text-neutral-500';

        return (
          <div key={stage.key} className="flex items-center flex-1 min-w-0">
            <button
              type="button"
              onClick={() => onStageClick(stage.key)}
              className={`flex items-center gap-2 px-2 py-1 rounded transition-all duration-200 cursor-pointer outline-none hover:bg-white/5 ${isActive ? 'bg-white/5' : ''}`}
              aria-current={isActive ? 'step' : undefined}
              aria-label={`Workflow step ${idx + 1}: ${stage.label}${isComplete ? ' (completed)' : ''}${isActive ? ' (active)' : ''}`}
              data-testid={`workflow-step-${stage.key}`}
            >
              <span className={`flex items-center justify-center w-6 h-6 rounded-full border transition-all duration-200 font-mono text-[10px] font-bold ${circleClass}`}>
                {isComplete && !isActive ? '✓' : idx + 1}
              </span>
              <span className={`hidden md:flex items-center gap-1 text-[11px] uppercase tracking-wider transition-colors ${labelClass}`}>
                <Icon className="w-3 h-3" />
                {stage.label}
              </span>
              <kbd className={`hidden lg:inline-block text-[9px] font-mono px-1 py-0.5 rounded border ${isActive ? 'border-red-500/40 text-red-300 bg-red-950/30' : 'border-white/10 text-neutral-600 bg-[#0A0A0A]'}`}>
                {stage.shortcut}
              </kbd>
            </button>
            {!isLast && (
              <div className={`flex-1 h-px mx-1.5 transition-colors duration-300 ${isComplete ? 'bg-red-900/40' : 'bg-white/8'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
