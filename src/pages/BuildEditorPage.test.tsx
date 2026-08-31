import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

// The editor shell is a heavy subtree irrelevant to the load orchestration —
// stub it to a marker. We only assert how BuildEditorPage sources the build to
// edit (router state vs the legacy ?b= param) and how it cleans the URL/history
// afterwards.
jest.mock('@features/build-editor/components/BuildEditorShell', () => ({
  BuildEditorShell: () => <div data-testid="editor-shell" />,
}));

// Stub the decoder so tests control success/failure without real (de)compression.
jest.mock('@/utils/buildEncoding', () => ({
  decodeBuildFromURL: jest.fn(),
}));

// Tag the loadBuild action so we can assert it was dispatched with the decoded
// build, without pulling in the real slice (and its migrate side effects).
jest.mock('@features/build-editor/store/buildEditorSlice', () => ({
  loadBuild: jest.fn((build: unknown) => ({ type: 'buildEditor/loadBuild', payload: build })),
  loadDraftBuild: jest.fn((build: unknown) => ({
    type: 'buildEditor/loadDraftBuild',
    payload: build,
  })),
  resetBuild: jest.fn(() => ({ type: 'buildEditor/resetBuild' })),
}));

// notistack's useSnackbar needs a provider; stub it.
const mockEnqueue = jest.fn();
jest.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: mockEnqueue }),
}));

// Capture dispatched actions; isDirty selector returns false (no unload guard).
const mockDispatch = jest.fn();
const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

import { decodeBuildFromURL } from '@/utils/buildEncoding';
import {
  loadBuild,
  loadDraftBuild,
  resetBuild,
} from '@features/build-editor/store/buildEditorSlice';
import type { Build } from '@features/build-editor/types/build.types';

import { BuildEditorPage } from './BuildEditorPage';

const mockDecode = decodeBuildFromURL as jest.MockedFunction<typeof decodeBuildFromURL>;
const mockLoadBuild = loadBuild as unknown as jest.Mock;
const mockLoadDraftBuild = loadDraftBuild as unknown as jest.Mock;
const mockResetBuild = resetBuild as unknown as jest.Mock;

const decodedBuild: Build = {
  id: 'b1',
  name: 'Decoded Build',
  shortDescription: '',
  esoClass: 'dragonknight',
  classSkillLines: ['class.ardent-flame', 'class.draconic-power', 'class.earthen-heart'],
  classMasteryPassives: [],
  role: 'tank',
  gameMode: 'pve',
  races: [],
  setups: [
    {
      id: 'setup-1',
      name: 'Default',
      attributes: { magicka: 0, health: 0, stamina: 0 },
      curse: 'none',
      mundusStone: '',
      gear: {},
      skills: { 0: {}, 1: {} },
      cp: {
        warfare: { slots: [null, null, null, null], passives: {} },
        fitness: { slots: [null, null, null, null], passives: {} },
        craft: { slots: [null, null, null, null], passives: {} },
      },
      consumables: { potions: [], food: {} },
      passives: [],
      screenshots: [],
    },
  ],
  guide: { content: '', youtubeUrl: '', bannerImageUrl: '' },
  settings: { visibility: 'private', dlc: 'Base Game', setupOrder: [0] },
  addonImportString: '',
  createdAt: '2026-08-30T00:00:00.000Z',
  updatedAt: '2026-08-30T00:00:00.000Z',
};

/** Surfaces the live router location so tests can assert URL + state. */
const LocationProbe: React.FC = () => {
  const location = useLocation();
  return (
    <>
      <span data-testid="search">{location.search}</span>
      <span data-testid="state">{JSON.stringify(location.state)}</span>
    </>
  );
};

const FirstSaveProbe: React.FC = () => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() =>
        navigate('/build-editor?id=first-save', {
          replace: true,
          state: { savedByEditor: 'first-save' },
        })
      }
    >
      Simulate first save
    </button>
  );
};

const NavigationProbe: React.FC = () => {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate('/elsewhere')}>
        Leave editor
      </button>
      <button
        type="button"
        onClick={() => navigate('/build-editor?b=same-blob&slot=second&from=roster')}
      >
        Change route context
      </button>
    </>
  );
};

