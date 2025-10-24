import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ParseAnalysisState {
  reportId: string | null;
  fightId: number | null;
  reportUrl: string | null;
}

const initialState: ParseAnalysisState = {
  reportId: null,
  fightId: null,
  reportUrl: null,
};

const parseAnalysisSlice = createSlice({
  name: 'parseAnalysis',
  initialState,
  reducers: {
    setParseReport: (
      state,
      action: PayloadAction<{ reportId: string; fightId: number; reportUrl: string }>,
    ) => {
      state.reportId = action.payload.reportId;
      state.fightId = action.payload.fightId;
      state.reportUrl = action.payload.reportUrl;
    },
    clearParseReport: (state) => {
      state.reportId = null;
      state.fightId = null;
      state.reportUrl = null;
    },
  },
});

export const { setParseReport, clearParseReport } = parseAnalysisSlice.actions;
export default parseAnalysisSlice.reducer;
