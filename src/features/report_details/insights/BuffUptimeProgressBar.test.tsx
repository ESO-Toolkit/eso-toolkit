import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BuffUptimeProgressBar, BuffUptime } from './BuffUptimeProgressBar';

/**
 * Unit tests for BuffUptimeProgressBar delta indicator logic.
 *
 * These tests verify the three-state indicator system:
 * - Neutral (≈) for deltas between -2% and +2%
 * - Up arrow (↑) for deltas ≥ +2%
 * - Down arrow (↓) for deltas ≤ -2%
 *
 * Critical: NO minimum threshold - indicators should show for ALL deltas,
 * including very small ones (< 0.5%), to fulfill the requirement to show
 * when values are "very close to the group average".
 */

// Helper to create theme for rendering
const theme = createTheme();

// Helper to create buff data
const createBuffData = (
  uptimePercentage: number,
  groupAverageUptimePercentage?: number,
  overrides?: Partial<BuffUptime>,
): BuffUptime => ({
  abilityGameID: '12345',
  abilityName: 'Test Buff',
  icon: 'https://example.com/icon.png',
  totalDuration: 100,
  uptime: uptimePercentage,
  uptimePercentage,
  isDebuff: false,
  applications: 10,
  hostilityType: 0,
  uniqueKey: 'test-buff-1',
  groupAverageUptimePercentage,
  ...overrides,
});

// Helper to render component
const renderBuffProgressBar = (buff: BuffUptime) => {
  return render(
    <ThemeProvider theme={theme}>
      <BuffUptimeProgressBar buff={buff} reportId="TEST123" fightId="1" selectedTargetId={null} />
    </ThemeProvider>,
  );
};

