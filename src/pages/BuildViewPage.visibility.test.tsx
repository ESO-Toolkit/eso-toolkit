import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// The page pulls in a large tree of presentational + data modules that are
// irrelevant to the visibility-enforcement effect under test. Stub the heavy
// leaves so the test stays focused on the load orchestration. Decode returning
// null keeps the heavy build-render path out of these tests; they assert the
// load/visibility flow and exercise the not-found branch (notFound || !build).
jest.mock('../utils/buildEncoding', () => ({
  decodeBuildFromURL: jest.fn(async () => null),
  encodeBuildToURL: jest.fn(async () => ''),
}));

jest.mock('../features/loadout-manager/data/skillLineSkills', () => ({
  preloadSkillData: jest.fn(),
  getSkillById: jest.fn(() => null),
}));

jest.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({ accessToken: null }),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => []),
}));

// Mock the view-transition navigate so we can assert the exact target the
// Edit/Remix button navigates to without pulling in startViewTransition/morph.
const mockNavigate = jest.fn();
jest.mock('../hooks/useViewTransitionNavigate', () => ({
  useViewTransitionNavigate: () => mockNavigate,
}));

// The page gates its render on the fetched item data; this suite exercises
// visibility logic only, so report it ready.
jest.mock('../hooks/useItemDataReady', () => ({
  useItemDataReady: () => ({ ready: true, failed: false }),
}));

jest.mock('../features/build-hub/api/build-hub-api', () => ({
  buildHubApi: { get: jest.fn() },
}));

// BuildViewShell wraps the full (heavy) build view. For visibility tests we
// only need to know whether a build body rendered, so stub it to a marker that
// wraps its children.
jest.mock('../features/build-viewer/components/BuildViewShell', () => ({
  BuildViewShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="build-shell">{children}</div>
  ),
}));

import { useSelector } from 'react-redux';

import { buildHubApi } from '../features/build-hub/api/build-hub-api';
import { decodeBuildFromURL, encodeBuildToURL } from '../utils/buildEncoding';
import { BuildViewPage } from './BuildViewPage';

const mockGet = buildHubApi.get as jest.MockedFunction<typeof buildHubApi.get>;
const mockDecode = decodeBuildFromURL as jest.MockedFunction<typeof decodeBuildFromURL>;
const mockEncode = encodeBuildToURL as jest.MockedFunction<typeof encodeBuildToURL>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const renderWithStaleState = (buildId: string, staleBuildData: string) =>
  render(
    <MemoryRouter
      initialEntries={[
        { pathname: '/bv', search: `?id=${buildId}`, state: { buildData: staleBuildData } },
      ]}
    >
      <Routes>
        <Route path="/bv" element={<BuildViewPage />} />
      </Routes>
    </MemoryRouter>,
  );

// A decoded build complete enough for the page's render path (it reads guide,
// setups, esoClass, etc.). Only the fields the render touches need to be real.
const fullBuild = (visibility: string) =>
  ({
    id: 'b1',
    name: 'Test',
    shortDescription: '',
    esoClass: 'sorcerer',
    classSkillLines: [null, null, null],
    classMasteryPassives: [],
    role: 'magicka-dps',
    gameMode: 'pve',
    races: [],
    setups: [],
    guide: { content: '', youtubeUrl: '', bannerImageUrl: '' },
    settings: { visibility, dlc: 'Base Game', setupOrder: [] },
    addonImportString: '',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }) as never;

