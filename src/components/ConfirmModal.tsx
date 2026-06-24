import { memo } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useTheme } from '../lib/themeContext';

interface ConfirmModalProps {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default memo(function ConfirmModal({
  open,
  message,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const trapRef = useFocusTrap<HTMLDivElement>(open);

  if (!open) return null;

  return (
    <div
      ref={trapRef}
      role="alertdialog"
      aria-modal="true"
      aria-label="Confirm action"
      className="fixed inset-0 bg-black/85 backdrop-blur-xs z-[110] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className={`bg-[#0F0F0F] border border-white/10 rounded-lg p-5 max-w-sm w-full shadow-2xl relative space-y-4 ${isLight ? 'bg-white border-zinc-200 text-zinc-800' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          aria-label="Close"
          className={`absolute top-3 right-3 transition cursor-pointer ${isLight ? 'text-zinc-400 hover:text-zinc-800' : 'text-neutral-500 hover:text-white'}`}
        >
          <X className="w-4 h-4" />
        </button>

        <p
          className={`text-sm leading-relaxed pr-6 ${isLight ? 'text-zinc-700' : 'text-[#E0E0E0]'}`}
        >
          {message}
        </p>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className={`px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${isLight ? 'text-zinc-600 hover:text-black' : 'text-[#888] hover:text-white'}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-black rounded text-xs font-bold transition cursor-pointer"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
});
