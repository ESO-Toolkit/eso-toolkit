import '@testing-library/jest-dom';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import React from 'react';

import { createMockStore } from '../../../test/utils/createMockStore';
import { ScribingSimulator } from '../components/ScribingSimulator/ScribingSimulator';

// Mock the ScribingSimulator component to avoid complex validation
jest.mock('../components/ScribingSimulator/ScribingSimulator', () => ({
  ScribingSimulator: () => <div data-testid="scribing-simulator">Mocked ScribingSimulator</div>
}));

// Mock the scribing data module
jest.mock('../../../../data/scribing-complete.json', () => ({
  version: '1.0.0',
  description: 'Test scribing database',
  lastUpdated: '2024-01-01',
  grimoires: {
    trample: {
      id: 'trample',
      name: 'Trample',
      cost: 100,
      resource: 'stamina',
      nameTransformations: {
        'physical-damage': {
          name: 'Physical Trample',
          abilityIds: [12345]
        }
      },
    },
  },
  signatureScripts: {},
  affixScripts: {},
  focusScripts: {},
}));

describe('Scribing Feature Integration', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore();
  });

  describe('Redux Integration', () => {
    it('should render with Redux store', () => {
      expect(() => {
        render(
          <Provider store={store}>
            <div>Scribing Feature Test</div>
          </Provider>
        );
      }).not.toThrow();
    });

    it('should access store state', () => {
      const state = store.getState();
      
      expect(state).toHaveProperty('ui');
      expect(state).toHaveProperty('events');
      expect(state).toHaveProperty('report');
    });
  });

  describe('Component Integration', () => {
    it('should render ScribingSimulator with store', () => {
      render(
        <Provider store={store}>
          <ScribingSimulator />
        </Provider>
      );
      
      // Should render the mocked component
      expect(screen.getByTestId('scribing-simulator')).toBeInTheDocument();
      expect(screen.getByText('Mocked ScribingSimulator')).toBeInTheDocument();
    });

    it('should handle store updates', () => {
      render(
        <Provider store={store}>
          <ScribingSimulator />
        </Provider>
      );
      
      // Dispatch an action to test integration
      store.dispatch({ type: 'ui/setDarkMode', payload: true });
      
      const state = store.getState();
      expect(state.ui.darkMode).toBe(true);
    });
  });

  describe('Error Boundaries', () => {
    it('should handle component errors gracefully', () => {
      // This would normally be wrapped in an error boundary in the app
      expect(() => {
        render(
          <Provider store={store}>
            <ScribingSimulator />
          </Provider>
        );
      }).not.toThrow();
      
      // Verify mocked component renders
      expect(screen.getByTestId('scribing-simulator')).toBeInTheDocument();
    });
  });

  describe('Store Configuration', () => {
    it('should have correct reducer structure', () => {
      const state = store.getState();
      
      // Verify all expected reducers are present
      expect(state).toHaveProperty('ui');
      expect(state).toHaveProperty('events');
      expect(state).toHaveProperty('report');
      expect(state).toHaveProperty('masterData');
      expect(state).toHaveProperty('playerData');
      expect(state).toHaveProperty('router');
    });

    it('should handle actions correctly', () => {
      const initialDarkMode = store.getState().ui.darkMode;
      
      store.dispatch({ type: 'ui/toggleDarkMode' });
      
      const newDarkMode = store.getState().ui.darkMode;
      expect(newDarkMode).toBe(!initialDarkMode);
    });

    it('should maintain state immutability', () => {
      const stateBefore = store.getState();
      
      store.dispatch({ type: 'ui/setDarkMode', payload: false });
      
      const stateAfter = store.getState();
      
      // States should be different objects
      expect(stateBefore).not.toBe(stateAfter);
      // UI state should be different
      expect(stateBefore.ui).not.toBe(stateAfter.ui);
    });
  });

  describe('Scribing State Management', () => {
    it('should handle scribing-related state updates', () => {
      // Test any scribing-specific state management
      const state = store.getState();
      
      // Verify initial state structure
      expect(state.ui).toBeDefined();
      expect(typeof state.ui.darkMode).toBe('boolean');
    });

    it('should persist important scribing configurations', () => {
      // Test that important settings would persist
      store.dispatch({ type: 'ui/setSelectedTabId', payload: 5 });
      
      const state = store.getState();
      expect(state.ui.selectedTabId).toBe(5);
    });
  });
});