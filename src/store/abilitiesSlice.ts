import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { AbilitiesLookup } from '../types/abilities';

interface AbilitiesState {
  abilities: AbilitiesLookup;
}

const initialState: AbilitiesState = {
  abilities: {},
};

const abilitiesSlice = createSlice({
  name: 'abilities',
  initialState,
  reducers: {
    setAbilities(state, action: PayloadAction<AbilitiesLookup>) {
      state.abilities = action.payload;
    },
    clearAbilities(state) {
      state.abilities = {};
    },
  },
});

export const { setAbilities, clearAbilities } = abilitiesSlice.actions;
export default abilitiesSlice.reducer;