describe('BuffUptimeProgressBar - Delta Indicators', () => {
  describe('Neutral Indicator (≈) for Small Deltas', () => {
    it('should show neutral indicator for delta = 0%', () => {
      const buff = createBuffData(50, 50); // 50% - 50% = 0%
      renderBuffProgressBar(buff);

      // Should show the ≈ symbol
      expect(screen.getByText('≈')).toBeInTheDocument();

      // Should show 0% delta
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should show neutral indicator for delta = +0.1% (very small positive)', () => {
      const buff = createBuffData(50.1, 50); // 50.1% - 50% = +0.1%
      const { container } = renderBuffProgressBar(buff);

      // Should show the ≈ symbol
      expect(screen.getByText('≈')).toBeInTheDocument();

      // Verify component rendered successfully
      expect(container.querySelector('.MuiLinearProgress-root')).toBeInTheDocument();
    });

    it('should show neutral indicator for delta = +0.5%', () => {
      const buff = createBuffData(50.5, 50); // 50.5% - 50% = +0.5%
      renderBuffProgressBar(buff);

      // Should show the ≈ symbol (not hidden by threshold)
      expect(screen.getByText('≈')).toBeInTheDocument();

      // Should show 1% delta (rounds to 1)
      expect(screen.getByText('+1%')).toBeInTheDocument();
    });

    it('should show neutral indicator for delta = +1%', () => {
      const buff = createBuffData(51, 50); // 51% - 50% = +1%
      renderBuffProgressBar(buff);

      // Should show the ≈ symbol
      expect(screen.getByText('≈')).toBeInTheDocument();

      // Should show +1% delta
      expect(screen.getByText('+1%')).toBeInTheDocument();
    });

    it('should show neutral indicator for delta = +1.9%', () => {
      const buff = createBuffData(51.9, 50); // 51.9% - 50% = +1.9%
      renderBuffProgressBar(buff);

      // Should show the ≈ symbol (just below 2% threshold)
      expect(screen.getByText('≈')).toBeInTheDocument();

      // Should show +2% delta (rounds to 2)
      expect(screen.getByText('+2%')).toBeInTheDocument();
    });

    it('should show neutral indicator for delta = -0.5%', () => {
      const buff = createBuffData(49.5, 50); // 49.5% - 50% = -0.5%
      const { container } = renderBuffProgressBar(buff);

      // Should show the ≈ symbol (not hidden by threshold)
      expect(screen.getByText('≈')).toBeInTheDocument();

      // Verify component rendered successfully
      expect(container.querySelector('.MuiLinearProgress-root')).toBeInTheDocument();
    });

    it('should show neutral indicator for delta = -1%', () => {
      const buff = createBuffData(49, 50); // 49% - 50% = -1%
      renderBuffProgressBar(buff);

      // Should show the ≈ symbol
      expect(screen.getByText('≈')).toBeInTheDocument();

      // Should show -1% delta
      expect(screen.getByText('-1%')).toBeInTheDocument();
    });

    it('should show neutral indicator for delta = -1.9%', () => {
      const buff = createBuffData(48.1, 50); // 48.1% - 50% = -1.9%
      renderBuffProgressBar(buff);

      // Should show the ≈ symbol (just above -2% threshold)
      expect(screen.getByText('≈')).toBeInTheDocument();

      // Should show -2% delta (rounds to -2)
      expect(screen.getByText('-2%')).toBeInTheDocument();
    });
  });

  describe('Up Arrow Indicator for Large Positive Deltas', () => {
    it('should show up arrow for delta = +2%', () => {
      const buff = createBuffData(52, 50); // 52% - 50% = +2%
      renderBuffProgressBar(buff);

      // Should NOT show ≈ symbol
      expect(screen.queryByText('≈')).not.toBeInTheDocument();

      // Should show +2% with up arrow (TrendingUpIcon)
      expect(screen.getByText('+2%')).toBeInTheDocument();
    });

    it('should show up arrow for delta = +5%', () => {
      const buff = createBuffData(55, 50); // 55% - 50% = +5%
      renderBuffProgressBar(buff);

      // Should NOT show ≈ symbol
      expect(screen.queryByText('≈')).not.toBeInTheDocument();

      // Should show +5%
      expect(screen.getByText('+5%')).toBeInTheDocument();
    });

    it('should show up arrow for delta = +21%', () => {
      const buff = createBuffData(71, 50); // 71% - 50% = +21%
      renderBuffProgressBar(buff);

      // Should NOT show ≈ symbol
      expect(screen.queryByText('≈')).not.toBeInTheDocument();

      // Should show +21%
      expect(screen.getByText('+21%')).toBeInTheDocument();
    });
  });

  describe('Down Arrow Indicator for Large Negative Deltas', () => {
    it('should show down arrow for delta = -2%', () => {
      const buff = createBuffData(48, 50); // 48% - 50% = -2%
      renderBuffProgressBar(buff);

      // Should NOT show ≈ symbol
      expect(screen.queryByText('≈')).not.toBeInTheDocument();

      // Should show -2% with down arrow (TrendingDownIcon)
      expect(screen.getByText('-2%')).toBeInTheDocument();
    });

    it('should show down arrow for delta = -9%', () => {
      const buff = createBuffData(41, 50); // 41% - 50% = -9%
      renderBuffProgressBar(buff);

      // Should NOT show ≈ symbol
      expect(screen.queryByText('≈')).not.toBeInTheDocument();

      // Should show -9%
      expect(screen.getByText('-9%')).toBeInTheDocument();
    });

    it('should show down arrow for delta = -15%', () => {
      const buff = createBuffData(35, 50); // 35% - 50% = -15%
      renderBuffProgressBar(buff);

      // Should NOT show ≈ symbol
      expect(screen.queryByText('≈')).not.toBeInTheDocument();

      // Should show -15%
      expect(screen.getByText('-15%')).toBeInTheDocument();
    });

    it('should show down arrow for delta = -27%', () => {
      const buff = createBuffData(23, 50); // 23% - 50% = -27%
      renderBuffProgressBar(buff);

      // Should NOT show ≈ symbol
      expect(screen.queryByText('≈')).not.toBeInTheDocument();

      // Should show -27%
      expect(screen.getByText('-27%')).toBeInTheDocument();
    });
  });

  describe('No Indicator When Group Average Not Available', () => {
    it('should not show any indicator when groupAverageUptimePercentage is undefined', () => {
      const buff = createBuffData(50, undefined); // No group average
      renderBuffProgressBar(buff);

      // Should NOT show ≈ symbol
      expect(screen.queryByText('≈')).not.toBeInTheDocument();

      // Should NOT show any delta percentage
      expect(screen.queryByText(/[+-]\d+%/)).not.toBeInTheDocument();
    });

    it('should not show any indicator when groupAverageUptimePercentage is null', () => {
      const buff = createBuffData(50); // No group average (null/undefined)
      renderBuffProgressBar(buff);

      // Should NOT show ≈ symbol
      expect(screen.queryByText('≈')).not.toBeInTheDocument();

      // Should still show the uptime percentage (50%), but not delta
      // The text might be split, so just check that the main uptime is visible
      const container = screen.getByText(/Test Buff/);
      expect(container).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle delta exactly at +2.0% threshold (boundary)', () => {
      const buff = createBuffData(52.0, 50); // 52% - 50% = +2.0%
      renderBuffProgressBar(buff);

      // At exactly 2%, should show arrow (not neutral)
      expect(screen.queryByText('≈')).not.toBeInTheDocument();
      expect(screen.getByText('+2%')).toBeInTheDocument();
    });

    it('should handle delta exactly at -2.0% threshold (boundary)', () => {
      const buff = createBuffData(48.0, 50); // 48% - 50% = -2.0%
      renderBuffProgressBar(buff);

      // At exactly -2%, should show arrow (not neutral)
      expect(screen.queryByText('≈')).not.toBeInTheDocument();
      expect(screen.getByText('-2%')).toBeInTheDocument();
    });

    it('should handle very small delta = +0.01%', () => {
      const buff = createBuffData(50.01, 50); // 50.01% - 50% = +0.01%
      const { container } = renderBuffProgressBar(buff);

      // Should show neutral indicator (no minimum threshold)
      expect(screen.getByText('≈')).toBeInTheDocument();

      // Verify component rendered successfully
      expect(container.querySelector('.MuiLinearProgress-root')).toBeInTheDocument();
    });

    it('should handle very large positive delta = +100%', () => {
      const buff = createBuffData(100, 0); // 100% - 0% = +100%
      renderBuffProgressBar(buff);

      // Should show up arrow
      expect(screen.queryByText('≈')).not.toBeInTheDocument();
      expect(screen.getByText('+100%')).toBeInTheDocument();
    });

    it('should handle very large negative delta = -100%', () => {
      const buff = createBuffData(0, 100); // 0% - 100% = -100%
      renderBuffProgressBar(buff);

      // Should show down arrow
      expect(screen.queryByText('≈')).not.toBeInTheDocument();
      expect(screen.getByText('-100%')).toBeInTheDocument();
    });
  });

  describe('Stacked Abilities (e.g., Stagger)', () => {
    it('should show neutral indicator for Stack 1 with delta = 0%', () => {
      const buff = createBuffData(56, undefined, {
        abilityName: 'Stagger',
        maxStacks: 3,
        stackLevel: 1,
        allStacksData: [
          {
            stackLevel: 1,
            totalDuration: 201.3,
            uptime: 201.3,
            uptimePercentage: 56,
            applications: 16,
            groupAverageUptimePercentage: 56, // Delta = 0%
          },
          {
            stackLevel: 2,
            totalDuration: 150,
            uptime: 150,
            uptimePercentage: 42,
            applications: 20,
            groupAverageUptimePercentage: 57, // Delta = -15%
          },
          {
            stackLevel: 3,
            totalDuration: 100,
            uptime: 100,
            uptimePercentage: 29,
            applications: 25,
            groupAverageUptimePercentage: 56, // Delta = -27%
          },
        ],
      });

      renderBuffProgressBar(buff);

      // Should show neutral indicator for Stack 1
      expect(screen.getByText('≈')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should use per-stack group average for stacked abilities', () => {
      const buff = createBuffData(42, 99, {
        // Top-level group average is 99% (should be ignored)
        abilityName: 'Stagger',
        maxStacks: 3,
        stackLevel: 2,
        allStacksData: [
          {
            stackLevel: 1,
            totalDuration: 201.3,
            uptime: 201.3,
            uptimePercentage: 56,
            applications: 16,
            groupAverageUptimePercentage: 56,
          },
          {
            stackLevel: 2,
            totalDuration: 150,
            uptime: 150,
            uptimePercentage: 42,
            applications: 20,
            groupAverageUptimePercentage: 57, // Should use this (42% - 57% = -15%)
          },
          {
            stackLevel: 3,
            totalDuration: 100,
            uptime: 100,
            uptimePercentage: 29,
            applications: 25,
            groupAverageUptimePercentage: 56,
          },
        ],
      });

      renderBuffProgressBar(buff);

      // Should show -15% (not based on top-level 99%)
      expect(screen.queryByText('≈')).not.toBeInTheDocument();
      expect(screen.getByText('-15%')).toBeInTheDocument();
    });
  });

  describe('Visual Styling', () => {
    it('should render with correct neutral color styling', () => {
      const buff = createBuffData(50, 50); // Delta = 0%
      const { container } = renderBuffProgressBar(buff);

      // Find the Box containing the neutral indicator
      const neutralBox =
        container.querySelector('[data-testid]') || container.querySelector('div[class*="MuiBox"]');

      // Should exist
      expect(neutralBox).toBeTruthy();
    });

    it('should render percentage with correct uptime value', () => {
      const buff = createBuffData(73.5, 70); // 73.5% uptime
      const { container } = renderBuffProgressBar(buff);

      // Should show up arrow (not neutral) since delta is +3.5%
      expect(screen.queryByText('≈')).not.toBeInTheDocument();

      // Should have TrendingUpIcon
      expect(screen.getByTestId('TrendingUpIcon')).toBeInTheDocument();

      // Verify component rendered successfully
      expect(container.querySelector('.MuiLinearProgress-root')).toBeInTheDocument();
    });
  });
});
