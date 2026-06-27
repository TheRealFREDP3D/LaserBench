import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

function ShortcutTestComponent(props: Parameters<typeof useKeyboardShortcuts>[0]) {
  useKeyboardShortcuts(props);
  return (
    <div>
      <input type="text" data-testid="text-input" placeholder="Type here" />
      <textarea data-testid="textarea-input" placeholder="Type here" />
      <select data-testid="select-input">
        <option>A</option>
      </select>
    </div>
  );
}

describe('useKeyboardShortcuts', () => {
  const makeHandlers = () => ({
    onEStop: vi.fn(),
    onFire: vi.fn(),
    onStopFire: vi.fn(),
    onHome: vi.fn(),
    onJogUp: vi.fn(),
    onJogDown: vi.fn(),
    onJogLeft: vi.fn(),
    onJogRight: vi.fn(),
    onConnect: vi.fn(),
    onAbortPrint: vi.fn(),
  });

  beforeEach(() => {
    document.querySelectorAll('input, textarea, select').forEach((el) => {
      if (el instanceof HTMLElement) el.blur();
    });
  });

  it('calls onHome when h is pressed', () => {
    const h = makeHandlers();
    render(<ShortcutTestComponent {...h} />);
    fireEvent.keyDown(document, { key: 'h' });
    expect(h.onHome).toHaveBeenCalledTimes(1);
  });

  it('calls onFire on f key-down and onStopFire on f key-up', () => {
    const h = makeHandlers();
    render(<ShortcutTestComponent {...h} />);
    fireEvent.keyDown(document, { key: 'f' });
    expect(h.onFire).toHaveBeenCalledTimes(1);
    expect(h.onStopFire).not.toHaveBeenCalled();
    fireEvent.keyUp(document, { key: 'f' });
    expect(h.onStopFire).toHaveBeenCalledTimes(1);
  });

  it('calls onJogUp for ArrowUp', () => {
    const h = makeHandlers();
    render(<ShortcutTestComponent {...h} />);
    fireEvent.keyDown(document, { key: 'ArrowUp' });
    expect(h.onJogUp).toHaveBeenCalledTimes(1);
  });

  it('calls onJogDown for ArrowDown', () => {
    const h = makeHandlers();
    render(<ShortcutTestComponent {...h} />);
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    expect(h.onJogDown).toHaveBeenCalledTimes(1);
  });

  it('calls onJogLeft for ArrowLeft', () => {
    const h = makeHandlers();
    render(<ShortcutTestComponent {...h} />);
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(h.onJogLeft).toHaveBeenCalledTimes(1);
  });

  it('calls onJogRight for ArrowRight', () => {
    const h = makeHandlers();
    render(<ShortcutTestComponent {...h} />);
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(h.onJogRight).toHaveBeenCalledTimes(1);
  });

  it('calls onConnect when c is pressed', () => {
    const h = makeHandlers();
    render(<ShortcutTestComponent {...h} />);
    fireEvent.keyDown(document, { key: 'c' });
    expect(h.onConnect).toHaveBeenCalledTimes(1);
  });

  it('calls onEStop on Ctrl+Escape', () => {
    const h = makeHandlers();
    render(<ShortcutTestComponent {...h} />);
    fireEvent.keyDown(document, { key: 'Escape', ctrlKey: true });
    expect(h.onEStop).toHaveBeenCalledTimes(1);
    expect(h.onAbortPrint).not.toHaveBeenCalled();
  });

  it('calls onAbortPrint on Escape without Ctrl', () => {
    const h = makeHandlers();
    render(<ShortcutTestComponent {...h} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(h.onAbortPrint).toHaveBeenCalledTimes(1);
    expect(h.onEStop).not.toHaveBeenCalled();
  });

  it('ignores shortcuts when focus is in an input', () => {
    const h = makeHandlers();
    const { getByTestId } = render(<ShortcutTestComponent {...h} />);
    const input = getByTestId('text-input');
    input.focus();
    fireEvent.keyDown(input, { key: 'h' });
    expect(h.onHome).not.toHaveBeenCalled();
  });

  it('ignores shortcuts when focus is in a textarea', () => {
    const h = makeHandlers();
    const { getByTestId } = render(<ShortcutTestComponent {...h} />);
    const ta = getByTestId('textarea-input');
    ta.focus();
    fireEvent.keyDown(ta, { key: 'f' });
    expect(h.onFire).not.toHaveBeenCalled();
  });

  it('ignores shortcuts when focus is in a select', () => {
    const h = makeHandlers();
    const { getByTestId } = render(<ShortcutTestComponent {...h} />);
    const sel = getByTestId('select-input');
    sel.focus();
    fireEvent.keyDown(sel, { key: 'c' });
    expect(h.onConnect).not.toHaveBeenCalled();
  });

  it('ignores key f with Ctrl modifier', () => {
    const h = makeHandlers();
    render(<ShortcutTestComponent {...h} />);
    fireEvent.keyDown(document, { key: 'f', ctrlKey: true });
    expect(h.onFire).not.toHaveBeenCalled();
  });

  it('ignores key h with Alt modifier', () => {
    const h = makeHandlers();
    render(<ShortcutTestComponent {...h} />);
    fireEvent.keyDown(document, { key: 'h', altKey: true });
    expect(h.onHome).not.toHaveBeenCalled();
  });

  it('does not call onStopFire if f was never pressed down', () => {
    const h = makeHandlers();
    render(<ShortcutTestComponent {...h} />);
    fireEvent.keyUp(document, { key: 'f' });
    expect(h.onStopFire).not.toHaveBeenCalled();
  });
});
