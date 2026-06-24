import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../App';

// Mock Web Serial API
if (!('serial' in navigator)) {
  (navigator as any).serial = {
    requestPort: vi.fn(),
    getPorts: vi.fn(() => Promise.resolve([])),
  };
}

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(document.body).toBeInTheDocument();
  });
});
