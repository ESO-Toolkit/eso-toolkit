import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { FightFragment } from '../../../graphql/gql/graphql';

import { InsightsPanelView, type InsightsWorkflowState } from './InsightsPanelView';

jest.mock('../../../components/AbilityIcon', () => ({ AbilityIcon: () => null }));
jest.mock('./BuffUptimesPanel', () => ({ BuffUptimesPanel: () => null }));
jest.mock('./DamageBreakdownPanel', () => ({ DamageBreakdownPanel: () => null }));
jest.mock('./DamageTypeBreakdownPanel', () => ({ DamageTypeBreakdownPanel: () => null }));
jest.mock('./DebuffUptimesPanel', () => ({ DebuffUptimesPanel: () => null }));
jest.mock('./StatusEffectUptimesPanel', () => ({ StatusEffectUptimesPanel: () => null }));

const theme = createTheme();

const fight: FightFragment = {
  id: 1,
  name: 'Authoritative context pending',
  encounterID: 1,
  startTime: 0,
  endTime: 120_000,
};

const renderView = (productWorkflowState: InsightsWorkflowState) =>
  render(
    <ThemeProvider theme={theme}>
      <InsightsPanelView
        abilityEquipped={{}}
        buffActors={{}}
        durationMs={120_000}
        fight={fight}
        fightInitiator={null}
        isLoading={false}
        productWorkflowState={productWorkflowState}
        selectedPlayerId={null}
      />
    </ThemeProvider>,
  );

describe('InsightsPanelView product workflow', () => {
  it.each<readonly [InsightsWorkflowState, RegExp]>([
    ['loading', /Product analysis inputs are loading/],
    ['partial', /Product analysis inputs are partial/],
    ['stale', /Product analysis inputs are stale/],
    ['failed', /Product analysis inputs failed to load/],
    ['unavailable', /Unknown data is not scored as zero/],
  ])('shows the explicit %s state without manufacturing a result', (state, status) => {
    renderView(state);

    expect(screen.getByText(status)).toBeInTheDocument();
    expect(screen.getByTestId('evidence-drilldown-unavailable')).toHaveTextContent(
      /withheld rather than treating unavailable events as an empty evidence set/,
    );
    expect(screen.getByText(/No comparison score is available/)).toBeInTheDocument();
    expect(screen.getByText(/No trend or score is inferred/)).toBeInTheDocument();
  });

  it('orders the product workflow from decision through progression', () => {
    renderView('unavailable');

    const text = document.body.textContent ?? '';
    const sections = [
      'Decision summary',
      'Evidence drilldown',
      'Pinned findings',
      'A/B and cohort comparison',
      'Pull progression',
    ];
    const positions = sections.map((section) => text.indexOf(section));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((left, right) => left - right)).toEqual(positions);
  });

  it('withholds provenance and identifiers until a privacy-safe evidence producer exists', () => {
    const { container } = renderView('unavailable');

    expect(container).toHaveTextContent(/privacy-safe provenance are unavailable/);
    expect(container).not.toHaveTextContent('F4f2bMwWtgVKxjB9');
    expect(container).not.toHaveTextContent('Example Player');
    expect(container).not.toHaveTextContent('0%');
  });
});
