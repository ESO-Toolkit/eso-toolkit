import { RootState } from '../storeWithHistory';

// ABILITIES SELECTORS - Read from abilities slice

export const selectAbilities = (state: RootState) => state.abilities.abilities;
