import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import { HealingDonePanelView } from './HealingDonePanelView';

// Mock hooks
jest.mock('../../../hooks', () => ({
  useRoleColors: jest.fn(),
}));

jest.mock('../../../ReportFightContext', () => ({
  useSelectedReportAndFight: jest.fn(),
}));

const { useRoleColors } = jest.requireMock('../../../hooks');
const { useSelectedReportAndFight } = jest.requireMock('../../../ReportFightContext');

const theme = createTheme();

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MemoryRouter>
    <ThemeProvider theme={theme}>{children}</ThemeProvider>
  </MemoryRouter>
);

const mockRoleColors = {
  dps: '#ff6b6b',
  healer: '#51cf66',
  tank: '#339af0',
  getColor: (role: string) =>
    ({ dps: '#ff6b6b', healer: '#51cf66', tank: '#339af0' })[role] || '#ff6b6b',
  getPlayerColor: (role?: string) =>
    ({ dps: '#ff6b6b', healer: '#51cf66', tank: '#339af0' })[role || 'dps'],
  getGradientColor: (role?: string) =>
    ({ dps: '#ff6b6b', healer: '#51cf66', tank: '#339af0' })[role || 'dps'],
  getTableBackground: () =>
    'linear-gradient(135deg, rgb(110 170 240 / 25%) 0%, rgb(152 131 227 / 15%) 50%, rgb(173 192 255 / 8%) 100%)',
  getProgressBarStyles: () => ({}),
  isDarkMode: false,
};

const createMockHealingRow = (overrides: Record<string, unknown> = {}) => ({
  id: '1',
  name: 'TestHealer',
  raw: 100000,
  hps: 1667,
  overheal: 25000,
  rawHps: 2084,
  overhealPercentage: 20,
  ressurects: 0,
  deaths: 0,
  role: 'healer' as const,
  ...overrides,
});

describe('HealingDonePanelView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useRoleColors.mockReturnValue(mockRoleColors);
    useSelectedReportAndFight.mockReturnValue({ reportId: 'test-report', fightId: '1' });
  });

  it('renders Raw HPS column header', () => {
    const rows = [createMockHealingRow()];
    render(
      <TestWrapper>
        <HealingDonePanelView healingRows={rows} />
      </TestWrapper>,
    );

    // The header text should contain "Raw HPS" (desktop header)
    const rawHpsHeaders = screen.getAllByText(/^Raw HPS/);
    expect(rawHpsHeaders.length).toBeGreaterThan(0);
  });

  it('renders Raw HPS values for each player', () => {
    const rows = [
      createMockHealingRow({ id: '1', name: 'Healer1', rawHps: 2084 }),
      createMockHealingRow({ id: '2', name: 'Healer2', rawHps: 1500 }),
    ];
    render(
      <TestWrapper>
        <HealingDonePanelView healingRows={rows} />
      </TestWrapper>,
    );

    // Raw HPS values should be displayed (formatted with commas)
    expect(screen.getAllByText('2,084').length).toBeGreaterThan(0);
    expect(screen.getAllByText('1,500').length).toBeGreaterThan(0);
  });

  it('sorts by Raw HPS when Raw HPS header is clicked', async () => {
    const rows = [
      createMockHealingRow({ id: '1', name: 'LowRawHPS', rawHps: 1000 }),
      createMockHealingRow({ id: '2', name: 'HighRawHPS', rawHps: 3000 }),
    ];
    render(
      <TestWrapper>
        <HealingDonePanelView healingRows={rows} />
      </TestWrapper>,
    );

    const user = userEvent.setup();
    // Click Raw HPS header to sort — find the desktop header (not mobile pill)
    const rawHpsHeaders = screen.getAllByText(/^Raw HPS/);
    // Click the first one (desktop header)
    await user.click(rawHpsHeaders[0]);

    // After clicking, rows should be sorted by rawHps descending
    // HighRawHPS (3000) should appear before LowRawHPS (1000)
    const allText = document.body.textContent || '';
    const highIndex = allText.indexOf('HighRawHPS');
    const lowIndex = allText.indexOf('LowRawHPS');
    expect(highIndex).toBeLessThan(lowIndex);
  });

  it('displays Raw HPS in mobile overheal line', () => {
    const rows = [createMockHealingRow({ overheal: 25000, rawHps: 2084 })];
    render(
      <TestWrapper>
        <HealingDonePanelView healingRows={rows} />
      </TestWrapper>,
    );

    // Mobile layout shows "Overheal: 25,000 | Raw HPS: 2,084"
    expect(screen.getByText(/Overheal:.*Raw HPS: 2,084/)).toBeInTheDocument();
  });

  it('exposes both mobile chips and desktop headers as accessible, keyboard-operable sort buttons', async () => {
    const rows = [createMockHealingRow()];
    render(
      <TestWrapper>
        <HealingDonePanelView healingRows={rows} />
      </TestWrapper>,
    );

    // Sort controls are buttons with accessible names conveying their field. Both the
    // mobile chip and the desktop header render in jsdom (responsive display is CSS-only),
    // so each field surfaces at least one — and Raw HPS surfaces both.
    expect(screen.getAllByRole('button', { name: /^Sort by Name/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /^Sort by HPS/ }).length).toBeGreaterThan(0);
    const rawHpsSorts = screen.getAllByRole('button', { name: /^Sort by Raw HPS/ });
    expect(rawHpsSorts.length).toBeGreaterThanOrEqual(2);
    // All are focusable via keyboard (role="button" + tabIndex, or native <button>).
    rawHpsSorts.forEach((btn) => expect(btn).toHaveAttribute('tabindex', '0'));
  });

  it('sorts via keyboard (Enter) on a Raw HPS sort control', async () => {
    const rows = [
      createMockHealingRow({ id: '1', name: 'LowRawHPS', rawHps: 1000 }),
      createMockHealingRow({ id: '2', name: 'HighRawHPS', rawHps: 3000 }),
    ];
    render(
      <TestWrapper>
        <HealingDonePanelView healingRows={rows} />
      </TestWrapper>,
    );

    const user = userEvent.setup();
    const rawHpsSort = screen.getAllByRole('button', { name: /^Sort by Raw HPS/ })[0];
    rawHpsSort.focus();
    await user.keyboard('{Enter}');

    // Active sort state is reflected in the accessible name.
    expect(
      screen.getAllByRole('button', { name: /^Sort by Raw HPS, descending/ }).length,
    ).toBeGreaterThan(0);
    // And rows are ordered by rawHps descending.
    const allText = document.body.textContent || '';
    expect(allText.indexOf('HighRawHPS')).toBeLessThan(allText.indexOf('LowRawHPS'));
  });
});
