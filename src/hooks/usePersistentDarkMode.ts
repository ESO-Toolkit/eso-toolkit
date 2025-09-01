import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { RootState } from '../store/storeWithHistory';
import { setDarkMode } from '../store/ui/uiSlice';

const DARK_MODE_KEY = 'eso-logs-dark-mode';

// Detect system theme preference
const getSystemThemePreference = (): boolean => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return true;
};

// Get saved preference or system preference
const getSavedDarkModePreference = (): boolean => {
  if (typeof window === 'undefined') return true;

  const saved = localStorage.getItem(DARK_MODE_KEY);
  if (saved !== null) {
    return saved === 'true';
  }

  return getSystemThemePreference();
};

// Save preference to localStorage
const saveDarkModePreference = (darkMode: boolean): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DARK_MODE_KEY, darkMode.toString());
  }
};

interface UsePersistentDarkModeReturn {
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (enabled: boolean) => void;
  syncWithSystem: () => void;
}

export const usePersistentDarkMode = (): UsePersistentDarkModeReturn => {
  const dispatch = useDispatch();
  const darkMode = useSelector((state: RootState) => state.ui.darkMode);

  // Initialize dark mode from localStorage on mount
  useEffect(() => {
    const savedPreference = getSavedDarkModePreference();
    if (savedPreference !== darkMode) {
      dispatch(setDarkMode(savedPreference));
    }
  }, [dispatch, darkMode]);

  // Save to localStorage whenever darkMode changes
  useEffect(() => {
    saveDarkModePreference(darkMode);
  }, [darkMode]);

  return {
    darkMode,
    toggleDarkMode: () => {
      dispatch(setDarkMode(!darkMode));
    },
    setDarkMode: (enabled: boolean) => dispatch(setDarkMode(enabled)),
    syncWithSystem: () => dispatch(setDarkMode(getSystemThemePreference())),
  };
};
