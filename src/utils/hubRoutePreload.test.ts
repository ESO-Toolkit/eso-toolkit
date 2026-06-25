// `preloadHubRoutes` keeps a module-level "already warmed" flag, so each test
// loads a fresh copy of the module (resetMocks in jest.config.cjs only resets
// mock state, not module singletons).
const loadFresh = (): typeof import('./hubRoutePreload').preloadHubRoutes => {
  let fn!: typeof import('./hubRoutePreload').preloadHubRoutes;
  jest.isolateModules(() => {
    fn = (require('./hubRoutePreload') as typeof import('./hubRoutePreload')).preloadHubRoutes;
  });
  return fn;
};

describe('preloadHubRoutes', () => {
  it('fires every importer exactly once and is idempotent across calls', () => {
    const preloadHubRoutes = loadFresh();
    const importers = [
      jest.fn().mockResolvedValue(undefined),
      jest.fn().mockResolvedValue(undefined),
      jest.fn().mockResolvedValue(undefined),
    ];

    preloadHubRoutes(importers);
    for (const imp of importers) {
      expect(imp).toHaveBeenCalledTimes(1);
    }

    // Second call must be a no-op — the chunks are already warming.
    preloadHubRoutes(importers);
    for (const imp of importers) {
      expect(imp).toHaveBeenCalledTimes(1);
    }
  });

  it('does not throw or reject the caller when an importer fails', async () => {
    const preloadHubRoutes = loadFresh();
    const failing = jest.fn().mockRejectedValue(new Error('chunk load failed'));

    expect(() => preloadHubRoutes([failing])).not.toThrow();
    expect(failing).toHaveBeenCalledTimes(1);

    // Let the swallowed rejection settle so it never surfaces as unhandled.
    await Promise.resolve();
    await Promise.resolve();
  });
});
