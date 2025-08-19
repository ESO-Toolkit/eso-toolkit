import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface NavigationState {
  reportId: string;
  fightId: number | null;
}

const initialState: NavigationState = {
  reportId: '',
  fightId: null,
};

const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    setReportId(state, action: PayloadAction<string>) {
      state.reportId = action.payload;
    },
    setFightId(state, action: PayloadAction<number | null>) {
      state.fightId = action.payload;
    },
  },
});

export const { setReportId, setFightId } = navigationSlice.actions;
export default navigationSlice.reducer;
