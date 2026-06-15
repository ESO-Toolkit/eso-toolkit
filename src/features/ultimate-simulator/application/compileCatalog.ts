/**
 * Compile catalog entries into engine inputs.
 *
 * The catalog (data) describes every ultimate source the calculator knows; the
 * engine (core) only understands generic `UltimateSource`/`CostReduction`. This
 * module bridges them: given the user's context/class/role and their per-entry
 * toggles + uptime overrides, it filters the catalog down to what's available
 * and produces the exact arrays the engine consumes.
 *
 * Pure and unit-testable — no React, no network.
 */

import type { CostReduction } from '../core/cost';
import type { UltimateSource } from '../shared/types';
import type {
  CatalogCostReduction,
  CatalogSource,
  CombatContext,
  CombatRole,
  EsoClass,
} from '../shared/types/catalog';

export interface CatalogSelection {
  readonly context: CombatContext;
  readonly esoClass: EsoClass;
  readonly role: CombatRole;
  /** Per-entry enabled override, keyed by id. Missing → use defaultEnabled. */
  readonly enabledOverrides: Readonly<Record<string, boolean>>;
  /** Per-source uptime override (0..1), keyed by id. Missing → catalog default. */
  readonly uptimeOverrides: Readonly<Record<string, number>>;
}

/** Is a source available given the current context / class / role? */
export function isSourceAvailable(
  source: CatalogSource,
  selection: Pick<CatalogSelection, 'context' | 'esoClass' | 'role'>,
): boolean {
  if (!source.availableIn.includes(selection.context)) return false;
  if (source.classes && !source.classes.includes(selection.esoClass)) return false;
  if (source.roles && !source.roles.includes(selection.role)) return false;
  return true;
}

/** Is a cost reduction available given the current context / class? */
export function isReductionAvailable(
  reduction: CatalogCostReduction,
  selection: Pick<CatalogSelection, 'context' | 'esoClass'>,
): boolean {
  if (!reduction.availableIn.includes(selection.context)) return false;
  if (reduction.classes && !reduction.classes.includes(selection.esoClass)) return false;
  return true;
}

/** Whether an entry is currently enabled (override wins over default). */
export function isEntryEnabled(
  id: string,
  defaultEnabled: boolean,
  overrides: Readonly<Record<string, boolean>>,
): boolean {
  return overrides[id] ?? defaultEnabled;
}

/** The available catalog sources for a selection (regardless of enabled). */
export function availableSources(
  catalog: readonly CatalogSource[],
  selection: CatalogSelection,
): readonly CatalogSource[] {
  return catalog.filter((s) => isSourceAvailable(s, selection));
}

/** The available cost reductions for a selection (regardless of enabled). */
export function availableReductions(
  catalog: readonly CatalogCostReduction[],
  selection: CatalogSelection,
): readonly CatalogCostReduction[] {
  return catalog.filter((r) => isReductionAvailable(r, selection));
}

/** Expected raw ult/s a (uptime-resolved) source contributes — for ranking. */
function expectedRate(source: CatalogSource): number {
  return source.amountPerInstance * source.instancesPerSecond * source.uptime;
}

/**
 * Compile enabled, available catalog sources into engine `UltimateSource[]`,
 * applying per-source uptime overrides.
 *
 * Sources that share a `nonStackingGroup` represent the SAME named buff from
 * different providers (e.g. Minor Heroism from a potion vs from Cryptcanon).
 * Such a buff does not stack, so when more than one is enabled only the strongest
 * single contribution is kept — they are never summed.
 */
export function compileSources(
  catalog: readonly CatalogSource[],
  selection: CatalogSelection,
): UltimateSource[] {
  const enabled = availableSources(catalog, selection)
    .filter((s) => isEntryEnabled(s.id, s.defaultEnabled, selection.enabledOverrides))
    .map((s) => {
      const uptime = selection.uptimeOverrides[s.id];
      return uptime === undefined ? s : { ...s, uptime: Math.min(1, Math.max(0, uptime)) };
    });

  // Collapse non-stacking buff groups to their single strongest provider.
  const strongestInGroup = new Map<string, CatalogSource>();
  for (const s of enabled) {
    if (s.nonStackingGroup === undefined) continue;
    const current = strongestInGroup.get(s.nonStackingGroup);
    if (current === undefined || expectedRate(s) > expectedRate(current)) {
      strongestInGroup.set(s.nonStackingGroup, s);
    }
  }

  return enabled
    .filter((s) => {
      if (s.nonStackingGroup === undefined) return true;
      // Keep only the winning provider of each non-stacking buff group.
      return strongestInGroup.get(s.nonStackingGroup) === s;
    })
    .map((resolved) => {
      // Strip catalog-only fields down to the engine's UltimateSource shape.
      const {
        id,
        label,
        kind,
        amountPerInstance,
        instancesPerSecond,
        uptime: up,
        rollsDecisive,
        note,
      } = resolved;
      return {
        id,
        label,
        kind,
        amountPerInstance,
        instancesPerSecond,
        uptime: up,
        rollsDecisive,
        note,
      };
    });
}

/**
 * Compile enabled, available cost reductions into engine `CostReduction[]`.
 * The engine's `enabled` flag is set from the selection (default or override).
 */
export function compileReductions(
  catalog: readonly CatalogCostReduction[],
  selection: CatalogSelection,
): CostReduction[] {
  return availableReductions(catalog, selection).map((r) => ({
    id: r.id,
    label: r.label,
    fraction: r.fraction,
    enabled: isEntryEnabled(r.id, r.defaultEnabled, selection.enabledOverrides),
  }));
}
