import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// The page pulls in a large tree of presentational + data modules that are
// irrelevant to the visibility-enforcement effect under test. Stub the heavy
// leaves so the test stays focused on the load orchestration. Decode returning
// null keeps the heavy build-render path out of these tests; they assert the
// load/visibility flow and exercise the not-found branch (notFound || !build).
jest.mock('../utils/buildEncoding', () => ({
  decodeBuildFromURL: jest.fn(async () => null),
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
import { decodeBuildFromURL } from '../utils/buildEncoding';
import { BuildViewPage } from './BuildViewPage';

const mockGet = buildHubApi.get as jest.MockedFunction<typeof buildHubApi.get>;
const mockDecode = decodeBuildFromURL as jest.MockedFunction<typeof decodeBuildFromURL>;
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
    mockUseSelector.mockReturnValue([]);
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
