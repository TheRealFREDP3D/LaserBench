import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DebouncedRange from '../components/DebouncedRange';

describe('DebouncedRange', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a range input', () => {
    render(<DebouncedRange min={0} max={100} value={50} onChange={vi.fn()} />);
    const input = screen.getByRole('slider');
    expect(input).toBeInTheDocument();
  });

  it('displays the initial value', () => {
    render(<DebouncedRange min={0} max={100} value={50} onChange={vi.fn()} />);
    const input = screen.getByRole('slider') as HTMLInputElement;
    expect(input.value).toBe('50');
  });

  it('calls onChange after debounce delay', () => {
    const onChange = vi.fn();
    render(<DebouncedRange min={0} max={100} value={50} onChange={onChange} debounceMs={200} />);
    const input = screen.getByRole('slider') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '75' } });
    expect(onChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    expect(onChange).toHaveBeenCalledWith(75);
  });

  it('cancels previous timer on rapid changes', () => {
    const onChange = vi.fn();
    render(<DebouncedRange min={0} max={100} value={50} onChange={onChange} debounceMs={200} />);
    const input = screen.getByRole('slider') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '60' } });
    fireEvent.change(input, { target: { value: '70' } });
    fireEvent.change(input, { target: { value: '80' } });

    vi.advanceTimersByTime(200);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(80);
  });

  it('uses default debounce of 200ms', () => {
    const onChange = vi.fn();
    render(<DebouncedRange min={0} max={100} value={50} onChange={onChange} />);
    const input = screen.getByRole('slider') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '60' } });
    vi.advanceTimersByTime(100);
    expect(onChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(onChange).toHaveBeenCalled();
  });

  it('clamps value to min boundary', () => {
    const onChange = vi.fn();
    render(<DebouncedRange min={10} max={100} value={50} onChange={onChange} />);
    const input = screen.getByRole('slider') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '5' } });
    vi.advanceTimersByTime(200);
    expect(onChange).toHaveBeenCalled();
  });
});
