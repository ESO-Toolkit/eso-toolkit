/**
 * Redux selectors for Loadout Manager
 */

import { RootState } from '@/store/storeWithHistory';

import { LoadoutSetup } from '../types/loadout.types';

/**
 * Get the current trial ID
 */
export const selectCurrentTrial = (state: RootState): string | null =>
  state.loadout.currentTrial;

/**
 * Get the current page index
 */
export const selectCurrentPage = (state: RootState): number => state.loadout.currentPage;

/**
 * Get the current mode (basic or advanced)
 */
export const selectMode = (state: RootState): 'basic' | 'advanced' => state.loadout.mode;

/**
 * Get the current character ID
 */
export const selectCurrentCharacter = (state: RootState): string | null =>
  state.loadout.currentCharacter;

/**
 * Get all pages for a specific trial (for the current character)
 */
export const selectTrialPages = (state: RootState, trialId: string) => {
  const characterId = state.loadout.currentCharacter;
  if (!characterId) return [];
  return state.loadout.pages[characterId]?.[trialId] || [];
};

/**
 * Get the current page for the current trial (for the current character)
 */
export const selectCurrentTrialPage = (state: RootState) => {
  const trialId = state.loadout.currentTrial;
  const characterId = state.loadout.currentCharacter;
  
  if (!trialId || !characterId) return null;

  const pages = state.loadout.pages[characterId]?.[trialId];
  if (!pages) return null;

  return pages[state.loadout.currentPage] || null;
};

/**
 * Get all setups for the current page
 */
export const selectCurrentSetups = (state: RootState): LoadoutSetup[] => {
  const currentPage = selectCurrentTrialPage(state);
  return currentPage?.setups || [];
};

/**
 * Get a specific setup (for the current character)
 */
export const selectSetup = (
  state: RootState,
  trialId: string,
  pageIndex: number,
  setupIndex: number,
): LoadoutSetup | null => {
  const characterId = state.loadout.currentCharacter;
  if (!characterId) return null;
  return state.loadout.pages[characterId]?.[trialId]?.[pageIndex]?.setups[setupIndex] || null;
};

/**
 * Get the complete loadout state for export
 */
export const selectLoadoutState = (state: RootState) => state.loadout;
