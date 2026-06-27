import React, { useState, useCallback, useEffect, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, Wifi } from 'lucide-react';
import { useTheme } from '../lib/themeContext';

const ONBOARDING_KEY = 'laserbench_onboarding_complete';

interface TourStep {
  target: string;
  title: string;
  message: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="machine-selector"]',
    title: '1. Machine Profile',
    message:
      'Start by selecting or creating a laser machine profile. Configure your bed size, firmware type, and laser settings here.',
    placement: 'right',
  },
  {
    target: '[data-tour="material-library"]',
    title: '2. Material Library',
    message:
      'Choose a material and set default engrave/cut power & speed. Calibration history is stored per material.',
    placement: 'right',
  },
  {
    target: '[data-tour="pattern-config"]',
    title: '3. Pattern Setup',
    message:
      'Select a calibration pattern (power ramp, speed ramp, matrix, etc.) and configure its parameters.',
    placement: 'right',
  },
  {
    target: '[data-tour="svg-canvas"]',
    title: '4. Preview',
    message:
      'The SVG canvas shows a live preview of your toolpath. Click anywhere to jog the laser head to that position.',
    placement: 'left',
  },
  {
    target: '[data-tour="connect-button"]',
    title: '5. Connect',
    message:
      'Connect to your laser via Web Serial. Select the correct baud rate in your machine profile first, then click here to pair.',
    placement: 'top',
  },
];

function getTargetRect(selector: string): DOMRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  return el.getBoundingClientRect();
}

function getPosition(
  rect: DOMRect,
  placement: string,
  tooltipW: number,
  tooltipH: number
): { top: number; left: number } {
  const gap = 12;
  switch (placement) {
    case 'right':
      return { top: rect.top + rect.height / 2 - tooltipH / 2, left: rect.right + gap };
    case 'left':
      return { top: rect.top + rect.height / 2 - tooltipH / 2, left: rect.left - tooltipW - gap };
    case 'bottom':
      return { top: rect.bottom + gap, left: rect.left + rect.width / 2 - tooltipW / 2 };
    case 'top':
    default:
      return { top: rect.top - tooltipH - gap, left: rect.left + rect.width / 2 - tooltipW / 2 };
  }
}

export function isOnboardingComplete(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

export function markOnboardingComplete(): void {
  localStorage.setItem(ONBOARDING_KEY, 'true');
}

const OnboardingTooltip: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [step, setStep] = useState(0);
  const [started, setStarted] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOnboardingComplete() || started) return;
    const timer = setTimeout(() => setStarted(true), 600);
    return () => clearTimeout(timer);
  }, [started]);

  const isComplete = started && step >= TOUR_STEPS.length;

  useEffect(() => {
    if (!started || isComplete) return;
    const current = TOUR_STEPS[step];
    if (!current) return;
    const update = () => {
      const rect = getTargetRect(current.target);
      if (!rect) {
        setPos({ top: window.innerHeight / 2 - 80, left: window.innerWidth / 2 - 160 });
        return;
      }
      const tooltipW = tooltipRef.current?.offsetWidth || 320;
      const tooltipH = tooltipRef.current?.offsetHeight || 140;
      setPos(getPosition(rect, current.placement || 'bottom', tooltipW, tooltipH));
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [started, isComplete, step]);

  const handleNext = useCallback(() => {
    setStep((s) => s + 1);
  }, []);

  const handlePrev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const handleDismiss = useCallback(() => {
    markOnboardingComplete();
    setStep(TOUR_STEPS.length);
  }, []);

  useEffect(() => {
    if (!started || isComplete) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleDismiss();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [started, isComplete, handleDismiss]);

  if (!started || isComplete) return null;

  const current = TOUR_STEPS[step];
  if (!current) return null;
  const progress = ((step + 1) / TOUR_STEPS.length) * 100;

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/40" onClick={handleDismiss} />
      <div
        ref={tooltipRef}
        className={`fixed z-[201] w-80 rounded-xl border shadow-2xl transition-all duration-200 ${
          isLight
            ? 'bg-white border-zinc-200 text-zinc-800'
            : 'bg-[#111] border-white/10 text-[#E0E0E0]'
        }`}
        style={{ top: pos.top, left: pos.left }}
      >
        <div className="h-1 rounded-t-xl overflow-hidden">
          <div
            className="h-full bg-red-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-red-500">
              {current.title}
            </h4>
            <button
              onClick={handleDismiss}
              className={`p-1 rounded transition-colors ${
                isLight ? 'hover:bg-zinc-100 text-zinc-400' : 'hover:bg-white/5 text-neutral-500'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] leading-relaxed mb-4">{current.message}</p>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-neutral-500">
              {step + 1} / {TOUR_STEPS.length}
            </span>
            <div className="flex items-center gap-1">
              {step > 0 && (
                <button
                  onClick={handlePrev}
                  className={`p-1.5 rounded transition-colors ${
                    isLight
                      ? 'hover:bg-zinc-100 text-zinc-500'
                      : 'hover:bg-white/5 text-neutral-500'
                  }`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              )}
              {step < TOUR_STEPS.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider rounded hover:bg-red-500 transition-colors"
                >
                  Next
                  <ChevronRight className="w-3 h-3" />
                </button>
              ) : (
                <button
                  onClick={handleDismiss}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider rounded hover:bg-red-500 transition-colors"
                >
                  <Wifi className="w-3 h-3" />
                  Get Started
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default React.memo(OnboardingTooltip);
