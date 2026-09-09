import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import '@testing-library/jest-dom';

import { EffectUptimeTimelineModal } from './EffectUptimeTimelineModal';

jest.mock('../../../components/EChart', () => ({
  EChart: ({ option }: { option: { animation?: boolean; xAxis: { max?: number } } }) => (
    <div
      data-testid="echart"
      data-animation={option.animation}
      data-x-axis-max={option.xAxis.max}
    />
  ),
}));

jest.mock('../../../hooks/useEChartsTheme', () => ({
  useEChartsTheme: () => ({
    theme: {
      darkMode: false,
      mutedColor: '#64748b',
      borderColor: '#cbd5e1',
    },
  }),
}));

describe('EffectUptimeTimelineModal', () => {
  it('exposes dialog naming, chart semantics, and a usable close target', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();

    render(
      <ThemeProvider theme={createTheme()}>
        <EffectUptimeTimelineModal
          open
          onClose={onClose}
          title="Buff uptime"
          subtitle="Selected target"
          category="buff"
          uptimes={[]}
          lookup={null}
          fightStartTime={0}
          fightEndTime={60_000}
          prefetchedSeries={[{ id: 'major-force', label: 'Major Force', points: [] }] as never}
        />
      </ThemeProvider>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Buff uptime' });
    expect(dialog).toHaveAttribute('aria-describedby', 'effect-uptime-timeline-description');
    expect(
      screen.getByRole('img', { name: 'Effect uptime timeline chart' }),
    ).toHaveAccessibleDescription(
      'Effect activity over 1m 0.0s of fight time. Effects shown: Major Force.',
    );
    expect(screen.getByRole('listitem', { name: 'Major Force' })).toBeInTheDocument();
    expect(screen.getByTestId('echart')).toHaveAttribute('data-x-axis-max', '60');
    expect(screen.getByTestId('echart')).toHaveAttribute('data-animation', 'true');

    const closeButton = screen.getByRole('button', { name: 'Close timeline' });
    await user.tab();
    expect(closeButton).toHaveFocus();
  });

  it('disables chart animation when reduced motion is requested', () => {
    const originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    try {
      render(
        <ThemeProvider theme={createTheme()}>
          <EffectUptimeTimelineModal
            open
            onClose={jest.fn()}
            title="Buff uptime"
            category="buff"
            uptimes={[]}
            lookup={null}
            fightStartTime={0}
            fightEndTime={60_000}
            prefetchedSeries={[{ id: 'major-force', label: 'Major Force', points: [] }] as never}
          />
        </ThemeProvider>,
      );

      expect(screen.getByTestId('echart')).toHaveAttribute('data-animation', 'false');
    } finally {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: originalMatchMedia,
      });
    }
  });
});
