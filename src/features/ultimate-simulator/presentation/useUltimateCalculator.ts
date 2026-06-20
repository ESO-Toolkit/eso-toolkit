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
   * Generation-source enable toggles the user changed by hand, keyed by source
   * id. These are the user's *deltas* over the archetype preset — they are
   * replayed on top of the preset whenever the archetype is re-resolved (a
   * context/role/class switch), so the build always reflects the selected
   * archetype PLUS the user's edits, never a stale snapshot. Cleared by
   * "Apply / Reset to typical". Cost-reduction toggles are not tracked here.
   */
  userEnabledEdits: Record<string, boolean>;
  /** Per-source uptime values the user set by hand — replayed like userEnabledEdits. */
  userUptimeEdits: Record<string, number>;
}

/** Cost-reduction ids — preserved across preset applies (a preset never changes them). */
const COST_REDUCTION_IDS = new Set(COST_REDUCTION_CATALOG.map((r) => r.id));

/** Whether the build carries any hand-edit over its archetype preset. */
const isCustomized = (state: UltimateCalculatorState): boolean =>
  Object.keys(state.userEnabledEdits).length > 0 || Object.keys(state.userUptimeEdits).length > 0;

/**
 * Re-seed the source layer (enabled toggles + uptimes) from the archetype preset
 * for the state's current context / role / class.
 *
 * The preset is resolved fresh, so the source layer always reflects the selected
 * archetype — never a stale snapshot of a previous one. Cost-reduction toggles
 * are carried over (a preset never governs them). When `keepUserEdits` is true
 * (context/role/class switches), the user's hand-edits are replayed on top so a
 * customized build follows the player across playstyles; when false ("Apply /
 * Reset to typical"), the edits are dropped and the pure preset is restored.
 */
function applyArchetype(
  state: UltimateCalculatorState,
  keepUserEdits: boolean,
): UltimateCalculatorState {
  const preset = getArchetypePreset(state.context, state.role);
  const { enabledOverrides, uptimeOverrides } = resolvePresetOverrides(preset, state.esoClass);
  // Carry over cost-reduction toggles; the preset only governs generation sources.
  const preservedReductions: Record<string, boolean> = {};
  for (const [id, on] of Object.entries(state.enabledOverrides)) {
    if (COST_REDUCTION_IDS.has(id)) preservedReductions[id] = on;
  }
  const userEnabledEdits = keepUserEdits ? state.userEnabledEdits : {};
  const userUptimeEdits = keepUserEdits ? state.userUptimeEdits : {};
  return {
    ...state,
    enabledOverrides: { ...preservedReductions, ...enabledOverrides, ...userEnabledEdits },
    uptimeOverrides: { ...uptimeOverrides, ...userUptimeEdits },
    userEnabledEdits,
    userUptimeEdits,
  };
}

/**
 * Minor and Major Heroism are the same buff at two tiers — they never stack
 * (Major overrides Minor). Enabling one disables the other so the engine, which
 * does not de-duplicate buffs, can never sum both.
 */
const HEROISM_EXCLUSIVE: Record<string, string> = {
  'minor-heroism': 'major-heroism',
  'major-heroism': 'minor-heroism',
};

/**
 * Set a generation source's enabled state, recording it as a user delta ONLY
 * when it differs from the active archetype preset. Reverting a toggle back to
 * the preset value therefore clears the delta (the build returns to pristine),
 * so a stale "matches the preset anyway" delta can never leak into — and
 * double-count against — a later archetype. Enabling a Heroism tier disables the
 * other (recorded as a delta too) to preserve the non-stacking invariant.
 */
function setSourceEnabled(
  state: UltimateCalculatorState,
  id: string,
  enabled: boolean,
): Pick<UltimateCalculatorState, 'enabledOverrides' | 'userEnabledEdits'> {
  const presetEnabled = resolvePresetOverrides(
    getArchetypePreset(state.context, state.role),
    state.esoClass,
  ).enabledOverrides;
  const enabledOverrides = { ...state.enabledOverrides };
  const userEnabledEdits = { ...state.userEnabledEdits };
  const set = (sid: string, val: boolean): void => {
    enabledOverrides[sid] = val;
    if (val === presetEnabled[sid]) delete userEnabledEdits[sid];
    else userEnabledEdits[sid] = val;
  };
  set(id, enabled);
  const exclusive = HEROISM_EXCLUSIVE[id];
  if (exclusive && enabled) set(exclusive, false);
  return { enabledOverrides, userEnabledEdits };
}

/**
 * Set a source's uptime, recording it as a delta only when it differs from the
 * resolved preset value (preset override, else the catalog default). Comparison
 * is by whole percent — the only granularity the slider exposes — so dragging a
 * slider back to the preset value clears the delta.
 */
