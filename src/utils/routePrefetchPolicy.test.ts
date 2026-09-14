import {
  canPrefetchHeavyRoute,
  shouldPrefetchHeavyRoute,
  type RoutePrefetchConnection,
  type RoutePrefetchIntent,
} from './routePrefetchPolicy';

describe('route prefetch policy', () => {
  it.each([
    { saveData: true },
    { metered: true },
    { effectiveType: 'slow-2g' },
    { effectiveType: '2g' },
    { effectiveType: '3g' },
  ] as RoutePrefetchConnection[])('rejects constrained connections: %p', (connection) => {
    expect(canPrefetchHeavyRoute(connection)).toBe(false);
    expect(shouldPrefetchHeavyRoute('pointer', connection)).toBe(false);
  });

  it.each(['pointer', 'focus', 'touch'] as const)(
    'allows intentional %s prefetch on an unconstrained connection',
    (intent) => {
      expect(shouldPrefetchHeavyRoute(intent, { effectiveType: '4g' })).toBe(true);
    },
  );

  it('allows intentional prefetch when connection information is unavailable', () => {
    expect(shouldPrefetchHeavyRoute('focus', undefined)).toBe(true);
  });

  it('allows intentional prefetch on a capable cellular connection', () => {
    expect(shouldPrefetchHeavyRoute('touch', { type: 'cellular', effectiveType: '4g' })).toBe(true);
  });

  it('rejects non-intentional prefetch requests', () => {
    expect(shouldPrefetchHeavyRoute(undefined, { effectiveType: '4g' })).toBe(false);
    expect(shouldPrefetchHeavyRoute(null, { effectiveType: '4g' })).toBe(false);
    expect(
      shouldPrefetchHeavyRoute('idle' as unknown as RoutePrefetchIntent, {
        effectiveType: '4g',
      }),
    ).toBe(false);
  });
});
