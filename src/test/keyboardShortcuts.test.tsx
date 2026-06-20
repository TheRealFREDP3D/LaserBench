import {describe, expect, it, afterEach} from 'vitest';
import {render, screen, fireEvent, cleanup} from '@testing-library/react';
import fc from 'fast-check';
import {useEffect, useState} from 'react';
import {CanvasView} from '@/src/components/layout/MainCanvas';

// Updated mapping:
//   1 → scroll to machine section (lastTouched=machine)
//   2 → scroll to material section (lastTouched=material)
//   3 → pattern (close flyout, mark pattern touched)
//   5 → canvasView=code     6 → canvasView=operate
//   L → toggle Quick Log modal
const KEY_ACTION_MAP: Record<string, {state: string; value: string}> = {
  '3': {state: 'lastTouched', value: 'pattern'},
  '5': {state: 'canvasView', value: 'code'},
  '6': {state: 'canvasView', value: 'operate'},
};

function TabTestApp() {
  const [canvasView, setCanvasView] = useState<CanvasView>('code');
  const [lastTouched, setLastTouched] = useState<string>('machine');
  const [presetFlyoutOpen, setPresetFlyoutOpen] = useState<boolean>(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement).isContentEditable;
      if (isEditable) return;

      switch (e.key) {
        case '1': setLastTouched('machine'); break;
        case '2': setLastTouched('material'); break;
        case '3': setPresetFlyoutOpen(false); setLastTouched('pattern'); break;
        case '5': setCanvasView('code'); setLastTouched('burn'); break;
        case '6': setCanvasView('operate'); setLastTouched('burn'); break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div>
      <span data-testid="canvasView">{canvasView}</span>
      <span data-testid="lastTouched">{lastTouched}</span>
      <span data-testid="presetFlyoutOpen">{String(presetFlyoutOpen)}</span>
    </div>
  );
}

function ModalTestApp({initialDict, initialQuickLog}: {initialDict: boolean; initialQuickLog: boolean}) {
  const [showDictionary, setShowDictionary] = useState(initialDict);
  const [showQuickLogModal, setShowQuickLogModal] = useState(initialQuickLog);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement).isContentEditable;
      if (isEditable) return;

      switch (e.key) {
        case 'Escape':
          if (showDictionary) setShowDictionary(false);
          if (showQuickLogModal) setShowQuickLogModal(false);
          break;
        case 'l':
        case 'L':
          setShowQuickLogModal((v) => !v);
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showDictionary, showQuickLogModal]);

  return (
    <div>
      <span data-testid="dictOpen">{String(showDictionary)}</span>
      <span data-testid="quickLogOpen">{String(showQuickLogModal)}</span>
    </div>
  );
}

afterEach(() => {
  cleanup();
});

describe('Property 17: Keyboard shortcut activation (revised)', () => {
  it('pressing a number key activates the correct view', () => {
    render(<TabTestApp />);

    fireEvent.keyDown(window, {key: '6'});
    expect(screen.getByTestId('canvasView')).toHaveTextContent('operate');

    fireEvent.keyDown(window, {key: '5'});
    expect(screen.getByTestId('canvasView')).toHaveTextContent('code');

    cleanup();
  });

  it('fc.property: for keys 3, 5, 6 the corresponding state is activated', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('3', '5', '6'),
        (key) => {
          render(<TabTestApp />);
          fireEvent.keyDown(window, {key});

          const entry = KEY_ACTION_MAP[key];
          const stateEl = screen.getByTestId(entry.state);
          expect(stateEl).toHaveTextContent(entry.value);
          cleanup();
        }
      ),
      {timeout: 10_000}
    );
  });

  it('pressing 1 or 2 sets lastTouched to the correct section', () => {
    render(<TabTestApp />);

    fireEvent.keyDown(window, {key: '1'});
    expect(screen.getByTestId('lastTouched')).toHaveTextContent('machine');

    fireEvent.keyDown(window, {key: '2'});
    expect(screen.getByTestId('lastTouched')).toHaveTextContent('material');

    cleanup();
  });
});

describe('Property 18: Escape key closes modals; L toggles Quick Log', () => {
  it('fc.property: Escape closes both Dictionary and Quick Log modals regardless of initial state', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        (dictOpen, quickLogOpen) => {
          render(<ModalTestApp initialDict={dictOpen} initialQuickLog={quickLogOpen} />);
          fireEvent.keyDown(window, {key: 'Escape'});

          expect(screen.getByTestId('dictOpen')).toHaveTextContent('false');
          expect(screen.getByTestId('quickLogOpen')).toHaveTextContent('false');
          cleanup();
        }
      ),
      {timeout: 10_000}
    );
  });

  it('pressing L toggles the Quick Log modal', () => {
    render(<ModalTestApp initialDict={false} initialQuickLog={false} />);

    fireEvent.keyDown(window, {key: 'l'});
    expect(screen.getByTestId('quickLogOpen')).toHaveTextContent('true');

    fireEvent.keyDown(window, {key: 'l'});
    expect(screen.getByTestId('quickLogOpen')).toHaveTextContent('false');

    fireEvent.keyDown(window, {key: 'L'});
    expect(screen.getByTestId('quickLogOpen')).toHaveTextContent('true');

    cleanup();
  });
});
