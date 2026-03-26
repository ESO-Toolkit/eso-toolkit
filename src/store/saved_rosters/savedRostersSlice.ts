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

      // Parse SlotKey format: "tank:0", "healer:1", "dps:3"
      const colonIdx = slotKey.indexOf(':');
      if (colonIdx === -1) return; // Invalid key
      const role = slotKey.slice(0, colonIdx);
      const index = parseInt(slotKey.slice(colonIdx + 1), 10);
      if (role === 'tank' && index >= 0 && index < saved.roster.tanks.length) {
        applyInline(saved.roster.tanks[index]);
      } else if (role === 'healer' && index >= 0 && index < saved.roster.healers.length) {
        applyInline(saved.roster.healers[index]);
      } else if (role === 'dps' && index >= 0 && index < saved.roster.dpsSlots.length) {
        applyInline(saved.roster.dpsSlots[index]);
      }
      saved.savedAt = new Date().toISOString();
    },
  },
});

export const { saveRoster, updateRoster, deleteRoster, attachBuildToSlot } =
  savedRostersSlice.actions;
export default savedRostersSlice.reducer;
