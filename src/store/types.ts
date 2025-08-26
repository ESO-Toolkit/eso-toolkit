// Central type definitions to avoid circular dependencies
// This file should not import from other store files to prevent circular references

// Re-export commonly used types that don't cause circular dependencies
export type { EnhancedStore } from '@reduxjs/toolkit';

// Placeholder for RootState - will be augmented by the main store
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RootState = any; // This will be overridden by module augmentation

// Common dispatch type
export interface AppDispatch {
  <T>(action: T): T;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  <T, R>(asyncAction: (dispatch: AppDispatch) => R): R;
}
