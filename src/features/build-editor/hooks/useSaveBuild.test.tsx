import { act, renderHook } from '@testing-library/react';

import buildEditorReducer from '../store/buildEditorSlice';

const mockDispatch = jest.fn();
const mockGetState = jest.fn();
const mockNavigate = jest.fn();
const mockEnqueue = jest.fn();
const mockAssertSessionCurrent = jest.fn();
const mockAcquireSession = jest.fn();
const mockPutSavedBuildAndEditorState = jest.fn();
const mockLocation = { key: 'location-a', pathname: '/build-editor', search: '?id=saved-1' };

const deferred = <T,>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
};

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useStore: () => ({ getState: mockGetState }),
}));

jest.mock('react-router-dom', () => ({
  useLocation: () => mockLocation,
  useNavigate: () => mockNavigate,
}));

jest.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: mockEnqueue }),
}));

jest.mock('@/store/saved_builds/savedBuildStorage', () => ({
  acquireBuildStorageSessionGeneration: (...args: unknown[]) => mockAcquireSession(...args),
  assertBuildStorageSessionCurrent: (...args: unknown[]) => mockAssertSessionCurrent(...args),
  LEGACY_BUILD_EDITOR_STORAGE_KEY: 'eso-build-editor-v1',
  putSavedBuildAndEditorState: (...args: unknown[]) => mockPutSavedBuildAndEditorState(...args),
}));

import { useSaveBuild } from './useSaveBuild';

