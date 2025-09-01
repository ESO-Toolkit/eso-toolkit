import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UIState {
  darkMode: boolean;
  sidebarOpen: boolean;
  showExperimentalTabs: boolean;
  selectedTargetId: number | null;
  selectedPlayerId: number | null;
  selectedTabId: number | null;
}

// Detect system theme preference
const getSystemThemePreference = (): boolean => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  // Default to dark mode if we can't detect system preference
  return true;
};

const initialState: UIState = {
  darkMode: getSystemThemePreference(),
  sidebarOpen: false,
  showExperimentalTabs: false,
  selectedTargetId: null,
  selectedPlayerId: null,
  selectedTabId: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setDarkMode(state, action: PayloadAction<boolean>) {
      state.darkMode = action.payload;
    },
    toggleDarkMode(state) {
      state.darkMode = !state.darkMode;
    },
    syncWithSystemTheme(state) {
      state.darkMode = getSystemThemePreference();
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setShowExperimentalTabs(state, action: PayloadAction<boolean>) {
      state.showExperimentalTabs = action.payload;
    },
    toggleExperimentalTabs(state) {
      state.showExperimentalTabs = !state.showExperimentalTabs;
    },
    setSelectedTargetId(state, action: PayloadAction<number | null>) {
      state.selectedTargetId = action.payload;
    },
    setSelectedPlayerId(state, action: PayloadAction<number | null>) {
      state.selectedPlayerId = action.payload;
    },
    setSelectedTabId(state, action: PayloadAction<number | null>) {
      state.selectedTabId = action.payload;
    },
  },
});

export const {
  setDarkMode,
  toggleDarkMode,
  syncWithSystemTheme,
  setSidebarOpen,
  toggleSidebar,
  setShowExperimentalTabs,
  toggleExperimentalTabs,
  setSelectedTargetId,
  setSelectedPlayerId,
  setSelectedTabId,
} = uiSlice.actions;
export default uiSlice.reducer;
