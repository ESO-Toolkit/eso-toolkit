import { selectEmptyStateKind } from './ReportsEmptyState';

describe('selectEmptyStateKind', () => {
  it('search-no-match: server returned rows but the text query filtered all out', () => {
    expect(
      selectEmptyStateKind({
        serverFilterActive: false,
        searchActive: true,
        loadedCount: 12,
        hiddenEmptyCount: 0,
      }),
    ).toBe('search-no-match');
  });

  it('filter-no-results: a server filter is active and the page came back empty', () => {
    expect(
      selectEmptyStateKind({
        serverFilterActive: true,
        searchActive: false,
        loadedCount: 0,
        hiddenEmptyCount: 0,
      }),
    ).toBe('filter-no-results');
  });

  it('all-hidden: the page was entirely empty (no-combat) logs', () => {
    expect(
      selectEmptyStateKind({
        serverFilterActive: false,
        searchActive: false,
        loadedCount: 0,
        hiddenEmptyCount: 25,
      }),
    ).toBe('all-hidden');
  });

  it('cold-empty: nothing active and nothing returned', () => {
    expect(
      selectEmptyStateKind({
        serverFilterActive: false,
        searchActive: false,
        loadedCount: 0,
        hiddenEmptyCount: 0,
      }),
    ).toBe('cold-empty');
  });

  it('prioritizes search-no-match over filter-no-results when both could apply', () => {
    // Server filter active AND search active AND rows present-but-filtered-out:
    // the user's most recent action (typing) should drive the message.
    expect(
      selectEmptyStateKind({
        serverFilterActive: true,
        searchActive: true,
        loadedCount: 5,
        hiddenEmptyCount: 0,
      }),
    ).toBe('search-no-match');
  });
});