describe('useSaveBuild', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation.key = 'location-a';
    mockLocation.pathname = '/build-editor';
    mockLocation.search = '?id=saved-1';
    mockAcquireSession.mockResolvedValue('session-1');
    mockAssertSessionCurrent.mockImplementation(() => undefined);
    const initialBuildEditor = buildEditorReducer(undefined, { type: 'test/initial' });
    const buildEditor = {
      ...initialBuildEditor,
      build: { ...initialBuildEditor.build, name: 'Verified Build' },
    };
    mockGetState.mockReturnValue({
      buildEditor,
      savedBuilds: {
        builds: [{ id: 'saved-1', savedAt: '2026-08-30T00:00:00.000Z', build: buildEditor.build }],
      },
    });
    mockPutSavedBuildAndEditorState.mockResolvedValue(undefined);
  });

  it('reports success only after the durable build and editor pointer commit', async () => {
    const { result } = renderHook(() => useSaveBuild());

    let saved = false;
    await act(async () => {
      saved = await result.current();
    });

    expect(saved).toBe(true);
    expect(mockPutSavedBuildAndEditorState).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'saved-1' }),
      0,
      'session-1',
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'savedBuilds/upsertSavedBuild',
        payload: expect.objectContaining({ id: 'saved-1' }),
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'buildEditor/markSaved' }),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockEnqueue).toHaveBeenCalledWith('Build updated.', { variant: 'success' });
  });

  it('does not mutate Redux or claim success when browser storage is unavailable', async () => {
    mockPutSavedBuildAndEditorState.mockRejectedValue(
      new DOMException('Quota exceeded', 'QuotaExceededError'),
    );
    const { result } = renderHook(() => useSaveBuild());

    let saved = true;
    await act(async () => {
      saved = await result.current();
    });

    expect(saved).toBe(false);
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockEnqueue).toHaveBeenCalledWith(
      'Build could not be saved. Export a backup and check browser storage.',
      { variant: 'error' },
    );
  });

  it('does not repopulate Redux when logout rotates the storage session during a save', async () => {
    const commit = deferred<void>();
    mockPutSavedBuildAndEditorState.mockReturnValueOnce(commit.promise);
    mockAssertSessionCurrent.mockImplementationOnce(() => {
      throw new Error('storage session changed');
    });
    const { result } = renderHook(() => useSaveBuild());

    let savePromise!: Promise<boolean>;
    act(() => {
      savePromise = result.current();
    });

    await act(async () => {
      commit.resolve();
      await expect(savePromise).resolves.toBe(false);
    });

    expect(mockPutSavedBuildAndEditorState).toHaveBeenCalledWith(
      expect.any(Object),
      0,
      'session-1',
    );
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('creates a new save for a stale id, removes legacy build data, and preserves roster context', async () => {
    const state = mockGetState();
    mockGetState.mockReturnValue({ ...state, savedBuilds: { builds: [] } });
    mockLocation.search = '?id=stale-id&b=legacy-data&slot=dps3&rid=r1&from=roster';
    const { result } = renderHook(() => useSaveBuild());

    await act(async () => {
      await expect(result.current()).resolves.toBe(true);
    });

    const upsertAction = mockDispatch.mock.calls.find(
      ([action]) => (action as { type?: string }).type === 'savedBuilds/upsertSavedBuild',
    )?.[0] as { payload: { id: string } };
    expect(upsertAction.payload.id).not.toBe('stale-id');
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const destination = mockNavigate.mock.calls[0][0] as { search: string };
    const params = new URLSearchParams(destination.search);
    expect(params.get('id')).toBe(upsertAction.payload.id);
    expect(params.has('b')).toBe(false);
    expect(params.get('slot')).toBe('dps3');
    expect(params.get('rid')).toBe('r1');
    expect(params.get('from')).toBe('roster');
    expect(mockEnqueue).toHaveBeenCalledWith('Build saved.', { variant: 'success' });
  });

  it('rejects a blank build name before writing or dispatching', async () => {
    const state = mockGetState();
    mockGetState.mockReturnValue({
      ...state,
      buildEditor: {
        ...state.buildEditor,
        build: { ...state.buildEditor.build, name: '   ' },
      },
    });
    const { result } = renderHook(() => useSaveBuild());

    await act(async () => {
      await expect(result.current()).resolves.toBe(false);
    });

    expect(mockPutSavedBuildAndEditorState).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockEnqueue).toHaveBeenCalledWith('Please enter a build name before saving.', {
      variant: 'warning',
    });
  });

  it('finishes the durable commit without updating editor UI after unmount', async () => {
    const commit = deferred<void>();
    mockPutSavedBuildAndEditorState.mockReturnValueOnce(commit.promise);
    const { result, unmount } = renderHook(() => useSaveBuild());

    let savePromise!: Promise<boolean>;
    act(() => {
      savePromise = result.current();
    });
    unmount();

    await act(async () => {
      commit.resolve();
      await expect(savePromise).resolves.toBe(true);
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'savedBuilds/upsertSavedBuild' }),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'buildEditor/markSaved' }),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it('finishes an A save without updating B after the location key changes', async () => {
    const state = mockGetState();
    mockGetState.mockReturnValue({ ...state, savedBuilds: { builds: [] } });
    const commit = deferred<void>();
    mockPutSavedBuildAndEditorState.mockReturnValueOnce(commit.promise);
    const { result, rerender } = renderHook(() => useSaveBuild());

    let savePromise!: Promise<boolean>;
    act(() => {
      savePromise = result.current();
    });
    mockLocation.key = 'location-b';
    rerender();

    await act(async () => {
      commit.resolve();
      await expect(savePromise).resolves.toBe(true);
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'savedBuilds/upsertSavedBuild' }),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'buildEditor/markSaved' }),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it('deduplicates simultaneous saves started by separate hook consumers', async () => {
    const commit = deferred<void>();
    mockPutSavedBuildAndEditorState.mockReturnValueOnce(commit.promise);
    const first = renderHook(() => useSaveBuild());
    const second = renderHook(() => useSaveBuild());

    let firstSave!: Promise<boolean>;
    let secondSave!: Promise<boolean>;
    act(() => {
      firstSave = first.result.current();
      secondSave = second.result.current();
    });

    await expect(secondSave).resolves.toBe(false);
    expect(mockPutSavedBuildAndEditorState).toHaveBeenCalledTimes(1);

    await act(async () => {
      commit.resolve();
      await expect(firstSave).resolves.toBe(true);
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'savedBuilds/upsertSavedBuild' }),
    );
  });
});
