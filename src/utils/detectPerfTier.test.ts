import { detectPerfTier, heuristicPerfTier, prefersReducedMotion } from './detectPerfTier';

// Controlled mock for @pmndrs/detect-gpu so tests don't fetch the real
// benchmark JSON or probe WebGL under jsdom. The package is ESM-only
// (exports: .mjs), which the CJS test resolver can't walk — `virtual:
// true` tells Jest to skip resolution and use the factory directly.

const getGPUTierMock = jest.fn() as jest.MockedFunction<any>;
jest.mock(
  '@pmndrs/detect-gpu',
  () => ({
    getGPUTier: (...args: unknown[]) => getGPUTierMock(...args),
  }),
  { virtual: true },
);

type NavSignals = {
  deviceMemory?: number;
  hardwareConcurrency?: number;
};

const setNavigatorSignals = ({ deviceMemory, hardwareConcurrency }: NavSignals): void => {
  // Delete-then-define lets us simulate browsers that omit the API
  // entirely (Firefox/Safari don't expose deviceMemory, and some
  // low-end / sandbox environments omit hardwareConcurrency too).

  delete (navigator as any).deviceMemory;
  if (deviceMemory !== undefined) {
    Object.defineProperty(navigator, 'deviceMemory', {
      value: deviceMemory,
      configurable: true,
    });
  }

  delete (navigator as any).hardwareConcurrency;
  if (hardwareConcurrency !== undefined) {
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      value: hardwareConcurrency,
      configurable: true,
    });
  }
};

const setPrefersReducedMotion = (reduce: boolean): void => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reduce : false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

beforeEach(() => {
  getGPUTierMock.mockReset();
  setPrefersReducedMotion(false);
  setNavigatorSignals({ deviceMemory: 8, hardwareConcurrency: 8 });
});

