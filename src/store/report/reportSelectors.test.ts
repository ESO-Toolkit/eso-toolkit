import type { FightFragment, ReportFragment } from '../../graphql/gql/graphql';
import {
  selectReportFights,
  selectReportFightsForContext,
  selectReportRegistryEntryForContext,
} from './reportSelectors';
import type { ReportRegistryEntry, ReportState } from './reportSlice';
import type { RootState } from '../types';

const createFight = (id: number): FightFragment => ({
  __typename: 'Fight',
  id,
} as unknown as FightFragment);

const createRegistryEntry = (reportId: string): ReportRegistryEntry => ({
  reportId,
  data: null,
  status: 'succeeded',
  error: null,
  fightsById: {
    1: createFight(1),
    2: createFight(2),
  },
  fightIds: [1, 2],
  cacheMetadata: {
    lastFetchedTimestamp: Date.now(),
  },
});

const createReportState = (): ReportState => {
  const reportId = 'R-1';
  const registryEntry = createRegistryEntry(reportId);
  const reportData = {
    code: reportId,
    fights: [createFight(1), createFight(2)],
  } as unknown as ReportFragment;

  return {
    reportId,
    data: reportData,
    loading: false,
    error: null,
    cacheMetadata: {
      lastFetchedReportId: reportId,
      lastFetchedTimestamp: Date.now(),
    },
    activeContext: {
      reportId,
      fightId: 1,
    },
    reportsById: {
      [reportId]: registryEntry,
    },
    fightIndexByReport: {
      [reportId]: registryEntry.fightIds,
    },
  };
};

const createRootState = (reportState: ReportState): RootState =>
  ({
    report: reportState,
  } as unknown as RootState);

describe('report selectors with context helpers', () => {
  it('returns the registry entry for the provided report code', () => {
    const state = createRootState(createReportState());
    const entry = selectReportRegistryEntryForContext(state, {
      reportCode: 'R-1',
      fightId: 2,
    });

    expect(entry?.reportId).toBe('R-1');
  });

  it('falls back to the active report when context omits the report code', () => {
    const state = createRootState(createReportState());
    const entry = selectReportRegistryEntryForContext(state, {
      reportCode: null,
      fightId: null,
    });

    expect(entry?.reportId).toBe('R-1');
  });

  it('returns fights for the provided context', () => {
    const state = createRootState(createReportState());

    const fights = selectReportFightsForContext(state, {
      reportCode: 'R-1',
      fightId: 2,
    });

    expect(fights?.map((fight) => fight?.id)).toEqual([1, 2]);
  });

  it('selectReportFights uses the active context', () => {
    const state = createRootState(createReportState());

    const fights = selectReportFights(state);

    expect(fights?.map((fight) => fight?.id)).toEqual([1, 2]);
  });
});
