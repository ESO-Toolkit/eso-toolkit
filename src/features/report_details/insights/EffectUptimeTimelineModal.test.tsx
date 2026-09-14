import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, within } from '@testing-library/react';
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
          prefetchedSeries={
            [
              {
                id: 'major-force',
                label: 'Major Force',
                points: [
                  { x: 0, y: 0 },
                  { x: 0, y: 1 },
                  { x: 15, y: 1 },
                  { x: 15, y: 0 },
                ],
              },
            ] as never
          }
        />
      </ThemeProvider>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Buff uptime' });
    expect(dialog).toHaveAttribute('aria-describedby', 'effect-uptime-timeline-description');
    expect(
      screen.getByRole('img', { name: 'Effect uptime timeline chart' }),
    ).toHaveAccessibleDescription(
      expect.stringContaining('Effect activity over 1m 0.0s of fight time.'),
    );
    const intervalList = screen.getByRole('list', { name: 'Effect uptime intervals' });
    expect(within(intervalList).getByText('Major Force')).toBeInTheDocument();
    expect(within(intervalList).getByText('Active from 0.0s to 15.0s.')).toBeInTheDocument();
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

  it('bounds the hidden interval alternative for large timelines', () => {
    const points = Array.from({ length: 13 }, (_, index) => [
      { x: index * 2, y: 0 },
      { x: index * 2, y: 1 },
      { x: index * 2 + 1, y: 1 },
      { x: index * 2 + 1, y: 0 },
    ]).flat();
    const series = [
      { id: 'many-intervals', label: 'Many intervals', points },
      ...Array.from({ length: 25 }, (_, index) => ({
        id: `effect-${index + 1}`,
        label: `Effect ${index + 1}`,
        points: [
          { x: 0, y: 0 },
          { x: 0, y: 1 },
          { x: 1, y: 1 },
          { x: 1, y: 0 },
        ],
      })),
    ];

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
          prefetchedSeries={series as never}
        />
      </ThemeProvider>,
    );

    const intervalList = screen.getByRole('list', { name: 'Effect uptime intervals' });
    expect(
      within(intervalList).getByText('Showing the first 12 of 13 active intervals.'),
    ).toBeInTheDocument();
    expect(within(intervalList).queryByText('Active from 24.0s to 25.0s.')).not.toBeInTheDocument();
    expect(screen.getByText('Showing the first 25 of 26 effects.')).toBeInTheDocument();
    expect(within(intervalList).queryByText('Effect 25')).not.toBeInTheDocument();
  });
});
