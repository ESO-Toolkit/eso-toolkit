import {
  getInsightsDataState,
  getInsightsRetryAvailability,
  type InsightsDataSource,
} from './insightsDataState';

const source = (overrides: Partial<InsightsDataSource>): InsightsDataSource => ({
  error: null,
  hasData: false,
  isLoading: false,
  name: 'damage',
  status: 'idle',
  ...overrides,
});

describe('getInsightsDataState', () => {
  it('reports partial when independent streams completed while damage is loading', () => {
    expect(
      getInsightsDataState([
        source({ isLoading: true, status: 'loading' }),
        source({ name: 'combatantInfo', status: 'succeeded' }),
        source({ name: 'playerData', status: 'succeeded' }),
      ]),
    ).toMatchObject({ kind: 'partial' });
  });

  it('treats completed streams with no records as a valid empty state', () => {
    expect(
      getInsightsDataState([
        source({ status: 'succeeded' }),
        source({ name: 'combatantInfo', status: 'succeeded' }),
        source({ name: 'playerData', status: 'succeeded' }),
      ]),
    ).toMatchObject({ kind: 'empty' });
  });

  it('labels retained results as stale and identifies the stream to retry', () => {
    expect(
      getInsightsDataState([
        source({ error: 'Timed out', status: 'failed' }),
        source({ hasData: true, name: 'combatantInfo', status: 'succeeded' }),
        source({ name: 'playerData', status: 'succeeded' }),
      ]),
    ).toEqual({
      errorMessage: 'Timed out',
      failedSources: ['damage'],
      hasPendingSources: false,
      kind: 'stale',
    });
  });

  it('keeps completed empty streams explicit when another stream fails', () => {
    expect(
      getInsightsDataState([
        source({ error: 'Timed out', status: 'failed' }),
        source({ name: 'combatantInfo', status: 'succeeded' }),
        source({ name: 'playerData', status: 'succeeded' }),
      ]),
    ).toMatchObject({ failedSources: ['damage'], kind: 'partial' });
  });

  it('keeps a failed source partial and pending while another stream loads beside valid empty data', () => {
    expect(
      getInsightsDataState([
        source({ error: 'Timed out', status: 'failed' }),
        source({ isLoading: true, name: 'combatantInfo', status: 'loading' }),
        source({ name: 'playerData', status: 'succeeded' }),
      ]),
    ).toEqual({
      errorMessage: 'Timed out',
      failedSources: ['damage'],
      hasPendingSources: true,
      kind: 'partial',
    });
  });

  it('is ready when every stream completes with insight data', () => {
    expect(
      getInsightsDataState([
        source({ hasData: true, status: 'succeeded' }),
        source({ hasData: true, name: 'combatantInfo', status: 'succeeded' }),
        source({ hasData: true, name: 'playerData', status: 'succeeded' }),
      ]),
    ).toMatchObject({ kind: 'ready' });
  });

  it('does not offer retry until every failed source has a fresh request path', () => {
    expect(
      getInsightsRetryAvailability(
        ['damage'],
        { combatantInfo: true, damage: false, playerData: true },
        [],
      ),
    ).toEqual({
      canRetry: false,
      unavailableReason:
        'Retry is unavailable until the report, selected fight, and required data client are ready.',
    });

    expect(
      getInsightsRetryAvailability(
        ['damage'],
        { combatantInfo: true, damage: true, playerData: true },
        ['damage'],
      ),
    ).toMatchObject({
      canRetry: false,
      unavailableReason: expect.stringContaining('A retry is already in progress'),
    });

    expect(
      getInsightsRetryAvailability(
        ['damage'],
        { combatantInfo: true, damage: true, playerData: true },
        [],
      ),
    ).toEqual({ canRetry: true, unavailableReason: null });
  });
});
