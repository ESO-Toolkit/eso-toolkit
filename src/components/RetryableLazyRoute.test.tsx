import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { ErrorBoundary, isChunkLoadError } from './ErrorBoundary';
import { LazyRouteLoader, RetryableLazyRoute } from './RetryableLazyRoute';

describe('RetryableLazyRoute', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('reloads after a rejected chunk when Try Again is clicked', async () => {
    const load: jest.MockedFunction<LazyRouteLoader> = jest.fn();
    const reloadPage = jest.fn();
    let rejectChunkLoad!: (reason: Error) => void;
    const rejectedChunk = new Promise<{ default: React.ComponentType }>((_resolve, reject) => {
      rejectChunkLoad = reject;
    });

    load.mockReturnValueOnce(rejectedChunk);

    render(
      <RetryableLazyRoute
        fallback={<div>Loading analyzer</div>}
        load={load}
        reloadPage={reloadPage}
      />,
    );

    await act(async () => {
      rejectChunkLoad(new Error('Loading chunk Analyzer failed'));
      await rejectedChunk.catch(() => undefined);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

    expect(reloadPage).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert', { name: 'Something went wrong' })).toBeInTheDocument();
  });

  it('recognizes chunk failures by error name and Firefox import wording', () => {
    const namedError = new Error('Request failed');
    namedError.name = 'ChunkLoadError';

    expect(isChunkLoadError(namedError)).toBe(true);
    expect(isChunkLoadError(new Error('Error loading dynamically imported module'))).toBe(true);
  });

  it('replaces the lazy route without reloading for a non-chunk error', async () => {
    const AnalyzerRoute = (): React.ReactElement => <div>Analyzer route loaded</div>;
    const load: jest.MockedFunction<LazyRouteLoader> = jest.fn();
    const reloadPage = jest.fn();
    let rejectRouteLoad!: (reason: Error) => void;
    const rejectedRoute = new Promise<{ default: React.ComponentType }>((_resolve, reject) => {
      rejectRouteLoad = reject;
    });

    load.mockReturnValueOnce(rejectedRoute).mockResolvedValueOnce({ default: AnalyzerRoute });

    render(
      <RetryableLazyRoute
        fallback={<div>Loading analyzer</div>}
        load={load}
        reloadPage={reloadPage}
      />,
    );

    await act(async () => {
      rejectRouteLoad(new Error('Analyzer route renderer failed'));
      await rejectedRoute.catch(() => undefined);
    });

    expect(screen.getByRole('alert', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

    expect(await screen.findByText('Analyzer route loaded')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
    expect(reloadPage).not.toHaveBeenCalled();
  });

  it('reloads a rejected non-report route chunk through its existing boundary', async () => {
    const loadLeaderboard = jest.fn(() =>
      Promise.reject<{ default: React.ComponentType }>(
        new Error('Failed to fetch dynamically imported module: leaderboard'),
      ),
    );
    const LeaderboardRoute = React.lazy(loadLeaderboard);
    const reloadPage = jest.fn();

    render(
      <ErrorBoundary reloadPage={reloadPage}>
        <React.Suspense fallback={<div>Loading leaderboard</div>}>
          <LeaderboardRoute />
        </React.Suspense>
      </ErrorBoundary>,
    );

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

    expect(reloadPage).toHaveBeenCalledTimes(1);
    expect(loadLeaderboard).toHaveBeenCalledTimes(1);
  });
});
