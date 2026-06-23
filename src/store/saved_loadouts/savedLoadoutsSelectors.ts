import type { RootState } from '../storeWithHistory';

export const selectSavedLoadouts = (state: RootState): RootState['savedLoadouts']['loadouts'] =>
  state.savedLoadouts.loadouts;

export const selectSavedLoadoutById =
  (id: string) =>
  (state: RootState): RootState['savedLoadouts']['loadouts'][number] | undefined =>
    state.savedLoadouts.loadouts.find((l) => l.id === id);
