import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../App';
import { ThemeProvider } from '../lib/themeContext';

// Mock Web Serial API
if (!('serial' in navigator)) {
  (navigator as unknown as Record<string, unknown>).serial = {
    requestPort: vi.fn(),
    getPorts: vi.fn(() => Promise.resolve([])),
  };
}

describe('App', () => {
  it('renders without crashing', () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>
    );
    expect(document.body).toBeInTheDocument();
  });
});
