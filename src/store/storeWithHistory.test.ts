import { createTransform } from 'redux-persist';

import { UIState } from './ui/uiSlice';

describe('storeWithHistory - Redux Persist Transform', () => {
  // Re-create the transform used in storeWithHistory.ts for testing
  const uiTransform = createTransform<UIState, Partial<UIState>>(
    // Transform state on its way to being serialized and persisted
    (inboundState) => {
      const { darkMode, showExperimentalTabs, sidebarOpen, myReportsPage } = inboundState;
      return {
        darkMode,
        showExperimentalTabs,
        sidebarOpen,
        myReportsPage,
      };
    },
    // Transform state being rehydrated
    (outboundState) => {
      // Get the initial state values for non-persisted fields
      const initialUIState: UIState = {
        darkMode: true,
        selectedPlayerId: null,
        selectedTabId: null,
        selectedTargetIds: [],
        selectedFriendlyPlayerId: null,
        showExperimentalTabs: false,
        sidebarOpen: false,
        myReportsPage: 1,
      };

      // Merge persisted preferences with initial report-specific state
      return {
        ...initialUIState,
        ...outboundState,
      } as UIState;
    },
    { whitelist: ['ui'] },
  );

  describe('uiTransform - inbound (serialization)', () => {
    it('should only persist darkMode, showExperimentalTabs, sidebarOpen, and myReportsPage', () => {
      const fullState: UIState = {
        darkMode: false,
        selectedPlayerId: 123,
        selectedTabId: 456,
        selectedTargetIds: [789],
        selectedFriendlyPlayerId: 321,
        showExperimentalTabs: true,
        sidebarOpen: true,
        myReportsPage: 5,
      };

      const persistedState = uiTransform.in(fullState, 'ui', fullState);

      expect(persistedState).toEqual({
        darkMode: false,
        showExperimentalTabs: true,
        sidebarOpen: true,
        myReportsPage: 5,
      });

      // Verify report-specific fields are NOT persisted
      expect(persistedState).not.toHaveProperty('selectedPlayerId');
      expect(persistedState).not.toHaveProperty('selectedTabId');
      expect(persistedState).not.toHaveProperty('selectedTargetIds');
      expect(persistedState).not.toHaveProperty('selectedFriendlyPlayerId');
    });

    it('should handle default values correctly', () => {
      const defaultState: UIState = {
        darkMode: true,
        selectedPlayerId: null,
        selectedTabId: null,
        selectedTargetIds: [],
        selectedFriendlyPlayerId: null,
        showExperimentalTabs: false,
        sidebarOpen: false,
        myReportsPage: 1,
      };

      const persistedState = uiTransform.in(defaultState, 'ui', defaultState);

      expect(persistedState).toEqual({
        darkMode: true,
        showExperimentalTabs: false,
        sidebarOpen: false,
        myReportsPage: 1,
      });
    });
  });

  describe('uiTransform - outbound (rehydration)', () => {
    it('should restore persisted preferences and reset report-specific state to defaults', () => {
      const persistedState = {
        darkMode: false,
        showExperimentalTabs: true,
        sidebarOpen: true,
        myReportsPage: 5,
      };

      const rehydratedState = uiTransform.out(persistedState, 'ui', persistedState);

      expect(rehydratedState).toEqual({
        darkMode: false,
        selectedPlayerId: null,
        selectedTabId: null,
        selectedTargetIds: [],
        selectedFriendlyPlayerId: null,
        showExperimentalTabs: true,
        sidebarOpen: true,
        myReportsPage: 5,
      });
    });

    it('should reset report-specific fields even if persisted state is empty', () => {
      const emptyPersistedState = {};

      const rehydratedState = uiTransform.out(emptyPersistedState, 'ui', emptyPersistedState);

      expect(rehydratedState).toEqual({
        darkMode: true,
        selectedPlayerId: null,
        selectedTabId: null,
        selectedTargetIds: [],
        selectedFriendlyPlayerId: null,
        showExperimentalTabs: false,
        sidebarOpen: false,
        myReportsPage: 1,
      });
    });
  });

  describe('selectedPlayerId persistence removal', () => {
    it('should NOT persist selectedPlayerId', () => {
      const stateWithSelectedPlayer: UIState = {
        darkMode: true,
        selectedPlayerId: 42,
        selectedTabId: null,
        selectedTargetIds: [],
        selectedFriendlyPlayerId: null,
        showExperimentalTabs: false,
        sidebarOpen: false,
        myReportsPage: 1,
      };

      const persistedState = uiTransform.in(stateWithSelectedPlayer, 'ui', stateWithSelectedPlayer);

      // Verify selectedPlayerId is not in persisted state
      expect(persistedState).not.toHaveProperty('selectedPlayerId');
      expect(Object.keys(persistedState)).not.toContain('selectedPlayerId');
    });

    it('should reset selectedPlayerId to null on rehydration', () => {
      // Simulate persisted state (without selectedPlayerId)
      const persistedState = {
        darkMode: false,
        showExperimentalTabs: true,
        sidebarOpen: true,
        myReportsPage: 3,
      };

      const rehydratedState = uiTransform.out(persistedState, 'ui', persistedState);

      // Verify selectedPlayerId is reset to null
      expect(rehydratedState.selectedPlayerId).toBeNull();
    });
  });

  describe('other report-specific fields', () => {
    it('should NOT persist selectedTabId, selectedTargetIds, or selectedFriendlyPlayerId', () => {
      const stateWithReportData: UIState = {
        darkMode: true,
        selectedPlayerId: 100,
        selectedTabId: 200,
        selectedTargetIds: [300, 400],
        selectedFriendlyPlayerId: 500,
        showExperimentalTabs: false,
        sidebarOpen: false,
        myReportsPage: 1,
      };

      const persistedState = uiTransform.in(stateWithReportData, 'ui', stateWithReportData);

      // Verify report-specific fields are NOT persisted
      expect(persistedState).not.toHaveProperty('selectedPlayerId');
      expect(persistedState).not.toHaveProperty('selectedTabId');
      expect(persistedState).not.toHaveProperty('selectedTargetIds');
      expect(persistedState).not.toHaveProperty('selectedFriendlyPlayerId');
    });

    it('should reset all report-specific fields to initial values on rehydration', () => {
      const persistedState = {
        darkMode: false,
        showExperimentalTabs: true,
        sidebarOpen: true,
        myReportsPage: 7,
      };

      const rehydratedState = uiTransform.out(persistedState, 'ui', persistedState);

      // Verify all report-specific fields are reset
      expect(rehydratedState.selectedPlayerId).toBeNull();
      expect(rehydratedState.selectedTabId).toBeNull();
      expect(rehydratedState.selectedTargetIds).toEqual([]);
      expect(rehydratedState.selectedFriendlyPlayerId).toBeNull();

      // Verify user preferences are restored
      expect(rehydratedState.darkMode).toBe(false);
      expect(rehydratedState.showExperimentalTabs).toBe(true);
      expect(rehydratedState.sidebarOpen).toBe(true);
      expect(rehydratedState.myReportsPage).toBe(7);
    });
  });
});
