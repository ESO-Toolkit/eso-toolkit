/**
 * Redux selectors for Loadout Manager
 */

import { createSelector } from '@reduxjs/toolkit';

import { RootState } from '@/store/storeWithHistory';

import { LoadoutSetup, LoadoutState, SetupPage } from '../types/loadout.types';

// ── Base selectors (stable references, no memoization needed) ──

export const selectCurrentTrial = (state: RootState): string | null => state.loadout.currentTrial;

export const selectCurrentPage = (state: RootState): number => state.loadout.currentPage;

export const selectMode = (state: RootState): 'basic' | 'advanced' => state.loadout.mode;

export const selectCurrentCharacter = (state: RootState): string | null =>
  state.loadout.currentCharacter;

const selectPages = (state: RootState): RootState['loadout']['pages'] => state.loadout.pages;

export const selectLoadoutState = (state: RootState): LoadoutState => state.loadout;

// ── Memoized selectors ──

const EMPTY_PAGES: SetupPage[] = [];
const EMPTY_SETUPS: LoadoutSetup[] = [];

/**
 * Get all pages for a specific trial (for the current character).
 * Parameterized by trialId — use via `selectTrialPages(state, trialId)`.
 */
export const selectTrialPages = createSelector(
  [selectCurrentCharacter, selectPages, (_state: RootState, trialId: string) => trialId],
  (characterId, pages, trialId): SetupPage[] => {
    if (!characterId) return EMPTY_PAGES;
    return pages[characterId]?.[trialId] ?? EMPTY_PAGES;
  },
);

/**
 * Get the current page for the current trial (for the current character).
 */
export const selectCurrentTrialPage = createSelector(
  [selectCurrentTrial, selectCurrentCharacter, selectPages, selectCurrentPage],
  (trialId, characterId, pages, currentPage): SetupPage | null => {
    if (!trialId || !characterId) return null;
    return pages[characterId]?.[trialId]?.[currentPage] ?? null;
  },
);

/**
 * Get all setups for the current page.
 */
export const selectCurrentSetups = createSelector(
  [selectCurrentTrialPage],
  (currentPage): LoadoutSetup[] => currentPage?.setups ?? EMPTY_SETUPS,
);

/**
 * Get a specific setup (for the current character).
 */
export const selectSetup = createSelector(
  [
    selectCurrentCharacter,
    selectPages,
    (_state: RootState, trialId: string) => trialId,
    (_state: RootState, _trialId: string, pageIndex: number) => pageIndex,
    (_state: RootState, _trialId: string, _pageIndex: number, setupIndex: number) => setupIndex,
  ],
  (characterId, pages, trialId, pageIndex, setupIndex): LoadoutSetup | null => {
    if (!characterId) return null;
    return pages[characterId]?.[trialId]?.[pageIndex]?.setups[setupIndex] ?? null;
  },
);
