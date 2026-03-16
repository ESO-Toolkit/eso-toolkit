import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { RaidRoster, BuildReference } from '../../types/roster';

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
    attachBuildToSlot(
      state,
      action: PayloadAction<{
        rosterId: string;
        slotKey: string;
        buildRef: BuildReference | null;
      }>,
    ) {
      const saved = state.rosters.find((r) => r.id === action.payload.rosterId);
      if (!saved) return;
      const { slotKey, buildRef } = action.payload;
      const ref = buildRef ?? undefined;
      if (slotKey === 'tank1') saved.roster.tank1.buildRef = ref;
      else if (slotKey === 'tank2') saved.roster.tank2.buildRef = ref;
      else if (slotKey === 'healer1') saved.roster.healer1.buildRef = ref;
      else if (slotKey === 'healer2') saved.roster.healer2.buildRef = ref;
      else if (slotKey.startsWith('dps')) {
        const idx = parseInt(slotKey.slice(3), 10) - 1;
        if (idx >= 0 && idx < 8) {
          saved.roster.dpsSlots[idx].buildRef = ref;
        }
      }
      saved.savedAt = new Date().toISOString();
    },
  },
});

export const { saveRoster, updateRoster, deleteRoster, attachBuildToSlot } =
  savedRostersSlice.actions;
export default savedRostersSlice.reducer;
