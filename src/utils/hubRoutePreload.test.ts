// `preloadHubRoutes` keeps module-level state tracking which importers are
// loading/loaded, so each test loads a fresh copy of the module (resetMocks in
// jest.config.cjs only resets mock state, not module singletons).
const loadFresh = (): typeof import('./hubRoutePreload').preloadHubRoutes => {
  let fn!: typeof import('./hubRoutePreload').preloadHubRoutes;
  jest.isolateModules(() => {
    fn = (require('./hubRoutePreload') as typeof import('./hubRoutePreload')).preloadHubRoutes;
  });
  return fn;
};

const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('preloadHubRoutes', () => {
  it('fires every importer once and skips ones already loaded', async () => {
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

    // A second call must not re-fire importers that already resolved.
    await flush();
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
    await flush();
  });

  it('retries an importer whose previous preload rejected', async () => {
    // A transient background failure must not permanently poison warming: a later
    // call (hover/focus/idle) should re-attempt the chunk.
    const preloadHubRoutes = loadFresh();
    let attempt = 0;
    const flaky = jest.fn(() => {
      attempt += 1;
      return attempt === 1 ? Promise.reject(new Error('blip')) : Promise.resolve(undefined);
    });

    preloadHubRoutes([flaky]);
    expect(flaky).toHaveBeenCalledTimes(1);

    // After the rejection settles, the importer is cleared and can retry.
    await flush();
    preloadHubRoutes([flaky]);
    expect(flaky).toHaveBeenCalledTimes(2);
  });
});