const renderAt = (entry: {
  pathname: string;
  search?: string;
  state?: Record<string, unknown> | null;
}) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route
          path="/build-editor"
          element={
            <>
              <BuildEditorPage />
              <LocationProbe />
              <FirstSaveProbe />
              <NavigationProbe />
            </>
          }
        />
        <Route path="/elsewhere" element={<div data-testid="elsewhere">Elsewhere</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('BuildEditorPage build loading', () => {
  beforeEach(() => {
    // resetMocks (jest.config) wipes implementations between tests — re-establish
    // defaults so bare jest.fn()s never return undefined.
    mockDecode.mockResolvedValue(decodedBuild);
    mockLoadBuild.mockImplementation((build: unknown) => ({
      type: 'buildEditor/loadBuild',
      payload: build,
    }));
    mockLoadDraftBuild.mockImplementation((build: unknown) => ({
      type: 'buildEditor/loadDraftBuild',
      payload: build,
    }));
    mockResetBuild.mockImplementation(() => ({ type: 'buildEditor/resetBuild' }));
    mockUseSelector.mockImplementation(
      (selector: (state: { savedBuilds: { builds: unknown[] } }) => unknown) =>
        selector({ savedBuilds: { builds: [] } }),
    );
  });

  it('loads a legacy router-state document as an unsaved draft and clears the state', async () => {
    renderAt({
      pathname: '/build-editor',
      state: { buildData: 'state-blob' },
    });

    await waitFor(() => expect(mockDecode).toHaveBeenCalledWith('state-blob'));
    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'buildEditor/loadDraftBuild',
        payload: decodedBuild,
      }),
    );

    expect(screen.getByTestId('search').textContent).toBe('');
    expect(screen.getByTestId('search').textContent).not.toContain('b=');
    // Router state is cleared so a refresh/Back doesn't reload over edits.
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('null'));
  });

  it('loads a complete in-app document directly without routing it through the compact codec', async () => {
    renderAt({
      pathname: '/build-editor',
      state: { build: decodedBuild },
    });

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'buildEditor/loadDraftBuild',
        payload: decodedBuild,
      }),
    );
    expect(mockDecode).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('null'));
  });

  it('does not mount the editor until asynchronous decoding completes', async () => {
    let resolveDecode: ((build: typeof decodedBuild) => void) | undefined;
    mockDecode.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDecode = resolve;
        }) as ReturnType<typeof decodeBuildFromURL>,
    );

    renderAt({
      pathname: '/build-editor',
      state: { buildData: 'slow-blob' },
    });

    expect(screen.getByRole('status')).toHaveTextContent('Opening build');
    expect(screen.queryByTestId('editor-shell')).not.toBeInTheDocument();

    resolveDecode?.(decodedBuild);
    await waitFor(() => expect(screen.getByTestId('editor-shell')).toBeInTheDocument());
  });

  it('ignores an asynchronous decode that completes after the editor unmounts', async () => {
    let resolveDecode: ((build: typeof decodedBuild) => void) | undefined;
    mockDecode.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDecode = resolve;
        }) as ReturnType<typeof decodeBuildFromURL>,
    );

    renderAt({ pathname: '/build-editor', search: '?b=slow-blob', state: null });
    await waitFor(() => expect(mockDecode).toHaveBeenCalledWith('slow-blob'));

    fireEvent.click(screen.getByRole('button', { name: 'Leave editor' }));
    expect(screen.getByTestId('elsewhere')).toBeInTheDocument();

    await act(async () => {
      resolveDecode?.(decodedBuild);
      await Promise.resolve();
    });

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockEnqueue).not.toHaveBeenCalled();
    expect(screen.getByTestId('elsewhere')).toBeInTheDocument();
  });

  it('invalidates an in-flight decode when the same payload moves to a new route context', async () => {
    const resolvers: Array<(build: typeof decodedBuild) => void> = [];
    mockDecode.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve);
        }) as ReturnType<typeof decodeBuildFromURL>,
    );

    renderAt({
      pathname: '/build-editor',
      search: '?b=same-blob&slot=first&from=roster',
      state: null,
    });
    await waitFor(() => expect(mockDecode).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Change route context' }));
    await waitFor(() => expect(mockDecode).toHaveBeenCalledTimes(2));

    await act(async () => {
      resolvers[0]?.(decodedBuild);
      await Promise.resolve();
    });
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(screen.getByTestId('search')).toHaveTextContent('?b=same-blob&slot=second&from=roster');

    await act(async () => {
      resolvers[1]?.(decodedBuild);
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'buildEditor/loadDraftBuild',
        payload: decodedBuild,
      }),
    );
    await waitFor(() =>
      expect(screen.getByTestId('search')).toHaveTextContent('?slot=second&from=roster'),
    );
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  it('keeps roster round-trip params in the URL when loading from state', async () => {
    renderAt({
      pathname: '/build-editor',
      search: '?slot=dps3&rid=r1&from=roster',
      state: { buildData: 'roster-blob' },
    });

    await waitFor(() => expect(mockDecode).toHaveBeenCalledWith('roster-blob'));
    expect(screen.getByTestId('search').textContent).toBe('?slot=dps3&rid=r1&from=roster');
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('null'));
  });

  it('loads from the legacy ?b= param as a draft and drops an unrelated ?id= target', async () => {
    renderAt({
      pathname: '/build-editor',
      search: '?b=url-blob&id=saved-2',
      state: null,
    });

    await waitFor(() => expect(mockDecode).toHaveBeenCalledWith('url-blob'));
    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'buildEditor/loadDraftBuild',
        payload: decodedBuild,
      }),
    );
    await waitFor(() => expect(screen.getByTestId('search').textContent).toBe(''));
    expect(screen.getByTestId('search').textContent).not.toContain('b=');
  });

  it('prefers ?b= over router state when both are present (back-compat)', async () => {
    renderAt({
      pathname: '/build-editor',
      search: '?b=url-blob',
      state: { buildData: 'state-blob' },
    });

    await waitFor(() => expect(mockDecode).toHaveBeenCalledWith('url-blob'));
    expect(mockDecode).not.toHaveBeenCalledWith('state-blob');
    await waitFor(() => expect(screen.getByTestId('search').textContent).not.toContain('b='));
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('null'));
  });

  it('does nothing when there is no payload or saved-build target', async () => {
    renderAt({ pathname: '/build-editor', state: null });

    await waitFor(() => expect(screen.getByTestId('editor-shell')).toBeInTheDocument());
    expect(mockDecode).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(screen.getByTestId('search').textContent).toBe('');
  });

  it('resets the recovery draft only when navigation explicitly requests a new build', async () => {
    renderAt({ pathname: '/build-editor', state: { newBuild: true } });

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'buildEditor/resetBuild' }),
    );
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('null'));
    expect(mockLoadBuild).not.toHaveBeenCalled();
    expect(mockLoadDraftBuild).not.toHaveBeenCalled();
  });

  it('does not rehydrate and reset editor context when the first save adds its id', async () => {
    mockUseSelector.mockImplementation(
      (selector: (state: { savedBuilds: { builds: unknown[] } }) => unknown) =>
        selector({
          savedBuilds: {
            builds: [
              { id: 'first-save', savedAt: '2026-08-30T00:00:00.000Z', build: decodedBuild },
            ],
          },
        }),
    );
    renderAt({ pathname: '/build-editor', state: null });
    await waitFor(() => expect(screen.getByTestId('editor-shell')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Simulate first save' }));

    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('?id=first-save'));
    expect(mockLoadBuild).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('hydrates a saved build by id before mounting the editor', async () => {
    mockUseSelector.mockImplementation(
      (selector: (state: { savedBuilds: { builds: unknown[] } }) => unknown) =>
        selector({
          savedBuilds: {
            builds: [{ id: 'saved-3', savedAt: '2026-08-30T00:00:00.000Z', build: decodedBuild }],
          },
        }),
    );

    renderAt({ pathname: '/build-editor', search: '?id=saved-3', state: null });

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'buildEditor/loadBuild',
        payload: decodedBuild,
      }),
    );
    expect(screen.getByTestId('editor-shell')).toBeInTheDocument();
    expect(screen.getByTestId('search').textContent).toBe('?id=saved-3');
  });

  it('prefers a durable saved id over stale router state and clears that state', async () => {
    mockUseSelector.mockImplementation(
      (selector: (state: { savedBuilds: { builds: unknown[] } }) => unknown) =>
        selector({
          savedBuilds: {
            builds: [{ id: 'saved-3', savedAt: '2026-08-30T00:00:00.000Z', build: decodedBuild }],
          },
        }),
    );

    renderAt({
      pathname: '/build-editor',
      search: '?id=saved-3',
      state: { buildData: 'stale-state-blob' },
    });

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'buildEditor/loadBuild',
        payload: decodedBuild,
      }),
    );
    expect(mockDecode).not.toHaveBeenCalled();
    expect(mockLoadDraftBuild).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('null'));
  });

  it('fails closed when a saved build id no longer exists', async () => {
    renderAt({ pathname: '/build-editor', search: '?id=missing', state: null });

    await waitFor(() => expect(mockEnqueue).toHaveBeenCalled());
    expect(mockDispatch).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('search').textContent).toBe(''));
    expect(screen.getByTestId('editor-shell')).toBeInTheDocument();
  });

  it('on router-state decode failure: scrubs the private payload and fails closed', async () => {
    mockDecode.mockResolvedValue(null);
    renderAt({
      pathname: '/build-editor',
      state: { buildData: 'bad-blob' },
    });

    await waitFor(() => expect(mockDecode).toHaveBeenCalledWith('bad-blob'));
    // The blob must NOT linger in history.state on the failure path — a
    // version-skewed/corrupt private payload must not survive a refresh/restore.
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('null'));
    await waitFor(() => expect(screen.getByTestId('search').textContent).toBe(''));
    expect(mockDispatch).not.toHaveBeenCalled();
    await waitFor(() => expect(mockEnqueue).toHaveBeenCalled());
  });

  it('on decode failure: strips ?b= and ?id= but keeps roster round-trip params', async () => {
    mockDecode.mockResolvedValue(null);
    renderAt({
      pathname: '/build-editor',
      search: '?b=bad-blob&slot=dps3&rid=r1&from=roster&id=saved-9',
      state: null,
    });

    await waitFor(() => expect(mockDecode).toHaveBeenCalledWith('bad-blob'));
    await waitFor(() => {
      const params = new URLSearchParams(screen.getByTestId('search').textContent ?? '');
      expect(params.has('b')).toBe(false);
      expect(params.has('id')).toBe(false);
      // Roster round-trip context is harmless (no overwrite risk) and preserved.
      expect(params.get('slot')).toBe('dps3');
      expect(params.get('from')).toBe('roster');
    });
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('loads the build at most once on mount — the loadedRef guard keeps it idempotent (no reload over edits)', async () => {
    // StrictMode intentionally invokes mount effects twice in dev. This is the
    // deterministic proxy for the refactor's core risk: because the build now
    // lives in router state (which survives a remount/refresh), a missing
    // idempotency guard would dispatch loadBuild a second time and clobber the
    // user's in-progress edits with the original build. The loadedRef guard must
    // make the load fire exactly once.
    render(
      <React.StrictMode>
        <MemoryRouter
          initialEntries={[
            {
              pathname: '/build-editor',
              state: { buildData: 'state-blob' },
            },
          ]}
        >
          <Routes>
            <Route
              path="/build-editor"
              element={
                <>
                  <BuildEditorPage />
                  <LocationProbe />
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      </React.StrictMode>,
    );

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'buildEditor/loadDraftBuild',
        payload: decodedBuild,
      }),
    );
    // Without the guard, StrictMode's double-invoke would decode + dispatch twice.
    expect(mockDecode).toHaveBeenCalledTimes(1);
    const loadCalls = mockDispatch.mock.calls.filter(
      (c) => (c[0] as { type?: string })?.type === 'buildEditor/loadDraftBuild',
    );
    expect(loadCalls).toHaveLength(1);
  });
});
