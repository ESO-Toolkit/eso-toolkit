import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

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
}));

// notistack's useSnackbar needs a provider; stub it.
const mockEnqueue = jest.fn();
jest.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: mockEnqueue }),
}));

// Capture dispatched actions; isDirty selector returns false (no unload guard).
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: jest.fn(() => false),
}));

import { loadBuild } from '@features/build-editor/store/buildEditorSlice';
import { decodeBuildFromURL } from '@/utils/buildEncoding';

import { BuildEditorPage } from './BuildEditorPage';

const mockDecode = decodeBuildFromURL as jest.MockedFunction<typeof decodeBuildFromURL>;
const mockLoadBuild = loadBuild as unknown as jest.Mock;

const decodedBuild = { id: 'b1', name: 'Decoded Build' } as never;

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
            </>
          }
        />
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
  });

  it('loads a build from router state, clears the state, and keeps ?id= — no blob in the URL', async () => {
    renderAt({
      pathname: '/build-editor',
      search: '?id=saved-1',
      state: { buildData: 'state-blob' },
    });

    await waitFor(() => expect(mockDecode).toHaveBeenCalledWith('state-blob'));
    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'buildEditor/loadBuild',
        payload: decodedBuild,
      }),
    );

    // The non-sensitive save target stays; the build blob never entered the URL.
    expect(screen.getByTestId('search').textContent).toBe('?id=saved-1');
    expect(screen.getByTestId('search').textContent).not.toContain('b=');
    // Router state is cleared so a refresh/Back doesn't reload over edits.
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('null'));
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

  it('loads from the legacy ?b= param and strips it, preserving ?id=', async () => {
    renderAt({
      pathname: '/build-editor',
      search: '?b=url-blob&id=saved-2',
      state: null,
    });

    await waitFor(() => expect(mockDecode).toHaveBeenCalledWith('url-blob'));
    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'buildEditor/loadBuild',
        payload: decodedBuild,
      }),
    );
    await waitFor(() => expect(screen.getByTestId('search').textContent).toBe('?id=saved-2'));
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
  });

  it('does nothing when there is no payload (no ?b=, no state)', async () => {
    renderAt({ pathname: '/build-editor', search: '?id=saved-3', state: null });

    await waitFor(() => expect(screen.getByTestId('editor-shell')).toBeInTheDocument());
    expect(mockDecode).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(screen.getByTestId('search').textContent).toBe('?id=saved-3');
  });

  it('on decode failure: scrubs the private payload AND drops the ?id= save target (fail-closed)', async () => {
    mockDecode.mockResolvedValue(null);
    renderAt({
      pathname: '/build-editor',
      search: '?id=saved-9',
      state: { buildData: 'bad-blob' },
    });

    await waitFor(() => expect(mockDecode).toHaveBeenCalledWith('bad-blob'));
    // The blob must NOT linger in history.state on the failure path — a
    // version-skewed/corrupt private payload must not survive a refresh/restore.
    await waitFor(() => expect(screen.getByTestId('state').textContent).toBe('null'));
    // The ?id= save target is dropped so a later Save can't overwrite saved-9 with
    // the stale/default editor state that never loaded the intended build.
    await waitFor(() => {
      const params = new URLSearchParams(screen.getByTestId('search').textContent ?? '');
      expect(params.has('id')).toBe(false);
    });
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
              search: '?id=saved-1',
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
        type: 'buildEditor/loadBuild',
        payload: decodedBuild,
      }),
    );
    // Without the guard, StrictMode's double-invoke would decode + dispatch twice.
    expect(mockDecode).toHaveBeenCalledTimes(1);
    const loadCalls = mockDispatch.mock.calls.filter(
      (c) => (c[0] as { type?: string })?.type === 'buildEditor/loadBuild',
    );
    expect(loadCalls).toHaveLength(1);
  });
});
