import { ThemeProvider, createTheme } from '@mui/material';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type { FightFragment } from '../../../graphql/gql/graphql';

import type { InsightsDataState, InsightsRetryAvailability } from './insightsDataState';
import { InsightsPanelView } from './InsightsPanelView';

jest.mock('../../../components/AbilityIcon', () => ({
  AbilityIcon: () => <span>Ability icon</span>,
}));

jest.mock('./BuffUptimesPanel', () => ({
  BuffUptimesPanel: () => <div>Buff uptime content</div>,
}));
jest.mock('./DamageBreakdownPanel', () => ({
  DamageBreakdownPanel: () => <div>Damage breakdown content</div>,
}));
jest.mock('./DamageTypeBreakdownPanel', () => ({
  DamageTypeBreakdownPanel: () => <div>Damage type content</div>,
}));
jest.mock('./DebuffUptimesPanel', () => ({
  DebuffUptimesPanel: () => <div>Debuff uptime content</div>,
}));
jest.mock('./StatusEffectUptimesPanel', () => ({
  StatusEffectUptimesPanel: () => <div>Status effect content</div>,
}));

const fight = {
  encounterID: 1,
  endTime: 65_000,
  friendlyPlayers: [],
  id: 1,
  name: 'Test fight',
  startTime: 0,
} as FightFragment;

const availableRetry: InsightsRetryAvailability = { canRetry: true, unavailableReason: null };
const unavailableFightInitiator = {
  kind: 'unavailable' as const,
  message: 'No initiator data is available.',
};

const renderPanel = (
  dataState: InsightsDataState,
  onRetry = jest.fn(),
  retryAvailability = availableRetry,
  fightInitiator = unavailableFightInitiator,
) => {
  render(
    <ThemeProvider theme={createTheme()}>
      <InsightsPanelView
        fight={fight}
        durationMs={65_000}
        abilityEquipped={{}}
        buffActors={{}}
        fightInitiator={fightInitiator}
        selectedPlayerId={null}
        dataState={dataState}
        onRetry={onRetry}
        retryAvailability={retryAvailability}
      />
    </ThemeProvider>,
  );

  return onRetry;
};

