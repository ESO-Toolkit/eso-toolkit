import { renderHook } from '@testing-library/react';

import { useReplayNavigation } from './useReplayNavigation';

const mockNavigate = jest.fn();
let mockReportId: string | undefined = 'rep123';
let mockQuery = '';

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams(mockQuery)],
}));
jest.mock('../../../hooks/useReportFightParams', () => ({
  useReportFightParams: () => ({ reportId: mockReportId, fightId: '1' }),
}));

beforeEach(() => {
  mockNavigate.mockClear();
  mockReportId = 'rep123';
  mockQuery = '';
});

describe('useReplayNavigation', () => {
  it('preserves draft previews across fights without carrying actor selection or the old time', () => {
    mockQuery = 'draftModels=1&actorId=46&time=9000';
    const { result } = renderHook(() => useReplayNavigation());
    result.current.goToFight('9');
    expect(mockNavigate).toHaveBeenCalledWith('/report/rep123/fight/9/replay?draftModels=1', {
      replace: false,
    });
  });

  it('requires the explicit draft opt-in value', () => {
    mockQuery = 'draftModels=0';
    const { result } = renderHook(() => useReplayNavigation());
    result.current.goToFight('9');
    expect(mockNavigate).toHaveBeenCalledWith('/report/rep123/fight/9/replay', { replace: false });
  });
  it('navigates to the replay route for the chosen fight (no time = start from top)', () => {
    const { result } = renderHook(() => useReplayNavigation());
    result.current.goToFight('7');
    expect(mockNavigate).toHaveBeenCalledWith('/report/rep123/fight/7/replay', { replace: false });
  });

  it('includes a time param when resuming a deep link', () => {
    const { result } = renderHook(() => useReplayNavigation());
    result.current.goToFight(7, { time: 12345.6 });
    expect(mockNavigate).toHaveBeenCalledWith('/report/rep123/fight/7/replay?time=12346', {
      replace: false,
    });
  });

  it('supports replacing the history entry', () => {
    const { result } = renderHook(() => useReplayNavigation());
    result.current.goToFight('7', { replace: true });
    expect(mockNavigate).toHaveBeenCalledWith('/report/rep123/fight/7/replay', { replace: true });
  });

  it('canonicalizes an explicit zero time instead of dropping it', () => {
    const { result } = renderHook(() => useReplayNavigation());
    result.current.goToFight('7', { time: 0 });
    expect(mockNavigate).toHaveBeenCalledWith('/report/rep123/fight/7/replay?time=0', {
      replace: false,
    });
  });

  it('drops non-finite or negative times', () => {
    const { result } = renderHook(() => useReplayNavigation());
    result.current.goToFight('7', { time: NaN });
    result.current.goToFight('8', { time: -500 });
    expect(mockNavigate).toHaveBeenNthCalledWith(1, '/report/rep123/fight/7/replay', {
      replace: false,
    });
    expect(mockNavigate).toHaveBeenNthCalledWith(2, '/report/rep123/fight/8/replay', {
      replace: false,
    });
  });

  it('is a no-op without a report id', () => {
    mockReportId = undefined;
    const { result } = renderHook(() => useReplayNavigation());
    expect(result.current.canNavigate).toBe(false);
    result.current.goToFight('7');
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
