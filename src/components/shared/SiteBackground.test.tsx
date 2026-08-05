import { createTheme, ThemeProvider } from '@mui/material/styles';
import { render } from '@testing-library/react';
import React from 'react';

import { usePerfTier } from '../../hooks/usePerfTier';

import { SiteBackground } from './SiteBackground';

// Tier is the unit under test — mock the hook so no store is needed.
jest.mock('../../hooks/usePerfTier', () => ({
  usePerfTier: jest.fn(),
}));

const mockUsePerfTier = usePerfTier as jest.MockedFunction<typeof usePerfTier>;

const renderWithMode = (mode: 'light' | 'dark') =>
  render(
    <ThemeProvider theme={createTheme({ palette: { mode } })}>
      <SiteBackground />
    </ThemeProvider>,
  );

describe('SiteBackground', () => {
  it('renders nothing on the low perf tier (both themes)', () => {
    mockUsePerfTier.mockReturnValue('low');
    expect(renderWithMode('dark').container.firstChild).toBeNull();
    expect(renderWithMode('light').container.firstChild).toBeNull();
  });

  it('renders a background layer on medium and high tiers', () => {
    mockUsePerfTier.mockReturnValue('medium');
    expect(renderWithMode('dark').container.firstChild).not.toBeNull();
    mockUsePerfTier.mockReturnValue('high');
    expect(renderWithMode('light').container.firstChild).not.toBeNull();
  });
});
