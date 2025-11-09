import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UIState {
  darkMode: boolean;
  selectedPlayerId: number | null;
  selectedTabId: number | null;
  selectedTargetIds: number[]; // Changed from single ID to array of IDs
  showExperimentalTabs: boolean;
  sidebarOpen: boolean;
  myReportsPage: number; // Persisted page number for my-reports
}

const initialState: UIState = {
  darkMode: true, // Default to dark mode
  selectedPlayerId: null,
  selectedTabId: null,
  selectedTargetIds: [], // Initialize as empty array
  showExperimentalTabs: false,
  sidebarOpen: false,
  myReportsPage: 1, // Default to page 1
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
      const prefersDark =
        typeof window !== 'undefined' && window.matchMedia
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
          : true;
      state.darkMode = prefersDark;
    },
    setSelectedPlayerId: (state, action: PayloadAction<number | null>) => {
      state.selectedPlayerId = action.payload;
    },
    setSelectedTabId: (state, action: PayloadAction<number | null>) => {
      state.selectedTabId = action.payload;
    },
    setSelectedTargetIds: (state, action: PayloadAction<number[]>) => {
      state.selectedTargetIds = action.payload;
    },
    // Compatibility action for components that set a single target ID
    setSelectedTargetId: (state, action: PayloadAction<number | null>) => {
      if (action.payload === null) {
        state.selectedTargetIds = [];
      } else {
        state.selectedTargetIds = [action.payload];
      }
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
    setMyReportsPage: (state, action: PayloadAction<number>) => {
      state.myReportsPage = action.payload;
    },
  },
});

export const {
  setDarkMode,
  toggleDarkMode,
  syncWithSystemTheme,
  setSelectedPlayerId,
  setSelectedTabId,
  setSelectedTargetIds,
  setShowExperimentalTabs,
  setSidebarOpen,
  toggleSidebar,
  setMyReportsPage,
} = uiSlice.actions;
export default uiSlice.reducer;
