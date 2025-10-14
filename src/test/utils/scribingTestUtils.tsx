/**
 * Test utilities for scribing-related tests
 * Provides mock setup for useScribingDetection and related event hooks
 */

import { CssBaseline } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { Provider } from 'react-redux';

// Mock all event hooks that useScribingDetection depends on
export function mockAllEventHooks(): void {
  jest.mock('../../hooks/events/useDamageEvents', () => ({
    useDamageEvents: jest.fn(() => ({
      damageEvents: [],
      isDamageEventsLoading: false,
      selectedFight: null,
    })),
  }));

  jest.mock('../../hooks/events/useHealingEvents', () => ({
    useHealingEvents: jest.fn(() => ({
      healingEvents: [],
      isHealingEventsLoading: false,
      selectedFight: null,
    })),
  }));

  jest.mock('../../hooks/events/useFriendlyBuffEvents', () => ({
    useFriendlyBuffEvents: jest.fn(() => ({
      friendlyBuffEvents: [],
      isFriendlyBuffEventsLoading: false,
      selectedFight: null,
    })),
  }));

  jest.mock('../../hooks/events/useHostileBuffEvents', () => ({
    useHostileBuffEvents: jest.fn(() => ({
      hostileBuffEvents: [],
      isHostileBuffEventsLoading: false,
      selectedFight: null,
    })),
  }));

  jest.mock('../../hooks/events/useDebuffEvents', () => ({
    useDebuffEvents: jest.fn(() => ({
      debuffEvents: [],
      isDebuffEventsLoading: false,
      selectedFight: null,
    })),
  }));

  jest.mock('../../hooks/events/useCastEvents', () => ({
    useCastEvents: jest.fn(() => ({
      castEvents: [],
      isCastEventsLoading: false,
      selectedFight: null,
    })),
  }));

  jest.mock('../../hooks/events/useResourceEvents', () => ({
    useResourceEvents: jest.fn(() => ({
      resourceEvents: [],
      isResourceEventsLoading: false,
      selectedFight: null,
    })),
  }));
}

// Create a standard test wrapper with theme
const theme = createTheme({
  palette: {
    mode: 'dark',
  },
});

export const ThemeTestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    {children}
  </ThemeProvider>
);

// Create a Redux store for testing
export function createTestStore(initialState = {}): ReturnType<typeof configureStore> {
  return configureStore({
    reducer: {
      filters: () => ({
        friendlyBuffEvents: [],
        hostileBuffEvents: [],
        debuffEvents: [],
        damageEvents: [],
        healingEvents: [],
        castEvents: [],
        resourceEvents: [],
        ...initialState,
      }),
    },
  });
}

// Combined wrapper with Redux + Theme
export function createReduxThemeWrapper(
  store?: ReturnType<typeof createTestStore>,
): React.FC<{ children: React.ReactNode }> {
  const testStore = store || createTestStore();

  const ReduxThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Provider store={testStore}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </Provider>
  );

  ReduxThemeWrapper.displayName = 'ReduxThemeWrapper';

  return ReduxThemeWrapper;
}

// Mock useSkillScribingData hook with standard return
export function mockUseSkillScribingData(): jest.Mock {
  return jest.fn(() => ({
    scribedSkillData: null,
    loading: false,
    error: null,
  }));
}
