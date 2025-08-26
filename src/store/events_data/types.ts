// Events store types to avoid circular dependencies with main store
// This file should not import anything from storeWithHistory or other store files

// Generic async thunk config for events that doesn't rely on RootState
export interface EventsAsyncThunkConfig {
  rejectValue: string;
}
