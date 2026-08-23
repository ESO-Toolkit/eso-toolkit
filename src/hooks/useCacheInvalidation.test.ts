import { clearOwnedCaches } from './useCacheInvalidation';

describe('clearOwnedCaches', () => {
  const originalCaches = window.caches;

  afterEach(() => {
    Object.defineProperty(window, 'caches', {
      configurable: true,
      value: originalCaches,
    });
  });

  it('deletes only caches owned by the application', async () => {
    const deleteCache = jest.fn().mockResolvedValue(true);
    Object.defineProperty(window, 'caches', {
      configurable: true,
      value: {
        keys: jest
          .fn()
          .mockResolvedValue([
            'eso-log-aggregator-build-123',
            'embedded-tool-cache',
            'eso-log-aggregator-build-122',
          ]),
        delete: deleteCache,
      },
    });

    await clearOwnedCaches();

    expect(deleteCache).toHaveBeenCalledTimes(2);
    expect(deleteCache).toHaveBeenNthCalledWith(1, 'eso-log-aggregator-build-123');
    expect(deleteCache).toHaveBeenNthCalledWith(2, 'eso-log-aggregator-build-122');
    expect(deleteCache).not.toHaveBeenCalledWith('embedded-tool-cache');
  });
});
