export { saveBuild, updateSavedBuild, deleteSavedBuild } from './savedBuildsSlice';
export { default as savedBuildsReducer } from './savedBuildsSlice';
export type { SavedBuild } from './savedBuildsSlice';

import type { RootState } from '../storeWithHistory';

export const selectSavedBuilds = (state: RootState): import('./savedBuildsSlice').SavedBuild[] =>
  state.savedBuilds.builds;

export const selectSavedBuildById =
  (id: string) =>
  (state: RootState): import('./savedBuildsSlice').SavedBuild | undefined =>
    state.savedBuilds.builds.find((b) => b.id === id);
