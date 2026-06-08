import { renderHook } from '@testing-library/react';

import { useReplayNavigation } from './useReplayNavigation';

const mockNavigate = jest.fn();
let mockReportId: string | undefined = 'rep123';

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));
jest.mock('../../../hooks/useReportFightParams', () => ({
  useReportFightParams: () => ({ reportId: mockReportId, fightId: '1' }),
}));

beforeEach(() => {
  mockNavigate.mockClear();
  mockReportId = 'rep123';
});

describe('useReplayNavigation', () => {
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

  it('is a no-op without a report id', () => {
    mockReportId = undefined;
    const { result } = renderHook(() => useReplayNavigation());
    expect(result.current.canNavigate).toBe(false);
    result.current.goToFight('7');
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