const renderEncoded = (encoded: string, state?: Record<string, unknown>) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/bv', search: `?b=${encoded}`, state }]}>
      <Routes>
        <Route path="/bv" element={<BuildViewPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('BuildViewPage visibility enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks wipes implementations; re-assert defaults so bare jest.fn()s
    // never return undefined (which would break `.then` / `savedBuilds.find`).
    mockDecode.mockResolvedValue(null);
    mockEncode.mockResolvedValue('');
    mockUseSelector.mockReturnValue([]);
    mockNavigate.mockReset();
  });

  it('resolves ?id= builds only through the visibility-checked API, never router state', async () => {
    mockGet.mockResolvedValue({
      build: { build_data: 'authoritative-data' },
    } as Awaited<ReturnType<typeof buildHubApi.get>>);

    renderWithStaleState('build-123', 'stale-cached-data');

    // The visibility-enforced fetch must run for the id route.
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('build-123', null));
    // Only the authoritative payload is decoded — the stale router state
    // ('stale-cached-data') must never be passed to the decoder/render path.
    await waitFor(() => expect(decodeBuildFromURL).toHaveBeenCalledWith('authoritative-data'));
    expect(decodeBuildFromURL).not.toHaveBeenCalledWith('stale-cached-data');
  });

  it('never renders stale router-state content while the API is still pending', async () => {
    // The stale router data WOULD decode to a real build — but it must never be
    // rendered. Hold the visibility check pending: a now-private build must not
    // flash (or hang) into view from cached location.state.
    mockDecode.mockImplementation(async (data: string) =>
      data === 'stale-cached-data'
        ? ({ id: 'b', esoClass: 'sorcerer', setups: [] } as never)
        : null,
    );
    let resolveGet: (() => void) | undefined;
    mockGet.mockReturnValue(
      new Promise((resolve) => {
        resolveGet = () => resolve({ build: { build_data: 'x' } } as never);
      }) as ReturnType<typeof buildHubApi.get>,
    );

    renderWithStaleState('build-123', 'stale-cached-data');

    // While the API is pending the loading skeleton holds; no build body renders.
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(screen.queryByTestId('build-shell')).not.toBeInTheDocument();
    expect(decodeBuildFromURL).not.toHaveBeenCalledWith('stale-cached-data');
    resolveGet?.();
  });

  it('shows not-found when revalidation 404s, even with stale router state', async () => {
    // Build was public when the Hub tab loaded but is now private: 404s here.
    mockGet.mockRejectedValue({ status: 404 });

    renderWithStaleState('build-123', 'stale-cached-data');

    await waitFor(() => expect(screen.getByText(/No build found/i)).toBeInTheDocument());
    expect(screen.queryByTestId('build-shell')).not.toBeInTheDocument();
  });

  it('overrides stale embedded visibility with the authoritative Hub value on ?id= loads', async () => {
    // Blob says public, but the Hub record is now private and the API authorized
    // this viewer (owner). The build renders, and the effective visibility is the
    // server's — proven by the ?b= copy guard downstream reading server truth.
    mockGet.mockResolvedValue({
      build: { build_data: 'blob-marked-public', visibility: 'private' },
    } as Awaited<ReturnType<typeof buildHubApi.get>>);
    mockDecode.mockResolvedValue(fullBuild('public'));

    render(
      <MemoryRouter initialEntries={[{ pathname: '/bv', search: '?id=build-9' }]}>
        <Routes>
          <Route path="/bv" element={<BuildViewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    // Owner-authorized private build loads via the id path and renders.
    await waitFor(() => expect(screen.getByTestId('build-shell')).toBeInTheDocument());
    expect(screen.queryByText(/No build found/i)).not.toBeInTheDocument();
  });

  it('overrides stale embedded name/description with the authoritative Hub title/description on ?id= loads', async () => {
    // The blob carries a STALE name/description (e.g. the publish-time re-encode
    // fell back to the original blob, or the build predates dialog title sync).
    // The Hub record's title/description columns are authoritative, so the
    // opened build must match its Hub card — not the stale blob.
    mockGet.mockResolvedValue({
      build: {
        build_data: 'blob-with-stale-name',
        visibility: 'public',
        title: 'Authoritative Title',
        description: 'Authoritative description',
      },
    } as Awaited<ReturnType<typeof buildHubApi.get>>);
    mockDecode.mockResolvedValue({
      ...(fullBuild('public') as Record<string, unknown>),
      name: 'Stale Name',
      shortDescription: 'Stale description',
    } as never);

    render(
      <MemoryRouter initialEntries={[{ pathname: '/bv', search: '?id=build-7' }]}>
        <Routes>
          <Route path="/bv" element={<BuildViewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByTestId('build-shell')).toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Authoritative Title');
    expect(screen.getByText('Authoritative description')).toBeInTheDocument();
    expect(screen.queryByText('Stale Name')).not.toBeInTheDocument();
    expect(screen.queryByText('Stale description')).not.toBeInTheDocument();
    // The retained payload (share `?b=` link + Remix/Edit → /build-editor?b=) is
    // re-encoded with server truth so the editor never reopens with the stale
    // metadata that a later republish could reintroduce.
    await waitFor(() =>
      expect(mockEncode).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Authoritative Title',
          shortDescription: 'Authoritative description',
        }),
      ),
    );
  });

  it('does not re-encode the retained payload when the blob already matches the Hub metadata', async () => {
    mockGet.mockResolvedValue({
      build: {
        build_data: 'fresh-blob',
        visibility: 'public',
        title: 'Same Title',
        description: 'Same description',
      },
    } as Awaited<ReturnType<typeof buildHubApi.get>>);
    mockDecode.mockResolvedValue({
      ...(fullBuild('public') as Record<string, unknown>),
      name: 'Same Title',
      shortDescription: 'Same description',
    } as never);

    render(
      <MemoryRouter initialEntries={[{ pathname: '/bv', search: '?id=build-8' }]}>
        <Routes>
          <Route path="/bv" element={<BuildViewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByTestId('build-shell')).toBeInTheDocument());
    expect(mockEncode).not.toHaveBeenCalled();
  });

  it('fails closed: a private ?id= build with a stale public blob + failed re-encode never leaks the blob to the editor', async () => {
    // The owner-authorized API returns a now-Private row, but its stored blob
    // still encodes Public. The authoritative visibility is Private, so when the
    // re-encode fails we must NOT retain the stale Public blob for the editor —
    // Open-in-Editor would otherwise reopen the build as Public.
    mockGet.mockResolvedValue({
      build: {
        build_data: 'stale-public-blob',
        visibility: 'private',
        title: 'My Private Build',
        description: '',
      },
    } as Awaited<ReturnType<typeof buildHubApi.get>>);
    mockDecode.mockResolvedValue(fullBuild('public'));
    mockEncode.mockResolvedValue(''); // re-encode fails

    render(
      <MemoryRouter initialEntries={[{ pathname: '/bv', search: '?id=build-private' }]}>
        <Routes>
          <Route path="/bv" element={<BuildViewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByTestId('build-shell')).toBeInTheDocument());
    await waitFor(() => expect(mockEncode).toHaveBeenCalled());

    // Remix/Edit must not open the editor with the dropped payload — the guard
    // refuses to navigate rather than dropping the user into an empty/unrelated
    // editor (and certainly never with the stale Public blob).
    fireEvent.click(
      screen.getByRole('button', { name: /open your own editable copy|edit your saved build/i }),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('fails closed for an OWNED build too: dropped payload never opens the editor with an empty ?b= (no save-target corruption)', async () => {
    // Same dropped-payload scenario, but the viewer owns a local saved copy of
    // the build. Navigating /build-editor?b=&id=<savedId> would open a blank
    // editor while ?id= stays the save target — a save would overwrite the
    // saved build with blank data. The guard must refuse to navigate.
    mockUseSelector.mockReturnValue([{ id: 'saved-1', build: { id: 'b1' } }]);
    mockGet.mockResolvedValue({
      build: {
        build_data: 'stale-public-blob',
        visibility: 'private',
        title: 'My Private Build',
        description: '',
      },
    } as Awaited<ReturnType<typeof buildHubApi.get>>);
    mockDecode.mockResolvedValue(fullBuild('public')); // id 'b1', matches the saved build
    mockEncode.mockResolvedValue(''); // re-encode fails → payload dropped

    render(
      <MemoryRouter initialEntries={[{ pathname: '/bv', search: '?id=build-private' }]}>
        <Routes>
          <Route path="/bv" element={<BuildViewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByTestId('build-shell')).toBeInTheDocument());
    await waitFor(() => expect(mockEncode).toHaveBeenCalled());

    fireEvent.click(
      screen.getByRole('button', { name: /edit your saved build|open your own editable copy/i }),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('rejects a Private ?b= payload (forwarded/address-bar link) as not-found', async () => {
    mockDecode.mockResolvedValue({ settings: { visibility: 'private' } } as never);

    renderEncoded('encoded-private-build');

    await waitFor(() => expect(screen.getByText(/No build found/i)).toBeInTheDocument());
    expect(screen.queryByTestId('build-shell')).not.toBeInTheDocument();
  });

  it('renders a non-private ?b= payload normally', async () => {
    mockDecode.mockResolvedValue(fullBuild('link-only'));

    renderEncoded('encoded-link-only-build');

    // A non-private self-contained link is accepted (no not-found short-circuit).
    await waitFor(() => expect(screen.getByTestId('build-shell')).toBeInTheDocument());
    expect(screen.queryByText(/No build found/i)).not.toBeInTheDocument();
  });

  it('allows a Private ?b= payload through the trusted in-app owner preview', async () => {
    mockDecode.mockResolvedValue(fullBuild('private'));

    renderEncoded('encoded-private-build', { ownerPreview: true });

    // ownerPreview relaxes the Private rejection: the build renders, not 404'd.
    await waitFor(() => expect(screen.getByTestId('build-shell')).toBeInTheDocument());
    expect(screen.queryByText(/No build found/i)).not.toBeInTheDocument();
  });

  it('renders a Private owner preview from router state with no blob in the URL', async () => {
    mockDecode.mockResolvedValue(fullBuild('private'));

    // My Builds → View of an own Private build: blob lives in router state
    // (previewBuild), not in the URL. No ?b= / ?id= search params.
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/bv',
            search: '',
            state: { ownerPreview: true, previewBuild: 'private-blob-in-state' },
          },
        ]}
      >
        <Routes>
          <Route path="/bv" element={<BuildViewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    // The owner's private build renders, decoded from the state-carried blob.
    await waitFor(() => expect(mockDecode).toHaveBeenCalledWith('private-blob-in-state'));
    await waitFor(() => expect(screen.getByTestId('build-shell')).toBeInTheDocument());
    expect(screen.queryByText(/No build found/i)).not.toBeInTheDocument();
  });

  it('does not render a private build from bare router state without ownerPreview', async () => {
    mockDecode.mockResolvedValue(fullBuild('private'));

    // previewBuild without the ownerPreview flag must be ignored (an untrusted
    // state shape can't smuggle a build into the no-params not-found path).
    render(
      <MemoryRouter
        initialEntries={[
          { pathname: '/bv', search: '', state: { previewBuild: 'private-blob-in-state' } },
        ]}
      >
        <Routes>
          <Route path="/bv" element={<BuildViewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText(/No build found/i)).toBeInTheDocument());
    expect(screen.queryByTestId('build-shell')).not.toBeInTheDocument();
  });
});

describe('BuildViewPage → editor navigation keeps the build out of the URL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDecode.mockResolvedValue(null);
    mockUseSelector.mockReturnValue([]);
  });

  it('Open-in-Editor (Remix, not owned) passes the build via router state, never a ?b= blob', async () => {
    mockDecode.mockResolvedValue(fullBuild('link-only'));

    renderEncoded('encoded-link-only-build');

    await waitFor(() => expect(screen.getByTestId('build-shell')).toBeInTheDocument());

    fireEvent.click(
      screen.getByRole('button', {
        name: /Open your own editable copy of this build in the editor/i,
      }),
    );

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    const [to, options] = mockNavigate.mock.calls[0] as [string, Record<string, unknown>];
    expect(to).toBe('/build-editor');
    expect(to).not.toContain('b=');
    expect(options.state).toEqual({ buildData: 'encoded-link-only-build' });
  });

  it('Open-in-Editor (owned) keeps only the non-sensitive ?id= save target in the URL', async () => {
    mockDecode.mockResolvedValue(fullBuild('private'));
    // Owner viewing their own private build via in-app preview; the saved build
    // matches build.id ('b1'), so the editor link carries ?id= as the save target.
    mockUseSelector.mockReturnValue([{ id: 'saved-99', build: { id: 'b1' } }] as never);

    renderEncoded('encoded-private-build', { ownerPreview: true });

    await waitFor(() => expect(screen.getByTestId('build-shell')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Edit your saved build in the editor/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    const [to, options] = mockNavigate.mock.calls[0] as [string, Record<string, unknown>];
    expect(to).toBe('/build-editor?id=saved-99');
    expect(to).not.toContain('b=');
    // The full private blob travels in state only — never in the address bar.
    expect(options.state).toEqual({ buildData: 'encoded-private-build' });
  });
});
