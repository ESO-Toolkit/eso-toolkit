// Module scope, not script scope: this file mirrors hubRoutePreload.test.ts down
// to its `loadFresh`/`flush` helper names, and two globally-scoped test files
// declaring the same consts collide under `tsc -p tsconfig.test.json`.
export {};

// `preloadReportFightDetails` keeps module-level state tracking whether the
// importer is loading/loaded, so each test loads a fresh copy of the module
// (resetMocks in jest.config.cjs only resets mock state, not module singletons).
const loadFresh = (): typeof import('./reportRoutePreload').preloadReportFightDetails => {
  let fn!: typeof import('./reportRoutePreload').preloadReportFightDetails;
  jest.isolateModules(() => {
    fn = (require('./reportRoutePreload') as typeof import('./reportRoutePreload'))
      .preloadReportFightDetails;
  });
  return fn;
};

const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('preloadReportFightDetails', () => {
  it('fires the importer once and skips it once already loaded', async () => {
    const preloadReportFightDetails = loadFresh();
    const importer = jest.fn().mockResolvedValue(undefined);

    preloadReportFightDetails(importer);
    expect(importer).toHaveBeenCalledTimes(1);

    // A second call must not re-fire an importer that already resolved.
    await flush();
    preloadReportFightDetails(importer);
    expect(importer).toHaveBeenCalledTimes(1);
  });

  it('does not throw or reject the caller when the importer fails', async () => {
    const preloadReportFightDetails = loadFresh();
    const failing = jest.fn().mockRejectedValue(new Error('chunk load failed'));

    expect(() => preloadReportFightDetails(failing)).not.toThrow();
    expect(failing).toHaveBeenCalledTimes(1);

    // Let the swallowed rejection settle so it never surfaces as unhandled.
    await flush();
  });

  it('retries an importer whose previous preload rejected', async () => {
    // A transient background failure must not permanently poison warming: a later
    // call (a later report-list mount) should re-attempt the chunk.
    const preloadReportFightDetails = loadFresh();
    let attempt = 0;
    const flaky = jest.fn(() => {
      attempt += 1;
      return attempt === 1 ? Promise.reject(new Error('blip')) : Promise.resolve(undefined);
    });

    preloadReportFightDetails(flaky);
    expect(flaky).toHaveBeenCalledTimes(1);

    // After the rejection settles, the importer is cleared and can retry.
    await flush();
    preloadReportFightDetails(flaky);
    expect(flaky).toHaveBeenCalledTimes(2);
  });
});
