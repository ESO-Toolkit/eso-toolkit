import { act, render, screen, waitFor } from '@testing-library/react';

import buildEditorReducer from '@/features/build-editor/store/buildEditorSlice';

const mockDispatch = jest.fn();
const mockUseSelector = jest.fn();
const mockAcquireSession = jest.fn();
const mockClearBuildStorage = jest.fn();
const mockHasPendingCleanup = jest.fn();
const mockIsSessionCurrent = jest.fn();
const mockLoadStoredEditorState = jest.fn();
const mockMigrateAndLoad = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: unknown) => unknown) => mockUseSelector(selector),
}));

jest.mock('./savedBuildStorage', () => ({
  acquireBuildStorageSessionGeneration: (...args: unknown[]) => mockAcquireSession(...args),
  clearBuildStorage: (...args: unknown[]) => mockClearBuildStorage(...args),
  hasPendingBuildStorageCleanup: (...args: unknown[]) => mockHasPendingCleanup(...args),
  isBuildStorageSessionCurrent: (...args: unknown[]) => mockIsSessionCurrent(...args),
  loadStoredEditorState: (...args: unknown[]) => mockLoadStoredEditorState(...args),
  migrateAndLoadSavedBuildRecords: (...args: unknown[]) => mockMigrateAndLoad(...args),
}));

import { SavedBuildsGate } from './SavedBuildsGate';

const deferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
};

const makeLegacySavedBuild = () => {
  const initialBuild = buildEditorReducer(undefined, { type: 'test/initial' }).build;
  const build = JSON.parse(JSON.stringify(initialBuild)) as Record<string, unknown>;
  delete build.classSkillLines;
  delete build.classMasteryPassives;
  const setups = build.setups as Array<Record<string, unknown>>;
  setups[0].screenshots = ['data:image/svg+xml;base64,PHN2Zy8+', 'data:image/png;base64,AA=='];
  return {
    id: 'legacy-build',
    savedAt: '2026-08-30T00:00:00.000Z',
    build,
  };
};

const selectSavedBuilds = (builds: unknown[], hydrated = false): void => {
  mockUseSelector.mockImplementation((selector: (state: unknown) => unknown) =>
    selector({ savedBuilds: { builds, hydrated } }),
  );
};

