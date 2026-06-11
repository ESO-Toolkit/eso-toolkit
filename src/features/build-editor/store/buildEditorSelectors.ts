/**
 * Build Editor Selectors
 *
 * Narrow, memoized selectors for the buildEditor slice. Using these instead
 * of `useSelector((s) => s.buildEditor)` (whole-slice destructuring) keeps
 * components from re-rendering on every unrelated keystroke.
 *
 * Immer preserves references for unchanged subtrees, so `build.races` is stable
 * across `build.name` edits, etc. Prefer the narrowest selector that covers a
 * component's reads.
 */

import { createSelector } from '@reduxjs/toolkit';

import type { RootState } from '@/store/storeWithHistory';

import type { Build, BuildSetup } from '../types/build.types';

// ─── Root ──────────────────────────────────────────────────────────────────

export const selectBuildEditor = (s: RootState): RootState['buildEditor'] => s.buildEditor;

// ─── Slice-level flags ─────────────────────────────────────────────────────

export const selectIsDirty = (s: RootState): boolean => s.buildEditor.isDirty;
export const selectActiveSidebarTab = (
  s: RootState,
): RootState['buildEditor']['activeSidebarTab'] => s.buildEditor.activeSidebarTab;
export const selectActiveSetupTab = (s: RootState): RootState['buildEditor']['activeSetupTab'] =>
  s.buildEditor.activeSetupTab;
export const selectActiveSetupIndex = (s: RootState): number => s.buildEditor.activeSetupIndex;

// ─── Build object ──────────────────────────────────────────────────────────
// Prefer narrow selectors below over this one — reading the whole build
// causes re-renders on every edit because Immer creates a new `build`
// reference for every action.

export const selectBuild = (s: RootState): Build => s.buildEditor.build;

// ─── Build-level fields (stable across unrelated edits) ────────────────────

export const selectBuildName = (s: RootState): string => s.buildEditor.build.name;
export const selectBuildShortDescription = (s: RootState): string =>
  s.buildEditor.build.shortDescription;
export const selectBuildEsoClass = (s: RootState): Build['esoClass'] =>
  s.buildEditor.build.esoClass;
export const selectBuildRole = (s: RootState): Build['role'] => s.buildEditor.build.role;
export const selectBuildGameMode = (s: RootState): Build['gameMode'] =>
  s.buildEditor.build.gameMode;
export const selectBuildRaces = (s: RootState): string[] => s.buildEditor.build.races;
export const selectBuildClassSkillLines = (s: RootState): Build['classSkillLines'] =>
  s.buildEditor.build.classSkillLines;
// Stable empty array — builds saved before U50 have no classMasteryPassives,
// and `?? []` inline would defeat useSelector reference equality.
const EMPTY_CLASS_MASTERY: number[] = [];
export const selectClassMasteryPassives = (s: RootState): number[] =>
  s.buildEditor.build.classMasteryPassives ?? EMPTY_CLASS_MASTERY;
export const selectBuildGuide = (s: RootState): Build['guide'] => s.buildEditor.build.guide;
export const selectBuildSettings = (s: RootState): Build['settings'] =>
  s.buildEditor.build.settings;
export const selectBuildSetups = (s: RootState): BuildSetup[] => s.buildEditor.build.setups;
export const selectAddonImportString = (s: RootState): string =>
  s.buildEditor.build.addonImportString;

// ─── Active setup (per-setup data — gear, skills, cp, etc) ─────────────────
// Immer preserves setups[i] references when only a different setup (or a
// build-level field) is edited, so subscribing to the active setup is safe.

export const selectActiveSetup = (s: RootState): BuildSetup | undefined =>
  s.buildEditor.build.setups[s.buildEditor.activeSetupIndex];

// ─── Stat engine inputs (H3) ───────────────────────────────────────────────
// The stat engine reads: build.{gameMode, races, classSkillLines} and
// setup.{gear, mundusStone, cp}. Memoize a minimal input bundle so the
// consumer's useMemo only invalidates when one of those actually changes.

export interface StatInputs {
  setup: BuildSetup | undefined;
  gameMode: Build['gameMode'];
  races: string[];
  classSkillLines: Build['classSkillLines'];
}

export const selectStatInputs = createSelector(
  [selectActiveSetup, selectBuildGameMode, selectBuildRaces, selectBuildClassSkillLines],
  (setup, gameMode, races, classSkillLines): StatInputs => ({
    setup,
    gameMode,
    races,
    classSkillLines,
  }),
);
