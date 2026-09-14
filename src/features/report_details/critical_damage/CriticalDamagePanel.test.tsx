import { render, screen } from '@testing-library/react';

import { CriticalDamagePanel } from './CriticalDamagePanel';

jest.mock('../../../hooks', () => ({
  useResolvedReportFightContext: jest.fn(),
  useFightForContext: jest.fn(),
  usePlayerData: jest.fn(),
  useSelectedTargetIds: jest.fn(),
  useCriticalDamageTask: jest.fn(),
}));

jest.mock('../../../hooks/workerTasks/useCompanionCritEvidence', () => ({
  useCompanionCritEvidence: jest.fn(() => undefined),
}));

jest.mock('./CriticalDamagePanelView', () => ({
  CriticalDamagePanelView: () => <div>retained critical-damage results</div>,
}));

const hooks = jest.requireMock('../../../hooks');

describe('CriticalDamagePanel lifecycle state', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    hooks.useResolvedReportFightContext.mockReturnValue({ reportCode: 'report', fightId: 0 });
    hooks.useFightForContext.mockReturnValue({ id: 0, startTime: 0, endTime: 1000 });
    hooks.usePlayerData.mockReturnValue({
      playerData: {
        status: 'succeeded',
        playersById: {
          0: { id: 0, name: 'Zero', role: 'dps' },
        },
      },
      isPlayerDataLoading: true,
    });
    hooks.useSelectedTargetIds.mockReturnValue(new Set([1]));
    hooks.useCriticalDamageTask.mockReturnValue({
      criticalDamageData: { playerDataMap: { 0: {} } },
      criticalDamageError: 'worker failed',
      isCriticalDamageLoading: true,
    });
  });

  it('surfaces a refresh error while retaining prior results instead of showing a loading skeleton', () => {
    render(<CriticalDamagePanel />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The latest refresh failed. Retained data may be out of date. worker failed',
    );
    expect(screen.getByText('retained critical-damage results')).toBeInTheDocument();
    expect(screen.queryByLabelText('Critical damage: loading')).not.toBeInTheDocument();
  });

  it('renders a completed empty state when target resolution confirms there are no targets', () => {
    hooks.usePlayerData.mockReturnValue({
      playerData: {
        status: 'succeeded',
        playersById: {
          0: { id: 0, name: 'Zero', role: 'dps' },
        },
      },
      isPlayerDataLoading: false,
    });
    hooks.useSelectedTargetIds.mockReturnValue(new Set([-3]));
    hooks.useCriticalDamageTask.mockReturnValue({
      criticalDamageData: null,
      criticalDamageError: null,
      isCriticalDamageLoading: false,
    });

    render(<CriticalDamagePanel />);

    expect(screen.getByRole('status')).toHaveTextContent('No data is available for this panel.');
    expect(screen.queryByText('Panel data is not confirmed current.')).not.toBeInTheDocument();
  });
});
