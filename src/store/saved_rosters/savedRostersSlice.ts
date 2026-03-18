import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { RaidRoster, BuildReference } from '../../types/roster';
import type { SlotInlineData } from '../../utils/rosterBuildBridge';

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
        inlineData?: SlotInlineData;
      }>,
    ) {
      const saved = state.rosters.find((r) => r.id === action.payload.rosterId);
      if (!saved) return;
      const { slotKey, buildRef, inlineData } = action.payload;
      const ref = buildRef ?? undefined;

      const applyInline = (slot: { buildRef?: BuildReference } & SlotInlineData): void => {
        slot.buildRef = ref;
        if (inlineData) {
          if (inlineData.skills !== undefined) slot.skills = inlineData.skills;
          if (inlineData.cpPoints !== undefined) slot.cpPoints = inlineData.cpPoints;
          if (inlineData.food !== undefined) slot.food = inlineData.food;
          if (inlineData.passives !== undefined) slot.passives = inlineData.passives;
        }
      };

      if (slotKey === 'tank1') applyInline(saved.roster.tank1);
      else if (slotKey === 'tank2') applyInline(saved.roster.tank2);
      else if (slotKey === 'healer1') applyInline(saved.roster.healer1);
      else if (slotKey === 'healer2') applyInline(saved.roster.healer2);
      else if (slotKey.startsWith('dps')) {
        const idx = parseInt(slotKey.slice(3), 10) - 1;
        if (idx >= 0 && idx < 8) {
          applyInline(saved.roster.dpsSlots[idx]);
        }
      }
      saved.savedAt = new Date().toISOString();
    },
  },
});

export const { saveRoster, updateRoster, deleteRoster, attachBuildToSlot } =
  savedRostersSlice.actions;
export default savedRostersSlice.reducer;
