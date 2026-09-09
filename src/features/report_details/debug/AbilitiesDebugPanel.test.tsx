import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';
import React from 'react';
import { useSelector } from 'react-redux';

import type { FightFragment } from '../../../graphql/gql/graphql';
import { useReportMasterData } from '../../../hooks';

import { AbilitiesDebugPanel } from './AbilitiesDebugPanel';

jest.mock('../../../hooks', () => ({
  useReportMasterData: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./AbilitiesDebugPanelView', () => ({
  AbilitiesDebugPanelView: ({
    abilities,
    totalCount,
    isLoading,
  }: {
    abilities: Array<{ gameID: string | number; name: string }>;
    totalCount: number;
    isLoading: boolean;
  }) => (
    <div data-testid="abilities-view">
      {abilities.map((ability) => (
        <span key={ability.gameID}>{ability.name}</span>
      ))}
      <span data-testid="abilities-total">{totalCount}</span>
      <span data-testid="abilities-loading">{String(isLoading)}</span>
    </div>
  ),
}));

const useReportMasterDataMock = jest.mocked(useReportMasterData);
const useSelectorMock = jest.mocked(useSelector);
const fight = {} as FightFragment;
const retainedAbility = {
  gameID: 42,
  name: 'Retained ability',
  icon: 'ability_icon',
  type: '1',
};

const renderPanel = (
  overrides: {
    loaded?: boolean;
    loading?: boolean;
    abilitiesById?: Record<string, typeof retainedAbility>;
    error?: string | null;
  } = {},
) => {
  useReportMasterDataMock.mockReturnValue({
    reportMasterData: {
      abilitiesById: overrides.abilitiesById ?? {},
      actorsById: {},
      loaded: overrides.loaded ?? false,
    },
    isMasterDataLoading: overrides.loading ?? false,
  });
  useSelectorMock.mockReturnValue(overrides.error ?? null);

  return render(<AbilitiesDebugPanel fight={fight} />);
};

describe('AbilitiesDebugPanel lifecycle states', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('announces loading when master data is still being fetched', () => {
    renderPanel({ loading: true });

    expect(screen.getByLabelText('Abilities: loading')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading data.');
    expect(screen.queryByTestId('abilities-view')).not.toBeInTheDocument();
  });

  it('announces an empty result only after the request completes', () => {
    renderPanel({ loaded: true });

    expect(screen.getByRole('status')).toHaveTextContent('No data is available for this panel.');
    expect(screen.queryByTestId('abilities-view')).not.toBeInTheDocument();
  });

  it('shows retained abilities while a refresh is partial', () => {
    renderPanel({
      abilitiesById: { '42': retainedAbility },
      loading: true,
    });

    expect(screen.getByRole('status')).toHaveTextContent(
      'Updating data; showing the latest available results.',
    );
    expect(screen.getByTestId('abilities-view')).toHaveTextContent('Retained ability');
    expect(screen.getByTestId('abilities-loading')).toHaveTextContent('false');
  });

  it('marks retained data stale when no fresh result is confirmed', () => {
    renderPanel({ abilitiesById: { '42': retainedAbility } });

    expect(screen.getByRole('status')).toHaveTextContent('Panel data is not confirmed current.');
    expect(screen.getByTestId('abilities-view')).toBeInTheDocument();
  });

  it('announces refresh failures without discarding retained data', () => {
    renderPanel({
      abilitiesById: { '42': retainedAbility },
      loaded: true,
      error: 'Master data request failed.',
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The latest refresh failed. Retained data may be out of date. Master data request failed.',
    );
    expect(screen.getByTestId('abilities-view')).toBeInTheDocument();
  });

  it('preserves populated abilities behavior for a ready result', () => {
    renderPanel({
      abilitiesById: { '42': retainedAbility },
      loaded: true,
    });

    expect(screen.getByTestId('abilities-view')).toBeInTheDocument();
    expect(screen.getByTestId('abilities-total')).toHaveTextContent('1');
    expect(screen.getByText('Retained ability')).toBeInTheDocument();
    expect(screen.getByTestId('abilities-loading')).toHaveTextContent('false');
  });
});
