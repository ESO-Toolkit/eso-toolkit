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
import {
  getArchetypePreset,
  resolvePresetOverrides,
  type ArchetypePreset,
} from '../shared/constants/presets';
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
  /** Healer's ultimate cost for the Pillager's Profit external source (10% of it per cast). */
  pillagerHealerUltCost: number;
  /**
   * True once the user has hand-edited the source layer (toggled a source or
   * moved an uptime). While false ("pristine"), switching context/role/class
   * auto-applies the matching archetype preset so the headline visibly tracks the
   * playstyle; once true, switches preserve the user's edits and the UI offers an
   * explicit "Apply typical {archetype}" instead. Scenario inputs (Decisive,
   * fight length, the chosen ultimate, etc.) never flip this.
   */
  customized: boolean;
}

/** Cost-reduction ids — preserved across preset applies (a preset never changes them). */
const COST_REDUCTION_IDS = new Set(COST_REDUCTION_CATALOG.map((r) => r.id));

/**
 * Re-seed the source layer (enabled toggles + uptimes) from the archetype preset
 * for the state's current context / role / class, preserving the user's scenario
 * inputs and any cost-reduction toggles, and marking the build pristine.
 */
function applyArchetype(state: UltimateCalculatorState): UltimateCalculatorState {
  const preset = getArchetypePreset(state.context, state.role);
  const { enabledOverrides, uptimeOverrides } = resolvePresetOverrides(preset, state.esoClass);
  // Carry over cost-reduction toggles; the preset only governs generation sources.
  const preservedReductions: Record<string, boolean> = {};
  for (const [id, on] of Object.entries(state.enabledOverrides)) {
    if (COST_REDUCTION_IDS.has(id)) preservedReductions[id] = on;
  }
  return {
    ...state,
    enabledOverrides: { ...preservedReductions, ...enabledOverrides },
    uptimeOverrides,
    customized: false,
  };
}

const BASE_INITIAL_STATE: UltimateCalculatorState = {
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
  // A typical healer ultimate (e.g. ~250 cost) → 25 ult per affecting cast.
  pillagerHealerUltCost: 250,
  customized: false,
};

// Open on a realistic build rather than the inert base-only number: seed the
// typical Group · DPS archetype so the headline is meaningful at first paint.
const INITIAL_STATE: UltimateCalculatorState = applyArchetype(BASE_INITIAL_STATE);

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
  /** The preset describing the current (context × role) archetype. */
  activePreset: ArchetypePreset;
  /** True once the user has hand-edited the source layer away from the preset. */
  customized: boolean;
  /** Re-apply the active archetype preset's source layer (keeps scenario inputs). */
  applyActivePreset: () => void;
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
  setPillagerHealerUltCost: (n: number) => void;
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
      pillagerHealerUltCost: state.pillagerHealerUltCost,
    }),
    [
      state.context,
      state.esoClass,
      state.role,
      state.enabledOverrides,
      state.uptimeOverrides,
      state.pillagerHealerUltCost,
    ],
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

  // A custom cost is the user's own EFFECTIVE number — applying class reductions
  // on top would double-count, so reductions only apply to a catalog ability's
  // base cost.
  const isCustomCost = state.customUltimateCost != null;
  const effectiveCost = useMemo(
    () =>
      isCustomCost
        ? Math.max(0, Math.round(baseCost))
        : applyCostReduction(baseCost, appliedReductions),
    [isCustomCost, baseCost, appliedReductions],
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

  // Context / role / class drive the archetype preset. While the build is
  // pristine, changing any of them re-seeds the source layer to the new
  // archetype so the headline visibly tracks the playstyle; once customized,
  // the switch keeps the user's edits (the UI then offers an explicit re-apply).
  const setContext = useCallback(
    (context: CombatContext) =>
      patch((s) => {
        const next = { ...s, context };
        return s.customized ? next : applyArchetype(next);
      }),
    [patch],
  );
  const setClass = useCallback(
    (esoClass: EsoClass) =>
      patch((s) => {
        const next = { ...s, esoClass };
        return s.customized ? next : applyArchetype(next);
      }),
    [patch],
  );
  const setRole = useCallback(
    (role: CombatRole) =>
      patch((s) => {
        const next = { ...s, role };
        return s.customized ? next : applyArchetype(next);
      }),
    [patch],
  );
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
  // Hand-editing the source layer marks the build "customized" so a later
  // context/role/class switch won't overwrite the user's choices. (Cost
  // reductions also flow through toggleSource — toggling one is a real build
  // change, so it counts as customizing too.)
  const toggleSource = useCallback(
    (id: string, enabled: boolean) =>
      patch((s) => ({
        ...s,
        enabledOverrides: { ...s.enabledOverrides, [id]: enabled },
        customized: true,
      })),
    [patch],
  );
  const setUptime = useCallback(
    (id: string, uptime: number) =>
      patch((s) => ({
        ...s,
        uptimeOverrides: { ...s.uptimeOverrides, [id]: Math.min(1, Math.max(0, uptime)) },
        customized: true,
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
  const setPillagerHealerUltCost = useCallback(
    (pillagerHealerUltCost: number) =>
      patch((s) => ({
        ...s,
        pillagerHealerUltCost: Math.min(
          MAX_ULTIMATE_POOL,
          Math.max(0, Math.round(pillagerHealerUltCost)),
        ),
      })),
    [patch],
  );
  // Re-apply the current archetype's typical source layer (keeps context, role,
  // class and every scenario input). Backs both the "Apply typical {archetype}"
  // nudge and the "Reset to typical {archetype}" button.
  const applyActivePreset = useCallback(() => patch((s) => applyArchetype(s)), [patch]);

  const activePreset = useMemo(
    () => getArchetypePreset(state.context, state.role),
    [state.context, state.role],
  );

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
    setDistribution(null);
  }, []);

  return {
    state,
    selection,
    activePreset,
    customized: state.customized,
    applyActivePreset,
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
    setPillagerHealerUltCost,
    reset,
  };
}
