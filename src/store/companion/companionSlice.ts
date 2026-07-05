import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { CompanionSnapshot } from '@/features/loadout-manager/utils/esotkCompanionParser';
import type { RootState } from '@/store/storeWithHistory';

/** Upload-status metadata for the companion-file picker (mirrors the old PlayersPanel state). */
export interface CompanionUploadMeta {
  fileName?: string;
  snapshotCount: number;
  error?: string;
}

export interface CompanionState {
  /**
   * Snapshots parsed from the most recently uploaded ESOTK Companion file. Ephemeral, not
   * persisted. Lifted out of PlayersPanel so the crit-damage graph (a separate component
   * tree) can read them; matching is name + time scoped, so a file left over from another
   * report simply yields no matches.
   */
  snapshots: CompanionSnapshot[];
  upload: CompanionUploadMeta;
}

const initialState: CompanionState = {
  snapshots: [],
  upload: { snapshotCount: 0 },
};

const companionSlice = createSlice({
  name: 'companion',
  initialState,
  reducers: {
    companionSnapshotsUploaded: (
      state,
      action: PayloadAction<{
        snapshots: CompanionSnapshot[];
        fileName?: string;
        snapshotCount: number;
        error?: string;
      }>,
    ) => {
      const { snapshots, fileName, snapshotCount, error } = action.payload;
      state.snapshots = snapshots;
      state.upload = { fileName, snapshotCount, error };
    },
    companionCleared: () => ({
      snapshots: [],
      upload: { snapshotCount: 0 },
    }),
  },
});

export const { companionSnapshotsUploaded, companionCleared } = companionSlice.actions;

export const selectCompanionSnapshots = (state: RootState): CompanionSnapshot[] =>
  state.companion.snapshots;
export const selectCompanionUpload = (state: RootState): CompanionUploadMeta =>
  state.companion.upload;

export default companionSlice.reducer;
