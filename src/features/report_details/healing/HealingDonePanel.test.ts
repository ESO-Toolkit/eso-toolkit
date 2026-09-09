import { resolveHealingDonePanelState } from './HealingDonePanel';

describe('resolveHealingDonePanelState', () => {
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
        error: 'Healing events failed',
        hasData: true,
        isLoading: false,
        hasFight: true,
        statuses: ['failed'],
      },
    ],
  ] as const)('resolves %s without discarding retained healing rows', (expected, input) => {
    expect(resolveHealingDonePanelState(input)).toBe(expected);
  });

  it('does not classify an unconfirmed result as fresh empty', () => {
    expect(
      resolveHealingDonePanelState({
        hasData: false,
        isLoading: false,
        hasFight: false,
        statuses: [...completeStatuses],
      }),
    ).toBe('stale');
  });
});
