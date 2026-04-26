import { getGPUTier } from '@pmndrs/detect-gpu';

import type { PerfTier } from '../store/ui/uiSlice';

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
    const gpuTier = await getGPUTier();
    // detect-gpu returns tier 0..3. Tier 0 = blocklisted or <15 fps.
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
    // Benchmark unavailable — WebGL context creation failed, blocklist,
    // or network error fetching the benchmark JSON. Fall back to the
    // heuristic, which caps at 'medium'. Never return 'high' from here:
    // if we can't prove the GPU is capable, we shouldn't assume it.
    return heuristic;
  }
};
