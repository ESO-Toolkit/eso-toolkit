import type { PerfTier } from '../store/ui/uiSlice';

import { getEnvVar } from './envUtils';

// detect-gpu ships its benchmark DB inside the package but fetches it at RUNTIME,
// defaulting to `https://unpkg.com/@pmndrs/detect-gpu@<version>/dist/benchmarks`.
// Our app-shell CSP allows `connect-src 'self' …` and does NOT list unpkg.com, so
// every one of those fetches was blocked in production — detect-gpu swallowed the
// error and resolved `{ tier: 1, type: 'BENCHMARK_FETCH_FAILED' }`, which the
// `type !== 'BENCHMARK'` branch below turns into the heuristic tier. The heuristic
// caps at 'medium', so the 'high' tier was UNREACHABLE for every visitor.
//
// scripts/copy-detect-gpu-benchmarks.cjs copies the JSON out of node_modules into
// public/detect-gpu-benchmarks/ on `prebuild` and `dev`, so pointing at our own
// origin satisfies `connect-src 'self'` with no CSP change. BASE_URL keeps this
// correct under a non-root deploy (dev-preview subpaths); it always ends in '/'.
const benchmarksURL = `${getEnvVar('BASE_URL') ?? '/'}detect-gpu-benchmarks`;

// OS-level motion preference. Exposed as its own signal — motion handling
// belongs in MotionConfig (see PerfTierProvider), NOT in the perf tier.
// A user who opted into reduced motion on a powerful desktop should keep
// every hardware-driven feature; only the motion layer should quiet down.
export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Synchronous hardware heuristic. Returns 'low' | 'medium' only — the
// 'high' tier is reserved for a successful GPU benchmark, so this path
// fails closed on browsers where `deviceMemory` / `hardwareConcurrency`
// aren't informative. Safe to run before React mounts so first-time
// visitors on a low-end device get the low-tier CSS on their very first
// paint.
export const heuristicPerfTier = (): Exclude<PerfTier, 'high'> => {
  if (typeof navigator === 'undefined') return 'medium';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memory = (navigator as any).deviceMemory as number | undefined;
  const cores = navigator.hardwareConcurrency;
  if (memory != null && memory <= 2) return 'low';
  if (cores != null && cores <= 2) return 'low';
  if (memory != null && memory <= 4 && cores != null && cores <= 4) return 'low';
  // If a confident signal says "weak-ish", cap at medium. Otherwise the
  // device might be high-end but we can't prove it without the benchmark,
  // so we also return 'medium' as the neutral "don't know" default — the
  // async benchmark is what promotes to 'high'.
  return 'medium';
};

export const detectPerfTier = async (): Promise<PerfTier> => {
  const heuristic = heuristicPerfTier();

  try {
    // Lazy: @pmndrs/detect-gpu stays OUT of the entry chunk (it was ~15-30KB of parse cost on
    // every route). Only this async path pays for it, after first paint.
    const { getGPUTier } = await import('@pmndrs/detect-gpu');
    const gpuTier = await getGPUTier({ benchmarksURL });
    // detect-gpu RESOLVES (it does not throw) even when it can't actually
    // benchmark the GPU — the `type` field says how trustworthy `tier` is:
    //   BENCHMARK         — matched the GPU in the benchmark DB. Trust `tier`.
    //   FALLBACK          — GPU wasn't in the DB, so `tier` is a screen-size
    //                       guess that defaults to 1. Trusting it misclassifies
    //                       capable desktops as 'low' — the reason auto felt
    //                       inaccurate — so defer to the heuristic instead.
    //   BENCHMARK_FETCH_FAILED — the benchmark JSON couldn't be loaded at all
    //                       (network/CSP). `tier` is a hard-coded 1, so it is
    //                       meaningless; defer to the heuristic.
    //   WEBGL_UNSUPPORTED — nothing was measured (no WebGL context). Same as a
    //                       thrown benchmark: defer to the heuristic.
    //   BLOCKLISTED       — driver on the known-bad list; pin to 'low'.
    if (gpuTier.type === 'BLOCKLISTED') return 'low';
    if (gpuTier.type !== 'BENCHMARK') return heuristic;

    // detect-gpu returns tier 0..3. Tier 0 = <15 fps.
    // Mobile tier-3 and desktop tier-3 use the same internal classification,
    // so `isMobile` alone doesn't automatically demote — let the benchmark
    // speak. isMobile is worth a small demotion only when the benchmark is
    // on the boundary (tier 2).
    const t = gpuTier.tier;
    const isMobile = gpuTier.isMobile ?? false;

    let fromGpu: PerfTier;
    if (t <= 1) fromGpu = 'low';
    else if (t === 2) fromGpu = isMobile ? 'low' : 'medium';
    else fromGpu = 'high';

    // The heuristic is a downgrade-only signal — it can force a capable
    // GPU down to 'low' (thermally-throttled phone, weak CPU/RAM), but
    // it must NOT cap a successful 'high' benchmark at 'medium' just
    // because deviceMemory/hardwareConcurrency are unreported.
    return heuristic === 'low' ? 'low' : fromGpu;
  } catch {
    // Benchmark unavailable — WebGL context creation failed, or the
    // benchmark DB was out of date (detect-gpu throws only for those; a
    // failed fetch resolves as BENCHMARK_FETCH_FAILED). Fall back to the
    // heuristic, which caps at 'medium'. Never return 'high' from here:
    // if we can't prove the GPU is capable, we shouldn't assume it.
    return heuristic;
  }
};
