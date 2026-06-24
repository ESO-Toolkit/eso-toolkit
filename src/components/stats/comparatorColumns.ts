/**
 * Comparator column normalizers — turn any stat source (a Build Editor setup, a
 * saved build, or a loadout) into the source-agnostic shape the BuildComparator
 * renders. Keeps the comparator presentational and lets builds and loadouts feed
 * the same grid.
 */

import {
  calculateBuildStats,
  calculateSurvivability,
  loadoutSetupToEngineInputs,
  type BuildStats,
  type LoadoutStatContext,
  type StatOverrides,
  type Survivability,
} from '@/engine';
import type { Build, BuildSetup } from '@features/build-editor/types/build.types';
import type { LoadoutSetup } from '@features/loadout-manager/types/loadout.types';

export interface ComparatorColumn {
  id: string;
  /** Primary heading (build / loadout / setup name). */
  label: string;
  /** Optional secondary heading (class · role, trial, etc.). */
  sublabel?: string;
  stats: BuildStats;
  survivability: Survivability;
}

/** Column from a Build Editor setup + its build (saved builds, editor setups). */
export function makeBuildColumn(
  id: string,
  label: string,
  setup: BuildSetup,
  build: Build,
  sublabel?: string,
  overrides?: StatOverrides,
): ComparatorColumn {
  const ov = overrides ?? setup.statOverrides;
  return {
    id,
    label,
    sublabel,
    stats: calculateBuildStats(setup, build, ov),
    survivability: calculateSurvivability(setup, build, ov),
  };
}

/** Column from a loadout setup (gear-derived unless a character context is given). */
export function makeLoadoutColumn(
  id: string,
  label: string,
  loadout: LoadoutSetup,
  sublabel?: string,
  context?: LoadoutStatContext,
): ComparatorColumn {
  const { setup, build } = loadoutSetupToEngineInputs(loadout, context);
  return {
    id,
    label,
    sublabel,
    stats: calculateBuildStats(setup, build),
    survivability: calculateSurvivability(setup, build),
  };
}
