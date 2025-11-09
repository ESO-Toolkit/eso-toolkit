import { configureStore } from '@reduxjs/toolkit';

import uiReducer, {
  UIState,
  setDarkMode,
  toggleDarkMode,
  syncWithSystemTheme,
  setSelectedPlayerId,
  setSelectedTabId,
  setSelectedTargetIds,
  setShowExperimentalTabs,
  setSidebarOpen,
  toggleSidebar,
} from './uiSlice';

describe('uiSlice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        ui: uiReducer,
      },
    });
  });

  describe('initial state', () => {
    it('should initialize with correct default values', () => {
      const state = store.getState() as { ui: UIState };
      expect(state.ui).toEqual({
        darkMode: true,
        selectedPlayerId: null,
        selectedTabId: null,
        selectedTargetIds: [],
        showExperimentalTabs: false,
        sidebarOpen: false,
        myReportsPage: 1,
      });
    });
  });

  describe('setDarkMode', () => {
    it('should set dark mode to true', () => {
      store.dispatch(setDarkMode(true));
      const state = store.getState() as { ui: UIState };
      expect(state.ui.darkMode).toBe(true);
    });

    it('should set dark mode to false', () => {
      store.dispatch(setDarkMode(false));
      const state = store.getState() as { ui: UIState };
      expect(state.ui.darkMode).toBe(false);
    });
  });

  describe('toggleDarkMode', () => {
    it('should toggle dark mode from true to false', () => {
      // Initial state has darkMode: true
      store.dispatch(toggleDarkMode());
      const state = store.getState() as { ui: UIState };
      expect(state.ui.darkMode).toBe(false);
    });

    it('should toggle dark mode from false to true', () => {
      // First set to false
      store.dispatch(setDarkMode(false));
      // Then toggle
      store.dispatch(toggleDarkMode());
      const state = store.getState() as { ui: UIState };
      expect(state.ui.darkMode).toBe(true);
    });

    it('should toggle multiple times correctly', () => {
      const initialState = store.getState() as { ui: UIState };
      const initialDarkMode = initialState.ui.darkMode;

      store.dispatch(toggleDarkMode());
      store.dispatch(toggleDarkMode());

      const finalState = store.getState() as { ui: UIState };
      expect(finalState.ui.darkMode).toBe(initialDarkMode);
    });
  });

  describe('syncWithSystemTheme', () => {
    const originalMatchMedia = window.matchMedia;

    afterEach(() => {
      window.matchMedia = originalMatchMedia;
    });

    it('should set dark mode to true when system prefers dark theme', () => {
      // Mock matchMedia to return dark theme preference
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      store.dispatch(syncWithSystemTheme());
      const state = store.getState() as { ui: UIState };
      expect(state.ui.darkMode).toBe(true);
    });

    it('should set dark mode to false when system prefers light theme', () => {
      // Mock matchMedia to return light theme preference
      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      store.dispatch(syncWithSystemTheme());
      const state = store.getState() as { ui: UIState };
      expect(state.ui.darkMode).toBe(false);
    });

    it('should default to dark mode when matchMedia is not available', () => {
      // Mock window to not have matchMedia
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      store.dispatch(syncWithSystemTheme());
      const state = store.getState() as { ui: UIState };
      expect(state.ui.darkMode).toBe(true);

      global.window = originalWindow;
    });
  });

  describe('setSelectedPlayerId', () => {
    it('should set player id to a number', () => {
      store.dispatch(setSelectedPlayerId(123));
      const state = store.getState() as { ui: UIState };
      expect(state.ui.selectedPlayerId).toBe(123);
    });

    it('should set player id to null', () => {
      // First set to a number
      store.dispatch(setSelectedPlayerId(123));
      // Then set to null
      store.dispatch(setSelectedPlayerId(null));
      const state = store.getState() as { ui: UIState };
      expect(state.ui.selectedPlayerId).toBeNull();
    });

    it('should overwrite previous player id', () => {
      store.dispatch(setSelectedPlayerId(123));
      store.dispatch(setSelectedPlayerId(456));
      const state = store.getState() as { ui: UIState };
      expect(state.ui.selectedPlayerId).toBe(456);
    });
  });

  describe('setSelectedTabId', () => {
    it('should set tab id to a number', () => {
      store.dispatch(setSelectedTabId(1));
      const state = store.getState() as { ui: UIState };
      expect(state.ui.selectedTabId).toBe(1);
    });

    it('should set tab id to null', () => {
      store.dispatch(setSelectedTabId(1));
      store.dispatch(setSelectedTabId(null));
      const state = store.getState() as { ui: UIState };
      expect(state.ui.selectedTabId).toBeNull();
    });

    it('should handle different tab ids', () => {
      store.dispatch(setSelectedTabId(0));
      let state = store.getState() as { ui: UIState };
      expect(state.ui.selectedTabId).toBe(0);

      store.dispatch(setSelectedTabId(5));
      state = store.getState() as { ui: UIState };
      expect(state.ui.selectedTabId).toBe(5);
    });
  });

  describe('setSelectedTargetIds', () => {
    it('should set target ids to an array', () => {
      store.dispatch(setSelectedTargetIds([789]));
      const state = store.getState() as { ui: UIState };
      expect(state.ui.selectedTargetIds).toEqual([789]);
    });

    it('should set target ids to empty array', () => {
      store.dispatch(setSelectedTargetIds([789]));
      store.dispatch(setSelectedTargetIds([]));
      const state = store.getState() as { ui: UIState };
      expect(state.ui.selectedTargetIds).toEqual([]);
    });

    it('should update target ids correctly', () => {
      store.dispatch(setSelectedTargetIds([100]));
      store.dispatch(setSelectedTargetIds([200]));
      const state = store.getState() as { ui: UIState };
      expect(state.ui.selectedTargetIds).toEqual([200]);
    });
  });

  describe('setShowExperimentalTabs', () => {
    it('should set experimental tabs to true', () => {
      store.dispatch(setShowExperimentalTabs(true));
      const state = store.getState() as { ui: UIState };
      expect(state.ui.showExperimentalTabs).toBe(true);
    });

    it('should set experimental tabs to false', () => {
      store.dispatch(setShowExperimentalTabs(true));
      store.dispatch(setShowExperimentalTabs(false));
      const state = store.getState() as { ui: UIState };
      expect(state.ui.showExperimentalTabs).toBe(false);
    });

    it('should toggle experimental tabs state', () => {
      // Initial state is false
      store.dispatch(setShowExperimentalTabs(true));
      store.dispatch(setShowExperimentalTabs(false));
      store.dispatch(setShowExperimentalTabs(true));
      const state = store.getState() as { ui: UIState };
      expect(state.ui.showExperimentalTabs).toBe(true);
    });
  });

  describe('setSidebarOpen', () => {
    it('should set sidebar open to true', () => {
      store.dispatch(setSidebarOpen(true));
      const state = store.getState() as { ui: UIState };
      expect(state.ui.sidebarOpen).toBe(true);
    });

    it('should set sidebar open to false', () => {
      store.dispatch(setSidebarOpen(true));
      store.dispatch(setSidebarOpen(false));
      const state = store.getState() as { ui: UIState };
      expect(state.ui.sidebarOpen).toBe(false);
    });
  });

  describe('toggleSidebar', () => {
    it('should toggle sidebar from false to true', () => {
      // Initial state has sidebarOpen: false
      store.dispatch(toggleSidebar());
      const state = store.getState() as { ui: UIState };
      expect(state.ui.sidebarOpen).toBe(true);
    });

    it('should toggle sidebar from true to false', () => {
      store.dispatch(setSidebarOpen(true));
      store.dispatch(toggleSidebar());
      const state = store.getState() as { ui: UIState };
      expect(state.ui.sidebarOpen).toBe(false);
    });

    it('should toggle sidebar multiple times correctly', () => {
      const initialState = store.getState() as { ui: UIState };
      const initialSidebarOpen = initialState.ui.sidebarOpen;

      store.dispatch(toggleSidebar());
      store.dispatch(toggleSidebar());

      const finalState = store.getState() as { ui: UIState };
      expect(finalState.ui.sidebarOpen).toBe(initialSidebarOpen);
    });
  });

  describe('multiple actions', () => {
    it('should handle multiple actions affecting different state properties', () => {
      store.dispatch(setDarkMode(false));
      store.dispatch(setSelectedPlayerId(123));
      store.dispatch(setSelectedTabId(2));
      store.dispatch(setShowExperimentalTabs(true));
      store.dispatch(setSidebarOpen(true));

      const state = store.getState() as { ui: UIState };
      expect(state.ui).toEqual({
        darkMode: false,
        selectedPlayerId: 123,
        selectedTabId: 2,
        selectedTargetIds: [],
        showExperimentalTabs: true,
        sidebarOpen: true,
        myReportsPage: 1,
      });
    });

    it('should maintain state consistency when toggling various properties', () => {
      // Set some initial values
      store.dispatch(setSelectedPlayerId(456));
      store.dispatch(setSelectedTargetIds([789]));

      // Toggle some properties
      store.dispatch(toggleDarkMode());
      store.dispatch(toggleSidebar());

      const state = store.getState() as { ui: UIState };

      // Non-toggled values should remain
      expect(state.ui.selectedPlayerId).toBe(456);
      expect(state.ui.selectedTargetIds).toEqual([789]);
      expect(state.ui.showExperimentalTabs).toBe(false); // initial value

      // Toggled values should have changed
      expect(state.ui.darkMode).toBe(false); // toggled from initial true
      expect(state.ui.sidebarOpen).toBe(true); // toggled from initial false
    });
  });
});
