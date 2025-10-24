import { RootState } from '../storeWithHistory';

export const selectParseReportId = (state: RootState): string | null =>
  state.parseAnalysis.reportId;

export const selectParseFightId = (state: RootState): number | null =>
  state.parseAnalysis.fightId;

export const selectParseReportUrl = (state: RootState): string | null =>
  state.parseAnalysis.reportUrl;

export const selectParseReport = (
  state: RootState,
): { reportId: string | null; fightId: number | null; reportUrl: string | null } => ({
  reportId: state.parseAnalysis.reportId,
  fightId: state.parseAnalysis.fightId,
  reportUrl: state.parseAnalysis.reportUrl,
});
