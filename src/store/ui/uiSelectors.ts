import { createSelector } from '@reduxjs/toolkit';

import { RootState } from '../storeWithHistory';

// UI SELECTORS - Read from ui slice

export const selectUI = (state: RootState) => state.ui;
export const selectDarkMode = (state: RootState) => state.ui.darkMode;
export const selectSidebarOpen = (state: RootState) => state.ui.sidebarOpen;
export const selectShowExperimentalTabs = (state: RootState) => state.ui.showExperimentalTabs;
export const selectSelectedTargetId = (state: RootState) => state.ui.selectedTargetId;

// Combined UI state
export const selectCombinedUIState = createSelector([selectUI], (ui) => ({
  darkMode: ui.darkMode,
  sidebarOpen: ui.sidebarOpen,
  showExperimentalTabs: ui.showExperimentalTabs,
  selectedTargetId: ui.selectedTargetId,
}));
