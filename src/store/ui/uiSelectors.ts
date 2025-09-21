import { createSelector } from '@reduxjs/toolkit';

import { RootState } from '../storeWithHistory';

// UI SELECTORS - Read from ui slice

export const selectUI = (state: RootState): RootState['ui'] => state.ui;
export const selectDarkMode = (state: RootState): RootState['ui']['darkMode'] => state.ui.darkMode;
export const selectSidebarOpen = (state: RootState): RootState['ui']['sidebarOpen'] =>
  state.ui.sidebarOpen;
export const selectShowExperimentalTabs = (
  state: RootState,
): RootState['ui']['showExperimentalTabs'] => state.ui.showExperimentalTabs;
export const selectSelectedTargetIds = (state: RootState): RootState['ui']['selectedTargetIds'] =>
  state.ui.selectedTargetIds || [];

// Compatibility selector for components that still expect a single target ID
export const selectSelectedTargetId = (state: RootState): number | null => {
  const targetIds = state.ui.selectedTargetIds;
  // Return the first selected target ID, or null if none selected
  return targetIds && targetIds.length > 0 ? targetIds[0] : null;
};
export const selectSelectedPlayerId = (state: RootState): RootState['ui']['selectedPlayerId'] =>
  state.ui.selectedPlayerId;
export const selectSelectedTabId = (state: RootState): RootState['ui']['selectedTabId'] =>
  state.ui.selectedTabId;

// Combined UI state
export const selectCombinedUIState = createSelector([selectUI], (ui) => ({
  darkMode: ui.darkMode,
  sidebarOpen: ui.sidebarOpen,
  showExperimentalTabs: ui.showExperimentalTabs,
  selectedTargetIds: ui.selectedTargetIds,
  selectedTargetId: ui.selectedTargetIds.length > 0 ? ui.selectedTargetIds[0] : null, // Compatibility
  selectedPlayerId: ui.selectedPlayerId,
  selectedTabId: ui.selectedTabId,
}));
