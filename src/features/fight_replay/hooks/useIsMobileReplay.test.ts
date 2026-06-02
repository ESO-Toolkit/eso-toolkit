import { createTheme, ThemeProvider } from '@mui/material';
import { renderHook } from '@testing-library/react';
import React from 'react';

import { useIsMobileReplay } from './useIsMobileReplay';

type Listener = (event: MediaQueryListEvent) => void;

/**
 * Mock `window.matchMedia` so MUI's `useMediaQuery` resolves to a known value. MUI builds the
 * query string from `theme.breakpoints.down('sm')` and passes it to `matchMedia`; we ignore the
 * exact string and force every query to the supplied `matches` so the test exercises the hook's
 * contract (true below the breakpoint, false above) without depending on jsdom's media engine.
 */
function mockMatchMedia(matches: boolean): void {
  const matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: (_type: string, _cb: Listener) => undefined,
    removeEventListener: (_type: string, _cb: Listener) => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: matchMedia,
  });
}

const theme = createTheme();
const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement =>
  React.createElement(ThemeProvider, { theme }, children);

describe('useIsMobileReplay', () => {
  const original = window.matchMedia;

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: original,
    });
  });

  it('returns true when the viewport is below the sm breakpoint (mobile)', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useIsMobileReplay(), { wrapper });
    expect(result.current).toBe(true);
  });

  it('returns false on a desktop-width viewport', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useIsMobileReplay(), { wrapper });
    expect(result.current).toBe(false);
  });
});
