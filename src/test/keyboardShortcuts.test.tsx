import {describe, expect, it, afterEach} from 'vitest';
import {render, screen, fireEvent, cleanup} from '@testing-library/react';
import fc from 'fast-check';
import {useEffect, useState} from 'react';
import {CanvasView} from '@/src/components/layout/MainCanvas';

// New mapping (1-6 + L):
//   1 → sidebarTab=machine          2 → sidebarTab=material
//   3 → pattern (close flyout, mark pattern touched)
//   4 → canvasView=preview          5 → canvasView=code     6 → canvasView=operate
//   L → toggle Quick Log modal
const KEY_ACTION_MAP: Record<string, {state: string; value: string}> = {
  '1': {state: 'sidebarTab', value: 'machine'},
  '2': {state: 'sidebarTab', value: 'material'},
  '3': {state: 'lastTouched', value: 'pattern'},
  '4': {state: 'canvasView', value: 'preview'},
  '5': {state: 'canvasView', value: 'code'},
  '6': {state: 'canvasView', value: 'operate'},
};

function TabTestApp() {
  const [sidebarTab, setSidebarTab] = useState<'machine' | 'material'>('machine');
  const [canvasView, setCanvasView] = useState<CanvasView>('preview');
  const [lastTouched, setLastTouched] = useState<string>('machine');
  const [presetFlyoutOpen, setPresetFlyoutOpen] = useState<boolean>(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement).isContentEditable;
      if (isEditable) return;

      switch (e.key) {
        case '1': setSidebarTab('machine'); setLastTouched('machine'); break;
        case '2': setSidebarTab('material'); setLastTouched('material'); break;
        case '3': setPresetFlyoutOpen(false); setLastTouched('pattern'); break;
        case '4': setCanvasView('preview'); setLastTouched('preview'); break;
        case '5': setCanvasView('code'); setLastTouched('burn'); break;
        case '6': setCanvasView('operate'); setLastTouched('burn'); break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div>
      <span data-testid="sidebarTab">{sidebarTab}</span>
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
  it('pressing a number key activates the correct view/tab', () => {
    render(<TabTestApp />);

    fireEvent.keyDown(window, {key: '2'});
    expect(screen.getByTestId('sidebarTab')).toHaveTextContent('material');

    fireEvent.keyDown(window, {key: '6'});
    expect(screen.getByTestId('canvasView')).toHaveTextContent('operate');

    fireEvent.keyDown(window, {key: '4'});
    expect(screen.getByTestId('canvasView')).toHaveTextContent('preview');

    cleanup();
  });

  it('fc.property: for any key 1-6, the corresponding state is activated', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('1', '2', '3', '4', '5', '6'),
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
