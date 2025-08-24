import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UIState {
  darkMode: boolean;
  sidebarOpen: boolean;
  showExperimentalTabs: boolean;
  selectedTargetId: string | null;
}

const initialState: UIState = {
  darkMode: true,
  sidebarOpen: false,
  showExperimentalTabs: false,
  selectedTargetId: null,
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
  },
});

export const {
  setDarkMode,
  setSidebarOpen,
  toggleSidebar,
  setShowExperimentalTabs,
  toggleExperimentalTabs,
  setSelectedTargetId,
} = uiSlice.actions;
export default uiSlice.reducer;

