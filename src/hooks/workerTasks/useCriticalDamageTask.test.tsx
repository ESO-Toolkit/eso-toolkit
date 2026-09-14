import { renderHook } from '@testing-library/react';

import { useCriticalDamageTask } from './useCriticalDamageTask';

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@/store/worker_results', () => ({
  executeCriticalDamageTask: jest.fn(),
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

jest.mock('./useCompanionCritEvidence', () => ({
  useCompanionCritEvidence: jest.fn(),
}));

jest.mock('./useDebuffLookupTask', () => ({
  useDebuffLookupTask: jest.fn(),
}));

jest.mock('./useWorkerTaskDependencies', () => ({
  useWorkerTaskDependencies: jest.fn(),
}));

const { useSelector } = jest.requireMock('react-redux');
const { executeCriticalDamageTask } = jest.requireMock('@/store/worker_results');
const { useCombatantInfoRecord } = jest.requireMock('../events/useCombatantInfoRecord');
const { useDamageEvents } = jest.requireMock('../events/useDamageEvents');
const { usePlayerData } = jest.requireMock('../usePlayerData');
const { useSelectedTargetIds } = jest.requireMock('../useSelectedTargetIds');
const { useBuffLookupTask } = jest.requireMock('./useBuffLookupTask');
const { useCompanionCritEvidence } = jest.requireMock('./useCompanionCritEvidence');
const { useDebuffLookupTask } = jest.requireMock('./useDebuffLookupTask');
const { useWorkerTaskDependencies } = jest.requireMock('./useWorkerTaskDependencies');

describe('useCriticalDamageTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockReturnValue({ abort: jest.fn() });
    useWorkerTaskDependencies.mockReturnValue({ dispatch: mockDispatch, selectedFight: { id: 1 } });
    useCombatantInfoRecord.mockReturnValue({
      combatantInfoRecord: {},
      isCombatantInfoEventsLoading: false,
    });
    usePlayerData.mockReturnValue({ playerData: { playersById: {} }, isPlayerDataLoading: false });
    useBuffLookupTask.mockReturnValue({ buffLookupData: {}, isBuffLookupLoading: false });
    useDebuffLookupTask.mockReturnValue({ debuffLookupData: {}, isDebuffLookupLoading: false });
    useDamageEvents.mockReturnValue({ damageEvents: [{}], isDamageEventsLoading: false });
    useSelectedTargetIds.mockReturnValue(new Set([-3]));
    useCompanionCritEvidence.mockReturnValue(undefined);
    useSelector
      .mockReturnValueOnce({ retainedResult: true })
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(50);
  });

  it('does not dispatch or expose retained metrics when the resolved target scope has no targets', () => {
    const { result } = renderHook(() => useCriticalDamageTask());

    expect(executeCriticalDamageTask).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(result.current.criticalDamageData).toBeNull();
    expect(result.current.isCriticalDamageLoading).toBe(false);
  });

  it('reads every report dependency from the supplied context', () => {
    const context = { reportCode: 'REPORT-A', fightId: 42 };

    renderHook(() => useCriticalDamageTask({ context }));

    expect(useWorkerTaskDependencies).toHaveBeenCalledWith({ context });
    expect(useCombatantInfoRecord).toHaveBeenCalledWith({ context });
    expect(usePlayerData).toHaveBeenCalledWith({ context });
    expect(useBuffLookupTask).toHaveBeenCalledWith({ context });
    expect(useDebuffLookupTask).toHaveBeenCalledWith({ context });
    expect(useDamageEvents).toHaveBeenCalledWith({ context });
    expect(useSelectedTargetIds).toHaveBeenCalledWith({ context });
    expect(useCompanionCritEvidence).toHaveBeenCalledWith(context);
  });
});