describe('prefersReducedMotion', () => {
  it('reflects the OS media query', () => {
    setPrefersReducedMotion(true);
    expect(prefersReducedMotion()).toBe(true);
    setPrefersReducedMotion(false);
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe('heuristicPerfTier', () => {
  it("returns 'low' when deviceMemory <= 2GB", () => {
    setNavigatorSignals({ deviceMemory: 2, hardwareConcurrency: 8 });
    expect(heuristicPerfTier()).toBe('low');
  });

  it("returns 'low' when hardwareConcurrency <= 2", () => {
    setNavigatorSignals({ deviceMemory: 8, hardwareConcurrency: 2 });
    expect(heuristicPerfTier()).toBe('low');
  });

  it("returns 'low' when deviceMemory<=4 AND cores<=4 together", () => {
    setNavigatorSignals({ deviceMemory: 4, hardwareConcurrency: 4 });
    expect(heuristicPerfTier()).toBe('low');
  });

  it("returns 'medium' (never 'high') even on a powerful reported device", () => {
    // Codex finding #2: heuristic must never hand out 'high'. That tier
    // is exclusive to a successful GPU benchmark.
    setNavigatorSignals({ deviceMemory: 32, hardwareConcurrency: 32 });
    expect(heuristicPerfTier()).toBe('medium');
  });

  it("returns 'medium' when deviceMemory is unreported (Firefox/Safari)", () => {
    // deviceMemory is Chrome-only. Missing signal must not produce 'high'.
    setNavigatorSignals({ deviceMemory: undefined, hardwareConcurrency: 16 });
    expect(heuristicPerfTier()).toBe('medium');
  });

  it("returns 'medium' when all hardware signals are missing", () => {
    setNavigatorSignals({ deviceMemory: undefined, hardwareConcurrency: undefined });
    expect(heuristicPerfTier()).toBe('medium');
  });

  it("does NOT force 'low' based on prefers-reduced-motion", () => {
    // Codex finding #1: reduced-motion is an accessibility signal, not
    // a hardware downgrade. A powerful desktop with OS reduced-motion
    // must stay on its hardware tier — motion quieting happens in
    // MotionConfig, not by demoting the whole app.
    setPrefersReducedMotion(true);
    setNavigatorSignals({ deviceMemory: 32, hardwareConcurrency: 16 });
    expect(heuristicPerfTier()).toBe('medium');
  });
});

describe('detectPerfTier', () => {
  it("returns 'high' when getGPUTier reports tier 3, even with unreported deviceMemory", async () => {
    getGPUTierMock.mockResolvedValueOnce({ tier: 3, isMobile: false, type: 'BENCHMARK' });
    setNavigatorSignals({ deviceMemory: undefined, hardwareConcurrency: 16 });
    await expect(detectPerfTier()).resolves.toBe('high');
  });

  it("returns 'medium' when getGPUTier throws and signals are missing (fails closed)", async () => {
    // Codex finding #2: benchmark failure must not optimistically return
    // 'high'. If we can't prove the GPU is capable, we don't assume.
    getGPUTierMock.mockRejectedValueOnce(new Error('webgl unavailable'));
    setNavigatorSignals({ deviceMemory: undefined, hardwareConcurrency: 16 });
    await expect(detectPerfTier()).resolves.toBe('medium');
  });

  it("returns 'low' when getGPUTier throws and heuristic signals low-end", async () => {
    getGPUTierMock.mockRejectedValueOnce(new Error('webgl unavailable'));
    setNavigatorSignals({ deviceMemory: 2, hardwareConcurrency: 4 });
    await expect(detectPerfTier()).resolves.toBe('low');
  });

  it("returns 'low' on benchmarked GPU tier 0", async () => {
    getGPUTierMock.mockResolvedValueOnce({ tier: 0, isMobile: false, type: 'BENCHMARK' });
    await expect(detectPerfTier()).resolves.toBe('low');
  });

  it("returns 'low' on benchmarked GPU tier 1", async () => {
    getGPUTierMock.mockResolvedValueOnce({ tier: 1, isMobile: true, type: 'BENCHMARK' });
    await expect(detectPerfTier()).resolves.toBe('low');
  });

  it("returns 'low' on benchmarked mobile GPU tier 2", async () => {
    // Boundary case: mobile tier-2 is the 2020 Moto G Power zone.
    getGPUTierMock.mockResolvedValueOnce({ tier: 2, isMobile: true, type: 'BENCHMARK' });
    await expect(detectPerfTier()).resolves.toBe('low');
  });

  it("returns 'medium' on benchmarked desktop GPU tier 2", async () => {
    getGPUTierMock.mockResolvedValueOnce({ tier: 2, isMobile: false, type: 'BENCHMARK' });
    await expect(detectPerfTier()).resolves.toBe('medium');
  });

  it("forces 'low' when heuristic is 'low' even if GPU benchmark says 'high'", async () => {
    // A thermally-throttled phone can have a benchmark that was good
    // when cool but has 2GB RAM and 2 cores — the weak-hardware floor
    // wins.
    getGPUTierMock.mockResolvedValueOnce({ tier: 3, isMobile: true, type: 'BENCHMARK' });
    setNavigatorSignals({ deviceMemory: 2, hardwareConcurrency: 2 });
    await expect(detectPerfTier()).resolves.toBe('low');
  });

  it("does NOT force 'low' on prefers-reduced-motion + powerful GPU (accessibility separated)", async () => {
    // Codex finding #1: user with reduced-motion + capable hardware
    // stays on their hardware tier. MotionConfig handles the motion
    // reduction separately.
    setPrefersReducedMotion(true);
    getGPUTierMock.mockResolvedValueOnce({ tier: 3, isMobile: false, type: 'BENCHMARK' });
    setNavigatorSignals({ deviceMemory: 32, hardwareConcurrency: 16 });
    await expect(detectPerfTier()).resolves.toBe('high');
  });

  it('does NOT trust a FALLBACK tier — a capable device defers to the heuristic', async () => {
    // detect-gpu resolves with type:'FALLBACK' (tier defaults to 1) when the
    // GPU isn't in its benchmark DB. Trusting that '1' was the root cause of
    // auto misclassifying capable desktops as 'low'. With healthy hardware
    // signals the heuristic's 'medium' floor should win instead.
    getGPUTierMock.mockResolvedValueOnce({ tier: 1, isMobile: false, type: 'FALLBACK' });
    setNavigatorSignals({ deviceMemory: 16, hardwareConcurrency: 12 });
    await expect(detectPerfTier()).resolves.toBe('medium');
  });

  it("returns 'low' on a FALLBACK tier only when hardware signals are genuinely weak", async () => {
    getGPUTierMock.mockResolvedValueOnce({ tier: 1, isMobile: false, type: 'FALLBACK' });
    setNavigatorSignals({ deviceMemory: 2, hardwareConcurrency: 2 });
    await expect(detectPerfTier()).resolves.toBe('low');
  });

  it("defers to the heuristic on WEBGL_UNSUPPORTED instead of assuming 'low'", async () => {
    getGPUTierMock.mockResolvedValueOnce({ tier: 0, isMobile: false, type: 'WEBGL_UNSUPPORTED' });
    setNavigatorSignals({ deviceMemory: 16, hardwareConcurrency: 12 });
    await expect(detectPerfTier()).resolves.toBe('medium');
  });

  it("returns 'low' on a BLOCKLISTED GPU regardless of reported tier or hardware", async () => {
    // Blocklisted drivers are flagged for known perf/stability problems, so
    // pin to 'low' even if the fallback tier or hardware signals look capable.
    getGPUTierMock.mockResolvedValueOnce({ tier: 2, isMobile: false, type: 'BLOCKLISTED' });
    setNavigatorSignals({ deviceMemory: 16, hardwareConcurrency: 12 });
    await expect(detectPerfTier()).resolves.toBe('low');
  });
});
