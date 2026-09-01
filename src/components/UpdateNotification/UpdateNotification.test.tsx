import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { useCacheInvalidation } from '../../hooks/useCacheInvalidation';

import { UpdateNotification } from './UpdateNotification';

jest.mock('../../hooks/useCacheInvalidation', () => ({
  useCacheInvalidation: jest.fn(),
  useVersionInfo: jest.fn(),
}));

const mockUseCacheInvalidation = useCacheInvalidation as jest.MockedFunction<
  typeof useCacheInvalidation
>;

const mockState: ReturnType<typeof useCacheInvalidation>[0] = {
  isCheckingVersion: false,
  hasUpdate: true,
  currentVersion: '0.1.0-f33f6bcb',
  serverVersion: '0.1.0-594e19ad',
  versionLoaded: true,
};

const mockActions: ReturnType<typeof useCacheInvalidation>[1] = {
  checkForUpdates: jest.fn().mockResolvedValue(undefined),
  forceReload: jest.fn(),
  clearCache: jest.fn().mockResolvedValue(undefined),
  dismissUpdate: jest.fn(),
};

const renderNotification = (mode: 'light' | 'dark') =>
  render(
    <ThemeProvider theme={createTheme({ palette: { mode } })}>
      <UpdateNotification />
    </ThemeProvider>,
  );

describe('UpdateNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCacheInvalidation.mockReturnValue([mockState, mockActions]);
  });

  it('uses a readable outlined surface in light mode', () => {
    renderNotification('light');

    const alert = screen.getByRole('alert');

    expect(alert).toHaveClass('MuiAlert-outlined');
    expect(alert).not.toHaveClass('MuiAlert-filled');
    expect(screen.getByText('New version available!')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Update' })).toBeVisible();
  });

  it('preserves the filled treatment in dark mode', () => {
    renderNotification('dark');

    expect(screen.getByRole('alert')).toHaveClass('MuiAlert-filled');
  });
});
