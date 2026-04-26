import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

import type { Build } from '../../features/build-editor/types/build.types';

export interface SavedBuild {
  id: string;
  savedAt: string;
  build: Build;
}

interface SavedBuildsState {
  builds: SavedBuild[];
}

const initialState: SavedBuildsState = {
  builds: [],
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
    deleteSavedBuild(state, action: PayloadAction<string>) {
      state.builds = state.builds.filter((b) => b.id !== action.payload);
    },
  },
});

export const { saveBuild, updateSavedBuild, deleteSavedBuild } = savedBuildsSlice.actions;
export default savedBuildsSlice.reducer;
