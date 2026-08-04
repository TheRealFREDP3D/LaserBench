import { useCallback } from 'react';
import { MachineProfile } from '../../types';

interface SafeZPromptProps {
  activeMachine: MachineProfile | null;
  isPrinting: boolean;
  onSend: (cmd: string) => Promise<void>;
  onDismiss: () => void;
}

export function SafeZPrompt({
  activeMachine,
  isPrinting,
  onSend,
  onDismiss,
}: SafeZPromptProps) {
  const handleMoveToSafeZ = useCallback(async () => {
    onDismiss();
    if (activeMachine?.zSecure !== undefined) {
      await onSend('G90');
      await onSend(
        `G0 Z${activeMachine.zSecure} F${activeMachine.travelSpeed || 4000}`
      );
    }
  }, [activeMachine, onSend, onDismiss]);

  if (!activeMachine?.zSecure || isPrinting) return null;

  return (
    <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 bg-blue-950/60 border border-blue-800/50 rounded-lg text-xs">
      <div className="flex items-center gap-2 text-blue-300">
        <span>Move to safe Z position ({activeMachine.zSecure}mm)?</span>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <button
          onClick={handleMoveToSafeZ}
          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] rounded font-bold transition"
        >
          Move to Safe Z
        </button>
        <button
          onClick={onDismiss}
          className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-[10px] rounded font-bold transition"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
