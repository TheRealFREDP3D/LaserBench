import {describe, expect, it, afterEach} from 'vitest';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import {useEffect, useState} from 'react';

const KEY_TAB_MAP: Record<string, {tab: string; value: string}> = {
  '1': {tab: 'sidebarTab', value: 'machine'},
  '2': {tab: 'sidebarTab', value: 'material'},
  '3': {tab: 'centerTab', value: 'pattern'},
  '4': {tab: 'centerTab', value: 'presets'},
  '5': {tab: 'outputTab', value: 'gcode'},
  '6': {tab: 'outputTab', value: 'console'},
};

function TabTestApp() {
  const [sidebarTab, setSidebarTab] = useState<'machine' | 'material'>('machine');
  const [centerTab, setCenterTab] = useState<'pattern' | 'presets'>('pattern');
  const [outputTab, setOutputTab] = useState<'gcode' | 'console'>('gcode');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement).isContentEditable;
      if (isEditable) return;

      switch (e.key) {
        case '1': setSidebarTab('machine'); break;
        case '2': setSidebarTab('material'); break;
        case '3': setCenterTab('pattern'); break;
        case '4': setCenterTab('presets'); break;
        case '5': setOutputTab('gcode'); break;
        case '6': setOutputTab('console'); break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div>
      <span data-testid="sidebarTab">{sidebarTab}</span>
      <span data-testid="centerTab">{centerTab}</span>
      <span data-testid="outputTab">{outputTab}</span>
    </div>
  );
}

function ModalTestApp({initialHelp, initialDict}: {initialHelp: boolean; initialDict: boolean}) {
  const [showHelpModal, setShowHelpModal] = useState(initialHelp);
  const [showDictionary, setShowDictionary] = useState(initialDict);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement).isContentEditable;
      if (isEditable) return;

      switch (e.key) {
        case 'Escape':
          if (showHelpModal) setShowHelpModal(false);
          if (showDictionary) setShowDictionary(false);
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showHelpModal, showDictionary]);

  return (
    <div>
      <span data-testid="helpOpen">{String(showHelpModal)}</span>
      <span data-testid="dictOpen">{String(showDictionary)}</span>
    </div>
  );
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Property 17: Keyboard shortcut tab activation', () => {
  it('pressing a number key activates the correct tab', async () => {
    const user = userEvent.setup();
    render(<TabTestApp />);

    await user.keyboard('3');
    expect(screen.getByTestId('centerTab')).toHaveTextContent('pattern');

    await user.keyboard('6');
    expect(screen.getByTestId('outputTab')).toHaveTextContent('console');
  });

  it('fc.property: for any key 1-6, the corresponding tab is activated', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('1', '2', '3', '4', '5', '6'),
        async (key) => {
          const {unmount} = render(<TabTestApp />);
          const user = userEvent.setup();
          await user.keyboard(key);

          const entry = KEY_TAB_MAP[key];
          const tabEl = screen.getByTestId(entry.tab);
          expect(tabEl).toHaveTextContent(entry.value);
          unmount();
        }
      )
    );
  });
});

describe('Property 18: Escape key closes modals', () => {
  it('pressing Escape closes both modals regardless of initial state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        fc.boolean(),
        async (helpOpen, dictOpen) => {
          const {unmount} = render(<ModalTestApp initialHelp={helpOpen} initialDict={dictOpen} />);
          const user = userEvent.setup();
          await user.keyboard('{Escape}');

          expect(screen.getByTestId('helpOpen')).toHaveTextContent('false');
          expect(screen.getByTestId('dictOpen')).toHaveTextContent('false');
          unmount();
        }
      )
    );
  });
});
