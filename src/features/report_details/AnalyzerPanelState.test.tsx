import { ThemeProvider, createTheme } from '@mui/material/styles';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import '@testing-library/jest-dom';

import {
  AnalyzerPanelState,
  resolveAnalyzerPanelState,
  type AnalyzerPanelStateKind,
} from './AnalyzerPanelState';

const theme = createTheme();

const renderPanel = (
  state: AnalyzerPanelStateKind,
  options: {
    asOf?: string;
    detail?: string;
    onRetry?: () => void;
    children?: React.ReactNode;
  } = {},
) =>
  render(
    <ThemeProvider theme={theme}>
      <AnalyzerPanelState state={state} title="Damage breakdown" {...options} />
    </ThemeProvider>,
  );

describe('AnalyzerPanelState', () => {
  it.each([
    [{ hasData: false, isComplete: false, isLoading: true }, 'loading'],
    [{ hasData: false, isComplete: true, isLoading: false }, 'empty'],
    [{ hasData: true, isComplete: false, isLoading: true }, 'partial'],
    [{ hasData: true, isComplete: false, isLoading: false }, 'stale'],
    [{ hasData: false, isComplete: false, isLoading: false }, 'stale'],
    [{ error: 'Request failed', hasData: false, isComplete: true, isLoading: false }, 'failed'],
    [{ error: 'Request failed', hasData: true, isComplete: true, isLoading: false }, 'failed'],
    [{ hasData: true, isComplete: true, isLoading: false }, 'ready'],
  ] as const)('resolves %o as %s', (input, expectedState) => {
    expect(resolveAnalyzerPanelState(input)).toBe(expectedState);
  });

  it('announces loading with an accessible progress indicator', () => {
    renderPanel('loading');

    expect(screen.getByLabelText('Damage breakdown: loading')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading data.');
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('announces an empty state without rendering stale content', () => {
    renderPanel('empty', { children: <div>Old result</div> });

    expect(screen.getByRole('status')).toHaveTextContent('No data is available for this panel.');
    expect(screen.queryByText('Old result')).not.toBeInTheDocument();
  });

  it('announces partial data and retains the available content', () => {
    renderPanel('partial', {
      detail: 'Damage events are still loading.',
      children: <div>Partial result</div>,
    });

    expect(screen.getByRole('status')).toHaveTextContent(
      'Updating data; showing the latest available results.',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Damage events are still loading.');
    expect(screen.getByText('Partial result')).toBeInTheDocument();
  });

  it('labels stale content and exposes a per-widget as-of timestamp', () => {
    renderPanel('stale', { asOf: '2026-09-05 14:30 UTC', children: <div>Prior result</div> });

    expect(screen.getByRole('status')).toHaveTextContent('Panel data is not confirmed current.');
    expect(screen.getByText('As of 2026-09-05 14:30 UTC')).toBeInTheDocument();
    expect(screen.getByText('Prior result')).toBeInTheDocument();
  });

  it('uses an assertive error announcement, retains data, and retries on request', () => {
    const onRetry = jest.fn();
    renderPanel('failed', { onRetry, children: <div>Last successful result</div> });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The latest refresh failed. Retained data may be out of date.',
    );
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
    expect(screen.getByText('Last successful result')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('only exposes retry for stale or failed panel data', () => {
    const onRetry = jest.fn();
    const { rerender } = renderPanel('partial', { onRetry, children: <div>Partial result</div> });

    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <AnalyzerPanelState state="stale" title="Damage breakdown" onRetry={onRetry}>
          <div>Stale result</div>
        </AnalyzerPanelState>
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders ready content and provides a polite completion announcement', () => {
    renderPanel('ready', { children: <div>Current result</div> });

    expect(screen.getByRole('status')).toHaveTextContent('Data is ready.');
    expect(screen.getByText('Current result')).toBeInTheDocument();
  });
});
