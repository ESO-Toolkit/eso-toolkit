import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type PerfTier = 'low' | 'medium' | 'high';
export type PerfTierOverride = 'auto' | PerfTier;

export interface UIState {
  darkMode: boolean;
  selectedPlayerId: number | null;
  selectedTabId: number | null;
  selectedTargetIds: number[]; // Changed from single ID to array of IDs
  selectedFriendlyPlayerId: number | null | undefined; // Selected friendly player for uptime filtering
  showExperimentalTabs: boolean;
  sidebarOpen: boolean;
  myReportsPage: number; // Persisted page number for my-reports
  perfTier: PerfTier;
  perfTierOverride: PerfTierOverride;
}

const initialState: UIState = {
  darkMode: true, // Default to dark mode
  selectedPlayerId: null,
  selectedTabId: null,
  selectedTargetIds: [], // Initialize as empty array
  selectedFriendlyPlayerId: null, // Default to no filtering (show all players)
  showExperimentalTabs: false,
  sidebarOpen: false,
  myReportsPage: 1, // Default to page 1
  // Conservative default until detection resolves — avoids a flash of
  // expensive blur layers on first paint for returning visitors with an
  // empty persisted store.
  perfTier: 'medium',
  perfTierOverride: 'auto',
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
    setSelectedFriendlyPlayerId: (state, action: PayloadAction<number | null | undefined>) => {
      state.selectedFriendlyPlayerId = action.payload;
    },
    setSelectedTabId: (state, action: PayloadAction<number | null>) => {
      state.selectedTabId = action.payload;
    },
    setSelectedTargetIds: (state, action: PayloadAction<number[]>) => {
      state.selectedTargetIds = action.payload;
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
    setPerfTier: (state, action: PayloadAction<PerfTier>) => {
      state.perfTier = action.payload;
    },
    setPerfTierOverride: (state, action: PayloadAction<PerfTierOverride>) => {
      state.perfTierOverride = action.payload;
    },
  },
});

export const {
  setDarkMode,
  toggleDarkMode,
  syncWithSystemTheme,
  setSelectedPlayerId,
  setSelectedFriendlyPlayerId,
  setSelectedTabId,
  setSelectedTargetIds,
  setShowExperimentalTabs,
  setSidebarOpen,
  toggleSidebar,
  setMyReportsPage,
  setPerfTier,
  setPerfTierOverride,
} = uiSlice.actions;
export default uiSlice.reducer;
