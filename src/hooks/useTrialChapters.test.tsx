import { renderHook } from '@testing-library/react';

import type { FightFragment, ReportFragment } from '../graphql/gql/graphql';

import { useTrialChapters } from './useTrialChapters';

// Configurable mock values for the data dependencies.
let mockReportData: ReportFragment | null = null;
let mockIsReportLoading = false;
let mockFightId: string | undefined;
let mockFight: FightFragment | undefined;

jest.mock('./useReportData', () => ({
  useReportData: () => ({ reportData: mockReportData, isReportLoading: mockIsReportLoading }),
}));
jest.mock('./useReportFightParams', () => ({
  useReportFightParams: () => ({ reportId: 'abc', fightId: mockFightId }),
}));
jest.mock('./useCurrentFight', () => ({
  useCurrentFight: () => ({ fight: mockFight, isFightLoading: false }),
}));

const makeFight = (overrides: Partial<FightFragment> = {}): FightFragment =>
  ({
    id: 1,
    name: 'Boss',
    difficulty: 121,
    startTime: 0,
    endTime: 120000,
    kill: true,
    bossPercentage: 0,
    encounterID: 1,
    ...overrides,
  }) as FightFragment;

const reportWith = (fights: FightFragment[]): ReportFragment =>
  ({ zone: { name: 'Rockgrove' }, fights }) as ReportFragment;

beforeEach(() => {
  mockReportData = null;
  mockIsReportLoading = false;
  mockFightId = undefined;
  mockFight = undefined;
});

describe('useTrialChapters', () => {
  it('returns empty results when there is no report data', () => {
    const { result } = renderHook(() => useTrialChapters());
    expect(result.current.runs).toEqual([]);
    expect(result.current.chapters).toEqual([]);
    expect(result.current.currentIndex).toBe(-1);
    expect(result.current.currentChapter).toBeNull();
  });

  it('resolves the current chapter and its neighbours', () => {
    const fights = [
      makeFight({ id: 1, name: 'Oaxiltso', startTime: 0, endTime: 60000 }),
      makeFight({ id: 2, name: 'Xalvakka', startTime: 70000, endTime: 200000 }),
      makeFight({ id: 3, name: 'Bahsei', startTime: 210000, endTime: 400000 }),
    ];
    mockReportData = reportWith(fights);
    mockFightId = '2';
    mockFight = fights[1];

    const { result } = renderHook(() => useTrialChapters());

    expect(result.current.chapters).toHaveLength(3);
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.currentChapter?.name).toBe('Xalvakka');
    expect(result.current.prevChapter?.name).toBe('Oaxiltso');
    expect(result.current.nextChapter?.name).toBe('Bahsei');
  });

  it('has no prev at the start and no next at the end of the run', () => {
    const fights = [
      makeFight({ id: 1, name: 'Oaxiltso', startTime: 0, endTime: 60000 }),
      makeFight({ id: 2, name: 'Xalvakka', startTime: 70000, endTime: 200000 }),
    ];
    mockReportData = reportWith(fights);
    mockFightId = '1';
    mockFight = fights[0];

    const { result } = renderHook(() => useTrialChapters());

    expect(result.current.prevChapter).toBeNull();
    expect(result.current.nextChapter?.name).toBe('Xalvakka');
  });

  it('locates the run by time span when the active fight is trash', () => {
    const fights = [
      makeFight({ id: 1, name: 'Oaxiltso', startTime: 0, endTime: 60000 }),
      makeFight({ id: 2, name: 'Xalvakka', startTime: 100000, endTime: 200000 }),
      makeFight({ id: 9, name: 'Trash', difficulty: null, startTime: 80000, endTime: 90000 }),
    ];
    mockReportData = reportWith(fights);
    mockFightId = '9';
    mockFight = fights[2];

    const { result } = renderHook(() => useTrialChapters());

    expect(result.current.currentRun?.trialName).toBe('Rockgrove');
    expect(result.current.currentIndex).toBe(-1);
    expect(result.current.currentChapter).toBeNull();
    expect(result.current.chapters).toHaveLength(2);
  });

  it('passes through the report loading state', () => {
    mockIsReportLoading = true;
    const { result } = renderHook(() => useTrialChapters());
    expect(result.current.isLoading).toBe(true);
  });
});
