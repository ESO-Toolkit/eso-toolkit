import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { RaidRoster } from '../../types/roster';

export interface SavedRoster {
  id: string;
  savedAt: string;
  roster: RaidRoster;
}

interface SavedRostersState {
  rosters: SavedRoster[];
}

const initialState: SavedRostersState = {
  rosters: [],
};

const savedRostersSlice = createSlice({
  name: 'savedRosters',
  initialState,
  reducers: {
    saveRoster: {
      reducer(state, action: PayloadAction<SavedRoster>) {
        state.rosters.unshift(action.payload);
      },
      prepare(roster: RaidRoster) {
        return {
          payload: {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            savedAt: new Date().toISOString(),
            roster,
          },
        };
      },
    },
    updateRoster(state, action: PayloadAction<{ id: string; roster: RaidRoster }>) {
      const idx = state.rosters.findIndex((r) => r.id === action.payload.id);
      if (idx !== -1) {
        state.rosters[idx] = {
          ...state.rosters[idx],
          savedAt: new Date().toISOString(),
          roster: action.payload.roster,
        };
      }
    },
    deleteRoster(state, action: PayloadAction<string>) {
      state.rosters = state.rosters.filter((r) => r.id !== action.payload);
    },
  },
});

export const { saveRoster, updateRoster, deleteRoster } = savedRostersSlice.actions;
export default savedRostersSlice.reducer;
