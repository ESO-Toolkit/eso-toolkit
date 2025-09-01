import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UIState {
  darkMode: boolean;
  selectedPlayerId: string | null;
  selectedTabId: string | null;
  selectedTargetId: string | null;
  showExperimentalTabs: boolean;
  sidebarOpen: boolean;
}

const initialState: UIState = {
  darkMode: true, // Default to dark mode
  selectedPlayerId: null,
  selectedTabId: null,
  selectedTargetId: null,
  showExperimentalTabs: false,
  sidebarOpen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setDarkMode: (state, action: PayloadAction<boolean>) => {
      state.darkMode = action.payload;
    },
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
    },
    syncWithSystemTheme: (state) => {
      // This will be handled by the hook logic
      const prefersDark = typeof window !== 'undefined' && window.matchMedia 
        ? window.matchMedia('(prefers-color-scheme: dark)').matches 
        : true;
      state.darkMode = prefersDark;
    },
    setSelectedPlayerId: (state, action: PayloadAction<string | null>) => {
      state.selectedPlayerId = action.payload;
    },
    setSelectedTabId: (state, action: PayloadAction<string | null>) => {
      state.selectedTabId = action.payload;
    },
    setSelectedTargetId: (state, action: PayloadAction<string | null>) => {
      state.selectedTargetId = action.payload;
    },
    setShowExperimentalTabs: (state, action: PayloadAction<boolean>) => {
      state.showExperimentalTabs = action.payload;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
  },
});

export const { 
  setDarkMode, 
  toggleDarkMode, 
  syncWithSystemTheme, 
  setSelectedPlayerId, 
  setSelectedTabId, 
  setSelectedTargetId,
  setShowExperimentalTabs,
  setSidebarOpen,
  toggleSidebar
} = uiSlice.actions;
export default uiSlice.reducer;