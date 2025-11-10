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
 * Get all pages for a specific trial
 */
export const selectTrialPages = (state: RootState, trialId: string) =>
  state.loadout.pages[trialId] || [];

/**
 * Get the current page for the current trial
 */
export const selectCurrentTrialPage = (state: RootState) => {
  const trialId = state.loadout.currentTrial;
  if (!trialId) return null;

  const pages = state.loadout.pages[trialId];
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
 * Get a specific setup
 */
export const selectSetup = (
  state: RootState,
  trialId: string,
  pageIndex: number,
  setupIndex: number,
): LoadoutSetup | null => {
  return state.loadout.pages[trialId]?.[pageIndex]?.setups[setupIndex] || null;
};

/**
 * Get the complete loadout state for export
 */
export const selectLoadoutState = (state: RootState) => state.loadout;
