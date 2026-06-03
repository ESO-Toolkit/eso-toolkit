import { createTheme, ThemeProvider } from '@mui/material';
import { renderHook } from '@testing-library/react';
import React from 'react';

import { useIsMobileReplay } from './useIsMobileReplay';

type Listener = (event: MediaQueryListEvent) => void;

/**
 * Mock `window.matchMedia` so MUI's `useMediaQuery` resolves to known values. The hook fires TWO
 * queries — the `down('sm')` width query and a `(pointer: coarse) and (max-height: 600px)`
 * landscape-phone query — so the mock matches per-query via a predicate keyed on the query string.
 */
function mockMatchMedia(matches: (query: string) => boolean): void {
  const matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: matches(query),
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

const isCoarse = (q: string): boolean => q.includes('pointer: coarse');
const isWidth = (q: string): boolean => q.includes('width');

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

  it('returns true on a narrow (portrait phone) viewport', () => {
    // width query matches, pointer/height query does not — portrait phone.
    mockMatchMedia((q) => isWidth(q));
    const { result } = renderHook(() => useIsMobileReplay(), { wrapper });
    expect(result.current).toBe(true);
  });

  it('returns true on a LANDSCAPE phone (wide but coarse pointer + short height)', () => {
    // The regression guard: width query is FALSE (landscape is ≥667px wide) but the
    // coarse-pointer + max-height query is TRUE, so the hook still classifies it as mobile —
    // otherwise rotating mid-session would strand the user in the body-locked overlay.
    mockMatchMedia((q) => isCoarse(q));
    const { result } = renderHook(() => useIsMobileReplay(), { wrapper });
    expect(result.current).toBe(true);
  });

  it('returns false on a desktop viewport (wide, fine pointer)', () => {
    mockMatchMedia(() => false);
    const { result } = renderHook(() => useIsMobileReplay(), { wrapper });
    expect(result.current).toBe(false);
  });
});
