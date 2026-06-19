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

import { buildHubApi } from '../features/build-hub/api/build-hub-api';
import { decodeBuildFromURL } from '../utils/buildEncoding';
import { BuildViewPage } from './BuildViewPage';

const mockGet = buildHubApi.get as jest.MockedFunction<typeof buildHubApi.get>;
const mockDecode = decodeBuildFromURL as jest.MockedFunction<typeof decodeBuildFromURL>;

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

describe('BuildViewPage visibility enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks wipes call history; re-assert the default decode impl so a
    // bare jest.fn() never returns undefined (which would break `.then`).
    mockDecode.mockResolvedValue(null);
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
});