describe('SavedBuildsGate', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockUseSelector.mockReset();
    mockAcquireSession.mockReset().mockResolvedValue('session-1');
    mockClearBuildStorage.mockReset().mockResolvedValue(undefined);
    mockHasPendingCleanup.mockReset().mockReturnValue(false);
    mockIsSessionCurrent.mockReset().mockReturnValue(true);
    mockLoadStoredEditorState.mockReset().mockResolvedValue(undefined);
    mockMigrateAndLoad.mockReset().mockResolvedValue([]);
  });

  it('atomically migrates a normalized legacy snapshot before rendering', async () => {
    const migration = deferred<unknown[]>();
    const legacySavedBuild = makeLegacySavedBuild();
    selectSavedBuilds([legacySavedBuild]);
    mockMigrateAndLoad.mockReturnValue(migration.promise);

    render(
      <SavedBuildsGate fallback={<div>Loading builds</div>}>
        <div>Editor ready</div>
      </SavedBuildsGate>,
    );

    await waitFor(() => expect(mockMigrateAndLoad).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Loading builds')).toBeInTheDocument();

    const [migrated, generation] = mockMigrateAndLoad.mock.calls[0] as [
      Array<{
        build: {
          classSkillLines: unknown[];
          classMasteryPassives: unknown[];
          setups: Array<{ screenshots: string[] }>;
        };
      }>,
      string,
    ];
    expect(generation).toBe('session-1');
    expect(migrated[0].build.classSkillLines).toHaveLength(3);
    expect(migrated[0].build.classMasteryPassives).toEqual([]);
    expect(migrated[0].build.setups[0].screenshots).toEqual(['data:image/png;base64,AA==']);

    await act(async () => {
      migration.resolve(migrated);
    });

    expect(await screen.findByText('Editor ready')).toBeInTheDocument();
    expect(mockLoadStoredEditorState).toHaveBeenCalledWith('session-1');
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'savedBuilds/hydrateSavedBuilds',
        payload: expect.arrayContaining([expect.objectContaining({ id: 'legacy-build' })]),
      }),
    );
  });

  it('keeps valid legacy builds in memory when IndexedDB is unavailable', async () => {
    const legacySavedBuild = makeLegacySavedBuild();
    selectSavedBuilds([legacySavedBuild]);
    mockMigrateAndLoad.mockRejectedValue(new Error('IndexedDB unavailable'));

    render(
      <SavedBuildsGate fallback={<div>Loading builds</div>}>
        <div>Editor ready</div>
      </SavedBuildsGate>,
    );

    expect(await screen.findByText('Editor ready')).toBeInTheDocument();
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'savedBuilds/hydrateSavedBuilds',
        payload: expect.arrayContaining([expect.objectContaining({ id: 'legacy-build' })]),
      }),
    );
  });

  it('treats the durable transaction result as authoritative', async () => {
    const staleSavedBuild = makeLegacySavedBuild();
    const durableSavedBuild = {
      ...makeLegacySavedBuild(),
      id: 'durable-build',
      savedAt: '2026-08-31T00:00:00.000Z',
    };
    selectSavedBuilds([staleSavedBuild]);
    mockMigrateAndLoad.mockResolvedValue([durableSavedBuild]);

    render(
      <SavedBuildsGate fallback={<div>Loading builds</div>}>
        <div>Editor ready</div>
      </SavedBuildsGate>,
    );

    expect(await screen.findByText('Editor ready')).toBeInTheDocument();
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'savedBuilds/hydrateSavedBuilds',
        payload: [expect.objectContaining({ id: 'durable-build' })],
      }),
    );
  });

  it('does not reload the library or resume pointer after this session has hydrated', () => {
    selectSavedBuilds([makeLegacySavedBuild()], true);

    render(
      <SavedBuildsGate fallback={<div>Loading builds</div>}>
        <div>Dirty editor remains mounted</div>
      </SavedBuildsGate>,
    );

    expect(screen.getByText('Dirty editor remains mounted')).toBeInTheDocument();
    expect(mockMigrateAndLoad).not.toHaveBeenCalled();
    expect(mockLoadStoredEditorState).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('fails closed and leaves hydration retryable when pending logout cleanup fails', async () => {
    selectSavedBuilds([makeLegacySavedBuild()]);
    mockHasPendingCleanup.mockReturnValue(true);
    mockClearBuildStorage.mockRejectedValue(new Error('IndexedDB blocked'));

    render(
      <SavedBuildsGate fallback={<div>Loading builds</div>}>
        <div>Editor ready without prior account data</div>
      </SavedBuildsGate>,
    );

    expect(await screen.findByText('Editor ready without prior account data')).toBeInTheDocument();
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'savedBuilds/clearSavedBuilds' }),
    );
    expect(mockMigrateAndLoad).not.toHaveBeenCalled();
    expect(mockLoadStoredEditorState).not.toHaveBeenCalled();
  });

  it('clears live data when the session rotates before hydration dispatch', async () => {
    selectSavedBuilds([makeLegacySavedBuild()]);
    mockMigrateAndLoad.mockResolvedValue([makeLegacySavedBuild()]);
    mockIsSessionCurrent.mockReturnValue(false);

    render(
      <SavedBuildsGate fallback={<div>Loading builds</div>}>
        <div>Signed-out editor ready</div>
      </SavedBuildsGate>,
    );

    expect(await screen.findByText('Signed-out editor ready')).toBeInTheDocument();
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'savedBuilds/clearSavedBuilds' }),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'savedBuilds/hydrateSavedBuilds' }),
    );
  });
});
