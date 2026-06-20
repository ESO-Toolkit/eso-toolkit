import { renderHook } from '@testing-library/react';

import { useViewTransitionNavigate } from './useViewTransitionNavigate';

// The hook only needs react-router's useNavigate at runtime; mock it so the
// hook can be exercised without a Router and we can assert the underlying call.
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

interface DocWithVT {
  startViewTransition?: unknown;
}

const makeHandle = (): {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
} => ({
  finished: Promise.resolve(),
  ready: Promise.resolve(),
  updateCallbackDone: Promise.resolve(),
});

// Let any `handle.finished.then(cleanup)` microtasks run so the module-level
// `vtActive` guard resets between tests.
const flushMicrotasks = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

const reducedMotionMatchMedia = (reduce: boolean): typeof window.matchMedia =>
  jest.fn().mockImplementation((query: string) => ({
    matches: reduce && /reduce/.test(query),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;

describe('useViewTransitionNavigate', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    mockNavigate.mockClear();
    delete (document as unknown as DocWithVT).startViewTransition;
    // matchMedia present but never reduced, unless a test overrides it.
    window.matchMedia = reducedMotionMatchMedia(false);
  });

  afterEach(async () => {
    await flushMicrotasks();
    delete (document as unknown as DocWithVT).startViewTransition;
    window.matchMedia = originalMatchMedia;
  });

  it('passes a numeric delta straight through to navigate (history back/forward)', () => {
    const { result } = renderHook(() => useViewTransitionNavigate());
    result.current(-1);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('navigates plainly and strips vt-only options when the API is unavailable', () => {
    const { result } = renderHook(() => useViewTransitionNavigate());
    result.current('/dest', { vtType: 'forward', replace: true });
    // vtType is stripped; react-router navigate options (replace) survive.
    expect(mockNavigate).toHaveBeenCalledWith('/dest', { replace: true });
  });

  it('skips the View Transition entirely under prefers-reduced-motion', () => {
    const svt = jest.fn().mockReturnValue(makeHandle());
    (document as unknown as DocWithVT).startViewTransition = svt;
    window.matchMedia = reducedMotionMatchMedia(true);

    const { result } = renderHook(() => useViewTransitionNavigate());
    result.current('/dest', { vtType: 'forward' });

    expect(svt).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/dest', {});
  });

  it('starts a View Transition tagged forward+hero for a morph navigation', () => {
    const svt = jest.fn().mockReturnValue(makeHandle());
    (document as unknown as DocWithVT).startViewTransition = svt;

    const source = document.createElement('div');
    const { result } = renderHook(() => useViewTransitionNavigate());
    result.current('/dest', {
      vtType: 'forward',
      morph: { ref: { current: source }, name: 'build-hero' },
    });

    expect(svt).toHaveBeenCalledTimes(1);
    const arg = svt.mock.calls[0][0] as { types: string[]; update: () => Promise<void> };
    expect(arg.types).toEqual(['forward', 'hero']);
    expect(typeof arg.update).toBe('function');
  });

  it('omits the hero type for a non-morph View Transition', () => {
    const svt = jest.fn().mockReturnValue(makeHandle());
    (document as unknown as DocWithVT).startViewTransition = svt;

    const { result } = renderHook(() => useViewTransitionNavigate());
    result.current('/dest', { vtType: 'up' });

    const arg = svt.mock.calls[0][0] as { types: string[] };
    expect(arg.types).toEqual(['up']);
  });
});