function setSourceUptime(
  state: UltimateCalculatorState,
  id: string,
  uptime: number,
): Pick<UltimateCalculatorState, 'uptimeOverrides' | 'userUptimeEdits'> {
  const clamped = Math.min(1, Math.max(0, uptime));
  const presetUptimes = resolvePresetOverrides(
    getArchetypePreset(state.context, state.role),
    state.esoClass,
  ).uptimeOverrides;
  const catalogDefault = ULTIMATE_SOURCE_CATALOG.find((s) => s.id === id)?.uptime ?? 0;
  const presetValue = presetUptimes[id] ?? catalogDefault;
  const uptimeOverrides = { ...state.uptimeOverrides, [id]: clamped };
  const userUptimeEdits = { ...state.userUptimeEdits };
  if (Math.round(clamped * 100) === Math.round(presetValue * 100)) delete userUptimeEdits[id];
  else userUptimeEdits[id] = clamped;
  return { uptimeOverrides, userUptimeEdits };
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
  userEnabledEdits: {},
  userUptimeEdits: {},
};

// Open on a realistic build rather than the inert base-only number: seed the
// typical Group · DPS archetype so the headline is meaningful at first paint.
const INITIAL_STATE: UltimateCalculatorState = applyArchetype(BASE_INITIAL_STATE, false);

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
  /** Drop hand-edits and restore the pure archetype preset (keeps scenario inputs). */
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

  // Context / role / class drive the archetype preset. Each re-resolves the new
  // archetype's source layer and replays the user's hand-edits on top, so the
  // build always reflects the selected playstyle PLUS any customizations — never
  // a stale snapshot of the previous archetype. (A pristine build simply has no
  // edits to replay, so it becomes the pure new preset.)
  const setContext = useCallback(
    (context: CombatContext) => patch((s) => applyArchetype({ ...s, context }, true)),
    [patch],
  );
  const setClass = useCallback(
    (esoClass: EsoClass) => patch((s) => applyArchetype({ ...s, esoClass }, true)),
    [patch],
  );
  const setRole = useCallback(
    (role: CombatRole) => patch((s) => applyArchetype({ ...s, role }, true)),
    [patch],
  );
  // Numeric setters reject non-finite input (NaN/Infinity from a transient or
  // out-of-range field value) so it can never poison effective cost / time-to-ult
  // / the results with NaN. An invalid edit leaves the prior value untouched.
  const setFightDuration = useCallback(
    (seconds: number) =>
      patch((s) =>
        Number.isFinite(seconds)
          ? { ...s, fightDurationSeconds: Math.max(1, Math.round(seconds)) }
          : s,
      ),
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
  // Hand-editing a generation SOURCE records a user delta (replayed across
  // archetype switches, pruned when it matches the preset). Cost reductions also
  // flow through toggleSource, but they're orthogonal to the archetype source
  // layer (a preset never sets them, and applyArchetype preserves them), so
  // toggling one updates the override but is NOT tracked as a customization —
  // otherwise switching playstyle after, say, turning off Power Stone would be
  // treated as a custom build.
  const toggleSource = useCallback(
    (id: string, enabled: boolean) =>
      patch((s) =>
        COST_REDUCTION_IDS.has(id)
          ? { ...s, enabledOverrides: { ...s.enabledOverrides, [id]: enabled } }
          : { ...s, ...setSourceEnabled(s, id, enabled) },
      ),
    [patch],
  );
  const setUptime = useCallback(
    (id: string, uptime: number) => patch((s) => ({ ...s, ...setSourceUptime(s, id, uptime) })),
    [patch],
  );
  const setUltimateAbility = useCallback(
    (ultimateAbilityId: string) =>
      patch((s) => ({ ...s, ultimateAbilityId, customUltimateCost: null })),
    [patch],
  );
  const setCustomUltimateCost = useCallback(
    (customUltimateCost: number | null) =>
      patch((s) => {
        if (customUltimateCost == null) return { ...s, customUltimateCost: null };
        if (!Number.isFinite(customUltimateCost)) return s;
        return { ...s, customUltimateCost: Math.max(0, Math.round(customUltimateCost)) };
      }),
    [patch],
  );
  const setStartingUltimate = useCallback(
    (startingUltimate: number) =>
      patch((s) =>
        Number.isFinite(startingUltimate)
          ? {
              ...s,
              startingUltimate: Math.min(
                MAX_ULTIMATE_POOL,
                Math.max(0, Math.round(startingUltimate)),
              ),
            }
          : s,
      ),
    [patch],
  );
  const setPillagerHealerUltCost = useCallback(
    (pillagerHealerUltCost: number) =>
      patch((s) =>
        Number.isFinite(pillagerHealerUltCost)
          ? {
              ...s,
              pillagerHealerUltCost: Math.min(
                MAX_ULTIMATE_POOL,
                Math.max(0, Math.round(pillagerHealerUltCost)),
              ),
            }
          : s,
      ),
    [patch],
  );
  // Drop the user's hand-edits and restore the pure archetype preset (keeps
  // context, role, class and every scenario input). Backs both the "Apply
  // typical {archetype}" nudge and the "Reset to typical {archetype}" button.
  const applyActivePreset = useCallback(() => patch((s) => applyArchetype(s, false)), [patch]);

  const activePreset = useMemo(
    () => getArchetypePreset(state.context, state.role),
    [state.context, state.role],
  );

  const customized = useMemo(() => isCustomized(state), [state]);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
    setDistribution(null);
  }, []);

  return {
    state,
    selection,
    activePreset,
    customized,
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
