/**
 * Presenter hook for the all-class Ultimate Calculator.
 *
 * Holds the editable selection (context / class / role, per-source toggles &
 * uptimes, Decisive weapon, fight length, chosen ultimate & extra cost
 * reduction) and derives every result with the closed-form engine — exact and
 * instant, recomputed synchronously on each change.
 *
 * The optional Monte Carlo distribution is computed lazily (only when the user
 * opens the distribution view) so the headline path stays cheap.
 */

import { useCallback, useMemo, useState } from 'react';

import {
  availableReductions,
  availableSources,
  compileReductions,
  compileSources,
  isEntryEnabled,
  type CatalogSelection,
} from '../application/compileCatalog';
import { applyCostReduction, type CostReduction } from '../core/cost';
import { expectedValue, timeToUltimate } from '../core/expectedValue';
import { runMonteCarlo } from '../core/monteCarlo';
import {
  DEFAULT_DECISIVE_QUALITY,
  DEFAULT_FIGHT_DURATION_SECONDS,
  makeDecisiveConfig,
  type DecisiveQuality,
} from '../shared/constants';
import {
  COST_REDUCTION_CATALOG,
  MAX_ULTIMATE_POOL,
  SANITY_MAX_ULT_PER_SECOND,
  ULTIMATE_ABILITIES,
  ULTIMATE_SOURCE_CATALOG,
} from '../shared/constants/catalog';
import type { ExpectedValueResult, MonteCarloResult, TimeToUltimateResult } from '../shared/types';
import type {
  CatalogCostReduction,
  CatalogSource,
  CombatContext,
  CombatRole,
  EsoClass,
} from '../shared/types/catalog';

const DEFAULT_MC_RUNS = 20000;
const MC_BASE_SEED = 1;

export interface UltimateCalculatorState {
  context: CombatContext;
  esoClass: EsoClass;
  role: CombatRole;
  fightDurationSeconds: number;
  decisiveEnabled: boolean;
  decisiveQuality: DecisiveQuality;
  decisiveTwoHanded: boolean;
  enabledOverrides: Record<string, boolean>;
  uptimeOverrides: Record<string, number>;
  /** Chosen ultimate ability id (drives time-to-ult), or a custom cost. */
  ultimateAbilityId: string;
  customUltimateCost: number | null;
  startingUltimate: number;
}

const INITIAL_STATE: UltimateCalculatorState = {
  context: 'groupPve',
  esoClass: 'arcanist',
  role: 'dps',
  fightDurationSeconds: DEFAULT_FIGHT_DURATION_SECONDS,
  decisiveEnabled: true,
  decisiveQuality: DEFAULT_DECISIVE_QUALITY,
  decisiveTwoHanded: false,
  enabledOverrides: {},
  uptimeOverrides: {},
  ultimateAbilityId: 'generic-250',
  customUltimateCost: null,
  startingUltimate: 0,
};

export interface UltimateCalculatorResult {
  state: UltimateCalculatorState;
  selection: CatalogSelection;
  /** Sources available for the current selection (for the toggle list). */
  availableSourceEntries: readonly CatalogSource[];
  /** Cost reductions available for the current selection. */
  availableReductionEntries: readonly CatalogCostReduction[];
  /** Resolved enabled state per entry id (default merged with override). */
  isEnabled: (id: string, defaultEnabled: boolean) => boolean;
  /** Closed-form expected generation. */
  expected: ExpectedValueResult;
  /** Effective ultimate cost after reductions. */
  effectiveCost: number;
  baseCost: number;
  appliedReductions: readonly CostReduction[];
  /** Time-to-ultimate output. */
  timeToUlt: TimeToUltimateResult;
  /** Whether the generation rate looks unrealistically high. */
  exceedsSanity: boolean;
  sanityMax: number;
  maxPool: number;
  /** Lazily-computed Monte Carlo distribution (null until requested). */
  distribution: MonteCarloResult | null;
  computeDistribution: () => void;
  // setters
  setContext: (c: CombatContext) => void;
  setClass: (c: EsoClass) => void;
  setRole: (r: CombatRole) => void;
  setFightDuration: (s: number) => void;
  setDecisiveEnabled: (b: boolean) => void;
  setDecisiveQuality: (q: DecisiveQuality) => void;
  setDecisiveTwoHanded: (b: boolean) => void;
  toggleSource: (id: string, enabled: boolean) => void;
  setUptime: (id: string, uptime: number) => void;
  setUltimateAbility: (id: string) => void;
  setCustomUltimateCost: (cost: number | null) => void;
  setStartingUltimate: (n: number) => void;
  reset: () => void;
}

