import { renderHook } from '@testing-library/react';

import { usePenetrationDataTask } from './usePenetrationDataTask';

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@/store/worker_results', () => ({
  executePenetrationDataTask: jest.fn(),
}));

jest.mock('../events/useCastEvents', () => ({
  useCastEvents: jest.fn(),
}));

jest.mock('../events/useCombatantInfoRecord', () => ({
  useCombatantInfoRecord: jest.fn(),
}));

jest.mock('../events/useDamageEvents', () => ({
  useDamageEvents: jest.fn(),
}));

jest.mock('../usePlayerData', () => ({
  usePlayerData: jest.fn(),
}));

jest.mock('../useSelectedTargetIds', () => ({
  hasNoResolvedTargets: (targetIds: ReadonlySet<number>) => targetIds.has(-3),
  useSelectedTargetIds: jest.fn(),
}));

jest.mock('./useBuffLookupTask', () => ({
  useBuffLookupTask: jest.fn(),
}));

jest.mock('./useDebuffLookupTask', () => ({
  useDebuffLookupTask: jest.fn(),
}));

jest.mock('./useWorkerTaskDependencies', () => ({
  useWorkerTaskDependencies: jest.fn(),
}));

const { useSelector } = jest.requireMock('react-redux');
const { executePenetrationDataTask } = jest.requireMock('@/store/worker_results');
const { useCastEvents } = jest.requireMock('../events/useCastEvents');
const { useCombatantInfoRecord } = jest.requireMock('../events/useCombatantInfoRecord');
const { useDamageEvents } = jest.requireMock('../events/useDamageEvents');
const { usePlayerData } = jest.requireMock('../usePlayerData');
const { useSelectedTargetIds } = jest.requireMock('../useSelectedTargetIds');
const { useBuffLookupTask } = jest.requireMock('./useBuffLookupTask');
const { useDebuffLookupTask } = jest.requireMock('./useDebuffLookupTask');
const { useWorkerTaskDependencies } = jest.requireMock('./useWorkerTaskDependencies');

describe('usePenetrationDataTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockReturnValue({ abort: jest.fn() });
    useWorkerTaskDependencies.mockReturnValue({ dispatch: mockDispatch, selectedFight: { id: 1 } });
    usePlayerData.mockReturnValue({ playerData: { playersById: {} }, isPlayerDataLoading: false });
    useCombatantInfoRecord.mockReturnValue({
      combatantInfoRecord: {},
      isCombatantInfoEventsLoading: false,
    });
    useBuffLookupTask.mockReturnValue({ buffLookupData: {}, isBuffLookupLoading: false });
    useDebuffLookupTask.mockReturnValue({ debuffLookupData: {}, isDebuffLookupLoading: false });
    useDamageEvents.mockReturnValue({ damageEvents: [{}], isDamageEventsLoading: false });
    useCastEvents.mockReturnValue({ castEvents: [], isCastEventsLoaded: true });
    useSelectedTargetIds.mockReturnValue(new Set([-3]));
    useSelector
      .mockReturnValueOnce({ retainedResult: true })
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(50);
  });

  it('does not dispatch or expose retained metrics when the resolved target scope has no targets', () => {
    const { result } = renderHook(() => usePenetrationDataTask());

    expect(executePenetrationDataTask).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(result.current.penetrationData).toBeNull();
    expect(result.current.isPenetrationDataLoading).toBe(false);
  });

  it('reads every report dependency from the supplied context', () => {
    const context = { reportCode: 'REPORT-B', fightId: 7 };

    renderHook(() => usePenetrationDataTask({ context }));

    expect(useWorkerTaskDependencies).toHaveBeenCalledWith({ context });
    expect(usePlayerData).toHaveBeenCalledWith({ context });
    expect(useCombatantInfoRecord).toHaveBeenCalledWith({ context });
    expect(useBuffLookupTask).toHaveBeenCalledWith({ context });
    expect(useDebuffLookupTask).toHaveBeenCalledWith({ context });
    expect(useDamageEvents).toHaveBeenCalledWith({ context });
    expect(useCastEvents).toHaveBeenCalledWith({ context });
    expect(useSelectedTargetIds).toHaveBeenCalledWith({ context });
  });
});
