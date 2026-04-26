import type { RootState } from '../storeWithHistory';

export const selectSavedRosters = (state: RootState): RootState['savedRosters']['rosters'] =>
  state.savedRosters.rosters;

export const selectSavedRosterById =
  (id: string) =>
  (state: RootState): RootState['savedRosters']['rosters'][number] | undefined =>
    state.savedRosters.rosters.find((r) => r.id === id);
