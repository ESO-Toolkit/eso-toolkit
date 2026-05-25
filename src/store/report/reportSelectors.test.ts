import type { FightFragment, ReportFragment } from '../../graphql/gql/graphql';
import {
  selectReportFights,
  selectReportFightsForContext,
  selectReportRegistryEntryForContext,
} from './reportSelectors';
import type { ReportEntry, ReportState } from './reportSlice';
import type { RootState } from '../types';
import { resolveCacheKey } from '../utils/keyedCacheState';

const createFight = (id: number): FightFragment =>
  ({
    __typename: 'Fight',
    id,
  }) as unknown as FightFragment;

const createRegistryEntry = (): ReportEntry => ({
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
  currentRequest: null,
});

const createReportState = (): ReportState => {
  const reportId = 'R-1';
  const registryEntry = createRegistryEntry();
  const reportData = {
    code: reportId,
    fights: [createFight(1), createFight(2)],
  } as unknown as ReportFragment;
  const { key } = resolveCacheKey({ reportCode: reportId });

  return {
    entries: {
      [key]: registryEntry,
    },
    accessOrder: [key],
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
    fightIndexByReport: {
      [reportId]: registryEntry.fightIds,
    },
  };
};

const createRootState = (reportState: ReportState): RootState =>
  ({
    report: reportState,
  }) as unknown as RootState;

describe('report selectors with context helpers', () => {
  it('returns the registry entry for the provided report code', () => {
    const state = createRootState(createReportState());
    const entry = selectReportRegistryEntryForContext(state, {
      reportCode: 'R-1',
      fightId: 2,
    });

    expect(entry?.fightIds).toEqual([1, 2]);
  });

  it('falls back to the active report when context omits the report code', () => {
    const state = createRootState(createReportState());
    const entry = selectReportRegistryEntryForContext(state, {
      reportCode: null,
      fightId: null,
    });

    expect(entry?.fightIds).toEqual([1, 2]);
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
