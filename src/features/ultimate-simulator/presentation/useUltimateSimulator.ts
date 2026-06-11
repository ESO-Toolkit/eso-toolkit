/**
 * Presenter hook for the Arcanist Ultimate Simulator.
 *
 * Holds the editable inputs (fight duration, Decisive weapon config, per-source
 * uptimes) and runs the Monte Carlo aggregate. Recomputes synchronously on
 * change — 10k runs over a handful of sources is sub-frame, so no worker is
 * needed in this first pass (a worker can be added later if source counts grow).
 */

import { useMemo, useState, useCallback } from 'react';

import { runMonteCarlo } from '../core/monteCarlo';
import {
  DEFAULT_FIGHT_DURATION_SECONDS,
  DEFAULT_MONTE_CARLO_RUNS,
  DEFAULT_BASE_SEED,
  RAID_CONTEXT_SOURCES,
  makeDecisiveConfig,
  DecisiveQuality,
} from '../shared/constants';
import type { MonteCarloResult, UltimateSource } from '../shared/types';

export interface UltimateSimulatorState {
  fightDurationSeconds: number;
  runs: number;
  decisiveEnabled: boolean;
  decisiveQuality: DecisiveQuality;
  decisiveTwoHanded: boolean;
  /** Per-source uptime overrides keyed by source id (0..1). */
  uptimeOverrides: Record<string, number>;
}

const INITIAL_STATE: UltimateSimulatorState = {
  fightDurationSeconds: DEFAULT_FIGHT_DURATION_SECONDS,
  runs: DEFAULT_MONTE_CARLO_RUNS,
  decisiveEnabled: true,
  decisiveQuality: 'legendary',
  decisiveTwoHanded: false,
  uptimeOverrides: {},
};

export interface UseUltimateSimulator {
  state: UltimateSimulatorState;
  sources: readonly UltimateSource[];
  result: MonteCarloResult;
  setFightDuration: (seconds: number) => void;
  setRuns: (runs: number) => void;
  setDecisiveEnabled: (enabled: boolean) => void;
  setDecisiveQuality: (quality: DecisiveQuality) => void;
  setDecisiveTwoHanded: (twoHanded: boolean) => void;
  setUptimeOverride: (sourceId: string, uptime: number) => void;
  reset: () => void;
}

export function useUltimateSimulator(): UseUltimateSimulator {
  const [state, setState] = useState<UltimateSimulatorState>(INITIAL_STATE);

  // Apply per-source uptime overrides on top of the preset.
  const sources = useMemo<readonly UltimateSource[]>(
    () =>
      RAID_CONTEXT_SOURCES.map((source) => {
        const override = state.uptimeOverrides[source.id];
        return override === undefined ? source : { ...source, uptime: override };
      }),
    [state.uptimeOverrides],
  );

  const result = useMemo<MonteCarloResult>(() => {
    const decisive = state.decisiveEnabled
      ? makeDecisiveConfig(state.decisiveQuality, state.decisiveTwoHanded)
      : null;
    return runMonteCarlo(
      {
        fightDurationSeconds: state.fightDurationSeconds,
        sources,
        decisive,
      },
      { runs: state.runs, baseSeed: DEFAULT_BASE_SEED },
    );
  }, [
    sources,
    state.fightDurationSeconds,
    state.runs,
    state.decisiveEnabled,
    state.decisiveQuality,
    state.decisiveTwoHanded,
  ]);

  const setFightDuration = useCallback(
    (seconds: number) =>
      setState((s) => ({ ...s, fightDurationSeconds: Math.max(1, Math.round(seconds)) })),
    [],
  );
  const setRuns = useCallback(
    (runs: number) =>
      setState((s) => ({ ...s, runs: Math.min(100000, Math.max(1, Math.round(runs))) })),
    [],
  );
  const setDecisiveEnabled = useCallback(
    (decisiveEnabled: boolean) => setState((s) => ({ ...s, decisiveEnabled })),
    [],
  );
  const setDecisiveQuality = useCallback(
    (decisiveQuality: DecisiveQuality) => setState((s) => ({ ...s, decisiveQuality })),
    [],
  );
  const setDecisiveTwoHanded = useCallback(
    (decisiveTwoHanded: boolean) => setState((s) => ({ ...s, decisiveTwoHanded })),
    [],
  );
  const setUptimeOverride = useCallback(
    (sourceId: string, uptime: number) =>
      setState((s) => ({
        ...s,
        uptimeOverrides: {
          ...s.uptimeOverrides,
          [sourceId]: Math.min(1, Math.max(0, uptime)),
        },
      })),
    [],
  );
  const reset = useCallback(() => setState(INITIAL_STATE), []);

  return {
    state,
    sources,
    result,
    setFightDuration,
    setRuns,
    setDecisiveEnabled,
    setDecisiveQuality,
    setDecisiveTwoHanded,
    setUptimeOverride,
    reset,
  };
}
