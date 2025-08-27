import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UIState {
  darkMode: boolean;
  sidebarOpen: boolean;
  showExperimentalTabs: boolean;
  selectedTargetId: string | null;
  selectedTabId: number | null;
}

const initialState: UIState = {
  darkMode: true,
  sidebarOpen: false,
  showExperimentalTabs: false,
  selectedTargetId: null,
  selectedTabId: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setDarkMode(state, action: PayloadAction<boolean>) {
      state.darkMode = action.payload;
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
    setSelectedTargetId(state, action: PayloadAction<string | null>) {
      state.selectedTargetId = action.payload;
    },
    setSelectedTabId(state, action: PayloadAction<number | null>) {
      state.selectedTabId = action.payload;
    },
  },
});

export const {
  setDarkMode,
  setSidebarOpen,
  toggleSidebar,
  setShowExperimentalTabs,
  toggleExperimentalTabs,
  setSelectedTargetId,
  setSelectedTabId,
} = uiSlice.actions;
export default uiSlice.reducer;
