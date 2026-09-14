import { render, screen } from '@testing-library/react';

import { PenetrationPanel } from './PenetrationPanel';

jest.mock('../../../hooks', () => ({
  useResolvedReportFightContext: jest.fn(),
  useFightForContext: jest.fn(),
  usePlayerData: jest.fn(),
  useSelectedTargetIds: jest.fn(),
}));

jest.mock('../../../hooks/workerTasks/usePenetrationDataTask', () => ({
  usePenetrationDataTask: jest.fn(),
}));

jest.mock('./PenetrationPanelView', () => ({
  PenetrationPanelView: () => <div>no-target penetration result</div>,
}));

const hooks = jest.requireMock('../../../hooks');
const penetrationTask = jest.requireMock('../../../hooks/workerTasks/usePenetrationDataTask');

describe('PenetrationPanel lifecycle state', () => {
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
      isPlayerDataLoading: false,
    });
    hooks.useSelectedTargetIds.mockReturnValue(new Set([-3]));
    penetrationTask.usePenetrationDataTask.mockReturnValue({
      penetrationData: null,
      penetrationDataError: null,
      isPenetrationDataLoading: false,
    });
  });

  it('renders the explicit no-target result instead of a stale panel', () => {
    render(<PenetrationPanel />);

    expect(screen.getByText('no-target penetration result')).toBeInTheDocument();
    expect(screen.queryByText('Panel data is not confirmed current.')).not.toBeInTheDocument();
  });
});
