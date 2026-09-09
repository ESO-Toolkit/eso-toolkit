import { resolveDebugEventPanelState, type DebugEventStreamStatus } from './EventsGrid';

const panelNames = ['Events', 'Target Events', 'Location Heatmap', 'Diagnostics'] as const;

describe('debug analyzer panel lifecycle states', () => {
  const cases: Array<{
    name: string;
    streams: Array<DebugEventStreamStatus | null>;
    events: unknown[];
    expected: 'loading' | 'empty' | 'partial' | 'stale' | 'failed' | 'ready';
    detail?: string;
  }> = [
    {
      name: 'loading before any stream has returned',
      streams: [{ status: 'loading' }],
      events: [],
      expected: 'loading',
    },
    {
      name: 'known successful empty result',
      streams: [{ status: 'succeeded' }],
      events: [],
      expected: 'empty',
    },
    {
      name: 'retained data while another stream loads',
      streams: [{ status: 'succeeded' }, { status: 'loading' }],
      events: [{ timestamp: 0 }],
      expected: 'partial',
    },
    {
      name: 'data without a confirmed completion',
      streams: [{ status: 'idle' }],
      events: [{ timestamp: 0 }],
      expected: 'stale',
    },
    {
      name: 'failed refresh with no retained data',
      streams: [{ status: 'failed', error: 'HTTP 503' }],
      events: [],
      expected: 'failed',
      detail: 'HTTP 503',
    },
    {
      name: 'all streams succeeded with data',
      streams: [{ status: 'succeeded' }, { status: 'succeeded' }],
      events: [{ timestamp: 0 }],
      expected: 'ready',
    },
  ];

  it.each(panelNames)('resolves every lifecycle state for %s', (_panelName) => {
    for (const testCase of cases) {
      const result = resolveDebugEventPanelState(testCase.events, testCase.streams);

      expect(result.state).toBe(testCase.expected);
      expect(result.detail).toBe(testCase.detail);
    }
  });

  it('does not treat null stream entries as successful empty data', () => {
    expect(resolveDebugEventPanelState([], [null])).toEqual({ state: 'stale' });
  });
});
