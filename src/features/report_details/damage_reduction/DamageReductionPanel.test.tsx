import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { createMockFight } from '../../../test/utils/combatLogMockFactories';

import { DamageReductionPanel } from './DamageReductionPanel';

jest.mock('../../../hooks', () => ({
  usePlayerData: jest.fn(),
  useResolvedReportFightContext: jest.fn(),
  useFightForContext: jest.fn(),
}));

jest.mock('../../../hooks/workerTasks/useDamageReductionTask', () => ({
  useDamageReductionTask: jest.fn(),
}));

jest.mock('./DamageReductionPanelView', () => ({
  DamageReductionPanelView: () => <div>Retained damage reduction results</div>,
}));

const { usePlayerData, useResolvedReportFightContext, useFightForContext } =
  jest.requireMock('../../../hooks');
const { useDamageReductionTask } = jest.requireMock(
  '../../../hooks/workerTasks/useDamageReductionTask',
);

const theme = createTheme();
const mockFight = createMockFight({ id: 1, startTime: 0, endTime: 60000 });
const retainedData = { 1: {} };

const renderPanel = (overrides: Record<string, Record<string, unknown>> = {}) => {
  useResolvedReportFightContext.mockReturnValue({ reportCode: 'report', fightId: 1 });
  useFightForContext.mockReturnValue(overrides.fight ?? mockFight);
  usePlayerData.mockReturnValue({
    playerData: {
      playersById: { 1: { id: 1, name: 'Tank', role: 'tank' } },
      status: 'succeeded',
      error: null,
    },
    isPlayerDataLoading: false,
    ...overrides.player,
  });
  useDamageReductionTask.mockReturnValue({
    damageReductionData: retainedData,
    isDamageReductionLoading: false,
    damageReductionError: null,
    ...overrides.task,
  });

  return render(
    <ThemeProvider theme={theme}>
      <DamageReductionPanel />
    </ThemeProvider>,
  );
};

describe('DamageReductionPanel lifecycle states', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    [
      'loading',
      { task: { damageReductionData: null, isDamageReductionLoading: true } },
      'Loading data.',
    ],
    [
      'empty',
      {
        task: { damageReductionData: {} },
      },
      'No data is available for this panel.',
    ],
    [
      'partial',
      { task: { isDamageReductionLoading: true } },
      'Updating data; showing the latest available results.',
    ],
    [
      'stale',
      {
        player: {
          playerData: {
            playersById: { 1: { id: 1, name: 'Tank', role: 'tank' } },
            status: 'idle',
            error: null,
          },
        },
      },
      'Panel data is not confirmed current.',
    ],
    [
      'failed',
      { task: { damageReductionError: 'Worker failed' } },
      'The latest refresh failed. Retained data may be out of date. Worker failed',
    ],
    ['ready', {}, 'Data is ready.'],
  ] as const)('shows an explicit %s state', (_state, overrides, expectedAnnouncement) => {
    renderPanel(overrides);

    expect(screen.getByText(expectedAnnouncement)).toBeInTheDocument();
    if (_state === 'partial' || _state === 'stale' || _state === 'failed' || _state === 'ready') {
      expect(screen.getByText('Retained damage reduction results')).toBeInTheDocument();
    } else {
      expect(screen.queryByText('Retained damage reduction results')).not.toBeInTheDocument();
    }
  });
});