export function useUltimateCalculator(): UltimateCalculatorResult {
  const [state, setState] = useState<UltimateCalculatorState>(INITIAL_STATE);
  const [distribution, setDistribution] = useState<MonteCarloResult | null>(null);

  const selection = useMemo<CatalogSelection>(
    () => ({
      context: state.context,
      esoClass: state.esoClass,
      role: state.role,
      enabledOverrides: state.enabledOverrides,
      uptimeOverrides: state.uptimeOverrides,
    }),
    [state.context, state.esoClass, state.role, state.enabledOverrides, state.uptimeOverrides],
  );

  const availableSourceEntries = useMemo(
    () => availableSources(ULTIMATE_SOURCE_CATALOG, selection),
    [selection],
  );
  const availableReductionEntries = useMemo(
    () => availableReductions(COST_REDUCTION_CATALOG, selection),
    [selection],
  );

  const decisive = useMemo(
    () =>
      state.decisiveEnabled
        ? makeDecisiveConfig(state.decisiveQuality, state.decisiveTwoHanded)
        : null,
    [state.decisiveEnabled, state.decisiveQuality, state.decisiveTwoHanded],
  );

  const compiledSources = useMemo(
    () => compileSources(ULTIMATE_SOURCE_CATALOG, selection),
    [selection],
  );

  const expected = useMemo<ExpectedValueResult>(
    () =>
      expectedValue({
        fightDurationSeconds: state.fightDurationSeconds,
        sources: compiledSources,
        decisive,
      }),
    [compiledSources, decisive, state.fightDurationSeconds],
  );

  const appliedReductions = useMemo(
    () => compileReductions(COST_REDUCTION_CATALOG, selection),
    [selection],
  );

  const baseCost = useMemo(() => {
    if (state.customUltimateCost != null) return state.customUltimateCost;
    const ability = ULTIMATE_ABILITIES.find((a) => a.id === state.ultimateAbilityId);
    return ability?.baseCost ?? 250;
  }, [state.customUltimateCost, state.ultimateAbilityId]);

  const effectiveCost = useMemo(
    () => applyCostReduction(baseCost, appliedReductions),
    [baseCost, appliedReductions],
  );

  const timeToUlt = useMemo<TimeToUltimateResult>(
    () =>
      timeToUltimate({
        effectiveCost,
        ultimatePerSecond: expected.ultimatePerSecond,
        fightDurationSeconds: state.fightDurationSeconds,
        startingUltimate: state.startingUltimate,
      }),
    [effectiveCost, expected.ultimatePerSecond, state.fightDurationSeconds, state.startingUltimate],
  );

  const exceedsSanity = expected.ultimatePerSecond > SANITY_MAX_ULT_PER_SECOND;

  // Recompute the distribution on demand (and clear it when inputs change so a
  // stale chart never lingers — the headline EV always stays live).
  const computeDistribution = useCallback(() => {
    setDistribution(
      runMonteCarlo(
        { fightDurationSeconds: state.fightDurationSeconds, sources: compiledSources, decisive },
        { runs: DEFAULT_MC_RUNS, baseSeed: MC_BASE_SEED },
      ),
    );
  }, [state.fightDurationSeconds, compiledSources, decisive]);

  const isEnabled = useCallback(
    (id: string, defaultEnabled: boolean) =>
      isEntryEnabled(id, defaultEnabled, state.enabledOverrides),
    [state.enabledOverrides],
  );

  // --- setters (each clears any stale distribution) -------------------------
  const patch = useCallback((updater: (s: UltimateCalculatorState) => UltimateCalculatorState) => {
    setState(updater);
    setDistribution(null);
  }, []);

  const setContext = useCallback(
    (context: CombatContext) => patch((s) => ({ ...s, context })),
    [patch],
  );
  const setClass = useCallback((esoClass: EsoClass) => patch((s) => ({ ...s, esoClass })), [patch]);
  const setRole = useCallback((role: CombatRole) => patch((s) => ({ ...s, role })), [patch]);
  const setFightDuration = useCallback(
    (seconds: number) =>
      patch((s) => ({ ...s, fightDurationSeconds: Math.max(1, Math.round(seconds)) })),
    [patch],
  );
  const setDecisiveEnabled = useCallback(
    (decisiveEnabled: boolean) => patch((s) => ({ ...s, decisiveEnabled })),
    [patch],
  );
  const setDecisiveQuality = useCallback(
    (decisiveQuality: DecisiveQuality) => patch((s) => ({ ...s, decisiveQuality })),
    [patch],
  );
  const setDecisiveTwoHanded = useCallback(
    (decisiveTwoHanded: boolean) => patch((s) => ({ ...s, decisiveTwoHanded })),
    [patch],
  );
  const toggleSource = useCallback(
    (id: string, enabled: boolean) =>
      patch((s) => ({ ...s, enabledOverrides: { ...s.enabledOverrides, [id]: enabled } })),
    [patch],
  );
  const setUptime = useCallback(
    (id: string, uptime: number) =>
      patch((s) => ({
        ...s,
        uptimeOverrides: { ...s.uptimeOverrides, [id]: Math.min(1, Math.max(0, uptime)) },
      })),
    [patch],
  );
  const setUltimateAbility = useCallback(
    (ultimateAbilityId: string) =>
      patch((s) => ({ ...s, ultimateAbilityId, customUltimateCost: null })),
    [patch],
  );
  const setCustomUltimateCost = useCallback(
    (customUltimateCost: number | null) =>
      patch((s) => ({
        ...s,
        customUltimateCost:
          customUltimateCost == null ? null : Math.max(0, Math.round(customUltimateCost)),
      })),
    [patch],
  );
  const setStartingUltimate = useCallback(
    (startingUltimate: number) =>
      patch((s) => ({
        ...s,
        startingUltimate: Math.min(MAX_ULTIMATE_POOL, Math.max(0, Math.round(startingUltimate))),
      })),
    [patch],
  );
  const reset = useCallback(() => {
    setState(INITIAL_STATE);
    setDistribution(null);
  }, []);

  return {
    state,
    selection,
    availableSourceEntries,
    availableReductionEntries,
    isEnabled,
    expected,
    effectiveCost,
    baseCost,
    appliedReductions,
    timeToUlt,
    exceedsSanity,
    sanityMax: SANITY_MAX_ULT_PER_SECOND,
    maxPool: MAX_ULTIMATE_POOL,
    distribution,
    computeDistribution,
    setContext,
    setClass,
    setRole,
    setFightDuration,
    setDecisiveEnabled,
    setDecisiveQuality,
    setDecisiveTwoHanded,
    toggleSource,
    setUptime,
    setUltimateAbility,
    setCustomUltimateCost,
    setStartingUltimate,
    reset,
  };
}
