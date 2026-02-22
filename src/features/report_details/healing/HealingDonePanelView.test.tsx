import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
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

    // Click Raw HPS header to sort — find the desktop header (not mobile pill)
    const rawHpsHeaders = screen.getAllByText(/^Raw HPS/);
    // Click the first one (desktop header)
    await userEvent.click(rawHpsHeaders[0]);

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
});