describe('InsightsPanelView data states', () => {
  it('keeps independent fight content visible while damage data is loading', () => {
    renderPanel(
      {
        kind: 'loading',
        errorMessage: null,
        failedSources: [],
        hasPendingSources: true,
      },
      undefined,
      availableRetry,
      {
        kind: 'loading',
        message: 'Loading damage events to identify the fight initiator.',
      },
    );

    expect(screen.getByRole('heading', { name: 'Fight Insights' })).toBeInTheDocument();
    expect(screen.getByText('Duration:')).toBeInTheDocument();
    expect(screen.getByText('1m 5.0s')).toBeInTheDocument();
    expect(screen.getByText('Damage breakdown content')).toBeInTheDocument();
    expect(screen.getByTestId('fight-initiator')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByTestId('fight-initiator')).toHaveTextContent('Fight initiator: Loading');
    expect(screen.getByTestId('fight-initiator')).toHaveTextContent(
      'Loading damage events to identify the fight initiator.',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Loading detailed fight insights');
    expect(screen.getByTestId('insights-panel')).toHaveAttribute('aria-busy', 'true');
  });

  it('updates the initiator label when damage data completes', () => {
    const { rerender } = render(
      <ThemeProvider theme={createTheme()}>
        <InsightsPanelView
          fight={fight}
          durationMs={65_000}
          abilityEquipped={{}}
          buffActors={{}}
          fightInitiator={{
            kind: 'loading',
            message: 'Loading damage events to identify the fight initiator.',
          }}
          selectedPlayerId={null}
          dataState={{
            kind: 'loading',
            errorMessage: null,
            failedSources: [],
            hasPendingSources: true,
          }}
          onRetry={jest.fn()}
          retryAvailability={availableRetry}
        />
      </ThemeProvider>,
    );

    rerender(
      <ThemeProvider theme={createTheme()}>
        <InsightsPanelView
          fight={fight}
          durationMs={65_000}
          abilityEquipped={{}}
          buffActors={{}}
          fightInitiator={{ kind: 'available', name: 'Initiating Player' }}
          selectedPlayerId={null}
          dataState={{
            kind: 'ready',
            errorMessage: null,
            failedSources: [],
            hasPendingSources: false,
          }}
          onRetry={jest.fn()}
          retryAvailability={availableRetry}
        />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('fight-initiator')).toHaveTextContent(
      'Fight initiator: Initiating Player',
    );
    expect(screen.queryByText('Loading damage events to identify the fight initiator.')).toBeNull();
  });

  it('exposes an unavailable initiator state without hiding independent content', () => {
    renderPanel(
      {
        kind: 'ready',
        errorMessage: null,
        failedSources: [],
        hasPendingSources: false,
      },
      undefined,
      availableRetry,
      unavailableFightInitiator,
    );

    expect(screen.getByTestId('fight-initiator')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByTestId('fight-initiator')).toHaveTextContent('Fight initiator: Unavailable');
    expect(screen.getByTestId('fight-initiator')).toHaveTextContent(
      'No initiator data is available.',
    );
    expect(screen.getByText('Damage breakdown content')).toBeInTheDocument();
  });

  it('announces explicit empty and partial states without hiding the panel', () => {
    const { rerender } = render(
      <ThemeProvider theme={createTheme()}>
        <InsightsPanelView
          fight={fight}
          durationMs={65_000}
          abilityEquipped={{}}
          buffActors={{}}
          fightInitiator={{ kind: 'unavailable', message: 'No initiator data is available.' }}
          selectedPlayerId={null}
          dataState={{
            kind: 'empty',
            errorMessage: null,
            failedSources: [],
            hasPendingSources: false,
          }}
          onRetry={jest.fn()}
          retryAvailability={availableRetry}
        />
      </ThemeProvider>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('No additional insight data is available');
    expect(screen.getByTestId('insights-panel')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={createTheme()}>
        <InsightsPanelView
          fight={fight}
          durationMs={65_000}
          abilityEquipped={{}}
          buffActors={{}}
          fightInitiator={{ kind: 'unavailable', message: 'No initiator data is available.' }}
          selectedPlayerId={null}
          dataState={{
            kind: 'partial',
            errorMessage: null,
            failedSources: [],
            hasPendingSources: true,
          }}
          onRetry={jest.fn()}
          retryAvailability={availableRetry}
        />
      </ThemeProvider>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('still loading');
    expect(screen.getByTestId('insights-panel')).toHaveAttribute('aria-busy', 'true');
  });

  it('retains visible content and offers recovery for stale or failed data', () => {
    const onRetry = renderPanel({
      kind: 'stale',
      errorMessage: 'Damage request timed out.',
      failedSources: ['damage'],
      hasPendingSources: false,
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Showing available results');
    expect(screen.getByText('Buff uptime content')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Try again to reload failed fight insight data' }),
    );
    expect(onRetry).toHaveBeenCalledTimes(1);

    renderPanel({
      kind: 'failed',
      errorMessage: 'Damage request timed out.',
      failedSources: ['damage'],
      hasPendingSources: false,
    });

    expect(screen.getAllByRole('alert')[1]).toHaveTextContent('Unable to load fight insight data');
    expect(
      screen.getAllByRole('button', { name: 'Try again to reload failed fight insight data' }),
    ).toHaveLength(2);
  });

  it('keeps one current announcement through stale, loading, and ready transitions', () => {
    const { rerender } = render(
      <ThemeProvider theme={createTheme()}>
        <InsightsPanelView
          fight={fight}
          durationMs={65_000}
          abilityEquipped={{}}
          buffActors={{}}
          fightInitiator={{ kind: 'unavailable', message: 'No initiator data is available.' }}
          selectedPlayerId={null}
          dataState={{
            kind: 'stale',
            errorMessage: 'Damage request timed out.',
            failedSources: ['damage'],
            hasPendingSources: false,
          }}
          onRetry={jest.fn()}
          retryAvailability={availableRetry}
        />
      </ThemeProvider>,
    );

    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    rerender(
      <ThemeProvider theme={createTheme()}>
        <InsightsPanelView
          fight={fight}
          durationMs={65_000}
          abilityEquipped={{}}
          buffActors={{}}
          fightInitiator={{ kind: 'unavailable', message: 'No initiator data is available.' }}
          selectedPlayerId={null}
          dataState={{
            kind: 'loading',
            errorMessage: null,
            failedSources: [],
            hasPendingSources: true,
          }}
          onRetry={jest.fn()}
          retryAvailability={availableRetry}
        />
      </ThemeProvider>,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByTestId('insights-panel')).toHaveAttribute('aria-busy', 'true');

    rerender(
      <ThemeProvider theme={createTheme()}>
        <InsightsPanelView
          fight={fight}
          durationMs={65_000}
          abilityEquipped={{}}
          buffActors={{}}
          fightInitiator={{ kind: 'unavailable', message: 'No initiator data is available.' }}
          selectedPlayerId={null}
          dataState={{
            kind: 'ready',
            errorMessage: null,
            failedSources: [],
            hasPendingSources: false,
          }}
          onRetry={jest.fn()}
          retryAvailability={availableRetry}
        />
      </ThemeProvider>,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByTestId('insights-panel')).toHaveAttribute('aria-busy', 'false');
  });

  it('uses a neutral partial-failure announcement and disables unavailable retry', () => {
    const onRetry = renderPanel(
      {
        kind: 'partial',
        errorMessage: 'Damage request timed out.',
        failedSources: ['damage'],
        hasPendingSources: false,
      },
      undefined,
      {
        canRetry: false,
        unavailableReason:
          'Retry is unavailable until the report, selected fight, and required data client are ready.',
      },
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Other insight data may be incomplete');
    expect(
      screen.getByRole('button', { name: 'Try again to reload failed fight insight data' }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        'Retry is unavailable until the report, selected fight, and required data client are ready.',
      ),
    ).toBeInTheDocument();
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('keeps the panel busy with one current alert while a failed stream has another loading', () => {
    renderPanel({
      kind: 'partial',
      errorMessage: 'Damage request timed out.',
      failedSources: ['damage'],
      hasPendingSources: true,
    });

    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'could not be loaded while other data is still loading',
    );
    expect(screen.getByRole('alert')).not.toHaveTextContent(
      'completed data streams contained no records',
    );
    expect(screen.getByTestId('insights-panel')).toHaveAttribute('aria-busy', 'true');
  });

  it('announces retained stale results while another failed-source request is still loading', () => {
    renderPanel({
      kind: 'stale',
      errorMessage: 'Damage request timed out.',
      failedSources: ['damage'],
      hasPendingSources: true,
    });

    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Showing available results while other data is still loading',
    );
    expect(screen.getByTestId('insights-panel')).toHaveAttribute('aria-busy', 'true');
  });
});
