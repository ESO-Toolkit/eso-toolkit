import { render, screen, within } from '@testing-library/react';
import React from 'react';

import { FightFragment } from '../../graphql/gql/graphql';

import { MapsPanel, resolveMapsPanelState } from './maps/MapsPanel';
import {
  hasRotationFightWindow,
  resolveRotationAnalysisPanelState,
} from './rotation/RotationAnalysisPanel';
import { resolveTalentsPanelState } from './talents/TalentsGridPanel';

const lifecycleCases = [
  ['loading', false, true, 'loading'],
  ['empty', false, false, 'succeeded'],
  ['partial', true, true, 'loading'],
  ['stale', true, false, 'idle'],
  ['failed', true, false, 'failed'],
  ['ready', true, false, 'succeeded'],
] as const;

describe('specialized Analyzer panel lifecycle states', () => {
  it.each(lifecycleCases)(
    'marks Talents %s from its authoritative player-data state',
    (expected, hasData, isLoading, status) => {
      expect(
        resolveTalentsPanelState({
          hasData,
          isLoading,
          playerDataError: expected === 'failed' ? 'Talents request failed' : null,
          playerDataStatus: status,
        }),
      ).toBe(expected);
    },
  );

  it.each(lifecycleCases)(
    'marks Rotation Analysis %s only after both source streams are known',
    (expected, hasData, isLoading, status) => {
      expect(
        resolveRotationAnalysisPanelState({
          castEventsError: expected === 'failed' ? 'Casts request failed' : null,
          castEventsStatus: status,
          hasData,
          resourceEventsError: null,
          resourceEventsStatus: status,
        }),
      ).toBe(expected);
    },
  );

  it.each(lifecycleCases)(
    'marks Maps %s from the supplied fight-data lifecycle',
    (expected, hasData, isLoading, status) => {
      expect(
        resolveMapsPanelState({
          error: expected === 'failed' ? 'Maps request failed' : null,
          hasData,
          isComplete: status === 'succeeded',
          isLoading,
        }),
      ).toBe(expected);
    },
  );

  it('retains timestamp zero as a valid rotation boundary', () => {
    expect(hasRotationFightWindow({ startTime: 0, endTime: 10_000 })).toBe(true);
    expect(hasRotationFightWindow({ startTime: undefined, endTime: 10_000 })).toBe(false);
  });

  it.each([
    { endTime: 0, startTime: 0 },
    { endTime: -1, startTime: 0 },
    { endTime: 10_000, startTime: Number.NaN },
    { endTime: Number.POSITIVE_INFINITY, startTime: 0 },
  ])('rejects an invalid rotation fight window: %o', (fight) => {
    expect(hasRotationFightWindow(fight)).toBe(false);
  });

  it('fails Rotation Analysis when either required source stream fails', () => {
    expect(
      resolveRotationAnalysisPanelState({
        castEventsError: null,
        castEventsStatus: 'succeeded',
        hasData: true,
        resourceEventsError: 'Resource event request failed',
        resourceEventsStatus: 'failed',
      }),
    ).toBe('failed');
  });

  it('renders a map whose authoritative identifier is zero', () => {
    const fight = {
      gameZone: null,
      id: 1,
      maps: [{ file: null, id: 0, name: 'Origin Map' }],
    } as unknown as FightFragment;

    render(<MapsPanel fight={fight} />);

    const panel = screen.getByRole('region', { name: 'Fight maps' });
    expect(within(panel).getByRole('status')).toHaveTextContent('Data is ready.');
    expect(within(panel).getByText('Origin Map')).toBeInTheDocument();
    expect(within(panel).getByText('0')).toBeInTheDocument();
  });
});
