import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

import type { Build } from '../../features/build-editor/types/build.types';

export interface SavedBuild {
  id: string;
  savedAt: string;
  build: Build;
}

export interface SavedBuildsState {
  builds: SavedBuild[];
  /** True once this browser session has loaded the IndexedDB library. */
  hydrated: boolean;
}

export interface UpsertSavedBuildPayload {
  /** Existing saved-build id. Omit to create a new saved build. */
  id?: string;
  build: Build;
}

const initialState: SavedBuildsState = {
  builds: [],
  hydrated: false,
};

const savedBuildsSlice = createSlice({
  name: 'savedBuilds',
  initialState,
  reducers: {
    saveBuild: {
      reducer(state, action: PayloadAction<SavedBuild>) {
        state.builds.unshift(action.payload);
      },
      prepare(build: Build) {
        return {
          payload: {
            id: uuidv4(),
            savedAt: new Date().toISOString(),
            build,
          },
        };
      },
    },
    updateSavedBuild(state, action: PayloadAction<{ id: string; build: Build }>) {
      const idx = state.builds.findIndex((b) => b.id === action.payload.id);
      if (idx !== -1) {
        state.builds[idx] = {
          ...state.builds[idx],
          savedAt: new Date().toISOString(),
          build: action.payload.build,
        };
      }
    },
    upsertSavedBuild: {
      reducer(state, action: PayloadAction<SavedBuild>) {
        const idx = state.builds.findIndex((saved) => saved.id === action.payload.id);
        if (idx === -1) {
          state.builds.unshift(action.payload);
          return;
        }
        state.builds[idx] = action.payload;
      },
      prepare({ id, build }: UpsertSavedBuildPayload) {
        return {
          payload: {
            id: id ?? uuidv4(),
            savedAt: new Date().toISOString(),
            build,
          },
        };
      },
    },
    deleteSavedBuild(state, action: PayloadAction<string>) {
      state.builds = state.builds.filter((b) => b.id !== action.payload);
    },
    clearSavedBuilds(state) {
      state.builds = [];
      // Keep hydration false so a cleanup fence can be retried when the next
      // build route mounts. The empty in-memory library remains fail-closed.
      state.hydrated = false;
    },
    hydrateSavedBuilds(state, action: PayloadAction<SavedBuild[]>) {
      state.builds = action.payload;
      state.hydrated = true;
    },
  },
});

export const {
  saveBuild,
  updateSavedBuild,
  upsertSavedBuild,
  deleteSavedBuild,
  clearSavedBuilds,
  hydrateSavedBuilds,
} = savedBuildsSlice.actions;
export default savedBuildsSlice.reducer;
