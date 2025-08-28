import { createSelector } from '@reduxjs/toolkit';

import { RootState } from '../storeWithHistory';

// UI SELECTORS - Read from ui slice

export const selectUI = (state: RootState): RootState['ui'] => state.ui;
export const selectDarkMode = (state: RootState): RootState['ui']['darkMode'] => state.ui.darkMode;
export const selectSidebarOpen = (state: RootState): RootState['ui']['sidebarOpen'] =>
  state.ui.sidebarOpen;
export const selectShowExperimentalTabs = (
  state: RootState
): RootState['ui']['showExperimentalTabs'] => state.ui.showExperimentalTabs;
export const selectSelectedTargetId = (state: RootState): RootState['ui']['selectedTargetId'] =>
  state.ui.selectedTargetId;
export const selectSelectedPlayerId = (state: RootState): RootState['ui']['selectedPlayerId'] =>
  state.ui.selectedPlayerId;
export const selectSelectedTabId = (state: RootState): RootState['ui']['selectedTabId'] =>
  state.ui.selectedTabId;

// Combined UI state
export const selectCombinedUIState = createSelector([selectUI], (ui) => ({
  darkMode: ui.darkMode,
  sidebarOpen: ui.sidebarOpen,
  showExperimentalTabs: ui.showExperimentalTabs,
  selectedTargetId: ui.selectedTargetId,
  selectedPlayerId: ui.selectedPlayerId,
  selectedTabId: ui.selectedTabId,
}));
