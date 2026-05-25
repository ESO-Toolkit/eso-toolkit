import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';

import { AboutPage } from '../AboutPage';
import { getBuildInfoAsync, getDisplayVersion, isDevelopmentBuild } from '../../utils/cacheBusting';

jest.mock('../../utils/cacheBusting', () => ({
  getBuildInfoAsync: jest.fn(),
  getDisplayVersion: jest.fn(),
  isDevelopmentBuild: jest.fn(),
}));

type BuildInfo = {
  version: string;
  buildTime: string;
  gitCommit: string;
  shortCommit: string;
  buildId: string;
  timestamp: number;
  cacheBuster: string;
};

const mockGetBuildInfoAsync = getBuildInfoAsync as jest.MockedFunction<typeof getBuildInfoAsync>;
const mockGetDisplayVersion = getDisplayVersion as jest.MockedFunction<typeof getDisplayVersion>;
const mockIsDevelopmentBuild = isDevelopmentBuild as jest.MockedFunction<typeof isDevelopmentBuild>;

describe('AboutPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders release details when build info is available', async () => {
    const buildInfo: BuildInfo = {
      version: '1.2.3',
      buildTime: '2026-02-01T10:00:00.000Z',
      gitCommit: 'a'.repeat(40),
      shortCommit: 'abcdef12',
      buildId: '1.2.3-abcdef12-123',
      timestamp: 1760000000000,
      cacheBuster: 'v=abcdef12',
    };

    mockGetBuildInfoAsync.mockResolvedValue(buildInfo);
    mockGetDisplayVersion.mockReturnValue('v0.0.0 (dev)');
    mockIsDevelopmentBuild.mockReturnValue(false);

    render(<AboutPage />);

    expect(await screen.findByText('v1.2.3 (abcdef12)')).toBeInTheDocument();
    expect(screen.getByText('Release')).toBeInTheDocument();
    expect(screen.getByText(buildInfo.buildId)).toBeInTheDocument();
    expect(screen.getByText(buildInfo.shortCommit)).toBeInTheDocument();
    expect(screen.getByText(buildInfo.gitCommit)).toBeInTheDocument();
    expect(screen.getByText(buildInfo.cacheBuster)).toBeInTheDocument();
  });

  it('uses display version fallback when build info is unavailable', async () => {
    mockGetBuildInfoAsync.mockResolvedValue(undefined);
    mockGetDisplayVersion.mockReturnValue('v0.1.0 (dev)');
    mockIsDevelopmentBuild.mockReturnValue(true);

    render(<AboutPage />);

    await waitFor(() => {
      expect(mockGetDisplayVersion).toHaveBeenCalled();
    });

    expect(screen.getByText('v0.1.0 (dev)')).toBeInTheDocument();
    expect(screen.getByText('Development')).toBeInTheDocument();
    expect(screen.getByText('Loading release information...')).toBeInTheDocument();
  });
});
