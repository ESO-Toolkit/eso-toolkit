import { resolveDamageDonePanelState } from './DamageDonePanel';

describe('resolveDamageDonePanelState', () => {
  const completeStatuses = ['succeeded', 'succeeded', 'succeeded', 'succeeded'] as const;

  it.each([
    ['loading', { hasData: false, isLoading: true, hasFight: true, statuses: ['loading'] }],
    ['partial', { hasData: true, isLoading: true, hasFight: true, statuses: ['loading'] }],
    ['empty', { hasData: false, isLoading: false, hasFight: true, statuses: completeStatuses }],
    ['ready', { hasData: true, isLoading: false, hasFight: true, statuses: completeStatuses }],
    ['stale', { hasData: true, isLoading: false, hasFight: true, statuses: ['idle'] }],
    [
      'failed',
      {
        error: 'Damage events failed',
        hasData: true,
        isLoading: false,
        hasFight: true,
        statuses: ['failed'],
      },
    ],
  ] as const)('resolves %s without discarding retained damage rows', (expected, input) => {
    expect(resolveDamageDonePanelState(input)).toBe(expected);
  });

  it('does not classify an unconfirmed result as fresh empty', () => {
    expect(
      resolveDamageDonePanelState({
        hasData: false,
        isLoading: false,
        hasFight: false,
        statuses: [...completeStatuses],
      }),
    ).toBe('stale');
  });
});
