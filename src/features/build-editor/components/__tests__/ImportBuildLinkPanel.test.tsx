/**
 * Tests the link-import wiring: a pasted URL is fetched via the (mocked) worker
 * proxy and the resulting text is handed to ImportBuildTextPanel for review.
 * The network/worker call is mocked — we assert the pipeline, not the fetch.
 */

import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SnackbarProvider } from 'notistack';
import React from 'react';
import { Provider } from 'react-redux';

import buildEditorReducer from '../../store/buildEditorSlice';
import { ImportBuildLinkPanel } from '../ImportBuildLinkPanel';

const mockFetch = jest.fn();
jest.mock('../../api/fetch-guide-api', () => ({
  fetchGuideByUrl: (...args: unknown[]) => mockFetch(...args),
}));

const renderPanel = (onClose = jest.fn()) => {
  const store = configureStore({ reducer: { buildEditor: buildEditorReducer } });
  return render(
    <Provider store={store}>
      <SnackbarProvider>
        <ImportBuildLinkPanel onClose={onClose} />
      </SnackbarProvider>
    </Provider>,
  );
};

beforeEach(() => mockFetch.mockReset());

const typeUrl = (value: string): void => {
  const input = screen.getByRole('textbox', { name: 'Guide URL' });
  fireEvent.change(input, { target: { value } });
};

const guideResult = (text: string) => ({
  title: 'Guide',
  finalUrl: 'https://example.com/guide',
  images: [],
  text,
  truncated: false,
});

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

describe('ImportBuildLinkPanel', () => {
  it('gives the guide URL textbox an accessible name', () => {
    renderPanel();

    expect(screen.getByRole('textbox', { name: 'Guide URL' })).toBeInTheDocument();
  });

  it('rejects a non-URL before calling the worker', async () => {
    renderPanel();
    typeUrl('not a url');
    fireEvent.click(screen.getByRole('button', { name: /fetch guide/i }));
    await waitFor(() => expect(screen.getByText(/full guide URL/i)).toBeInTheDocument());
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetches a guide and shows the extracted text for review', async () => {
    mockFetch.mockResolvedValue(
      guideResult(
        [
          'GEAR SLOT\tSET\tWEIGHT/TYPE\tTRAIT\tENCHANT',
          'Head\tSlimecraw\tMedium\tDivines\tMagicka',
          'I use Nord for survivability.',
        ].join('\n'),
      ),
    );
    renderPanel();
    typeUrl('https://example.com/guide');
    fireEvent.click(screen.getByRole('button', { name: /fetch guide/i }));

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/guide', expect.any(AbortSignal)),
    );
    await waitFor(() =>
      expect(screen.getByText(/detect the gear, skills, champion points/i)).toBeInTheDocument(),
    );
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toMatch(/Slimecraw/);
  });

  it('surfaces a fetch error', async () => {
    mockFetch.mockRejectedValue(new Error('That link took too long to load.'));
    renderPanel();
    typeUrl('https://example.com/slow');
    fireEvent.click(screen.getByRole('button', { name: /fetch guide/i }));
    await waitFor(() => expect(screen.getByText(/took too long to load/i)).toBeInTheDocument());
  });

  it('aborts a replaced request and ignores its stale result', async () => {
    const firstRequest = deferred<ReturnType<typeof guideResult>>();
    const secondRequest = deferred<ReturnType<typeof guideResult>>();
    mockFetch
      .mockImplementationOnce(() => firstRequest.promise)
      .mockImplementationOnce(() => secondRequest.promise);
    renderPanel();

    typeUrl('https://example.com/first');
    fireEvent.click(screen.getByRole('button', { name: /fetch guide/i }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const firstSignal = mockFetch.mock.calls[0]?.[1] as AbortSignal;

    typeUrl('https://example.com/second');
    fireEvent.click(screen.getByRole('button', { name: /fetching/i }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    const secondSignal = mockFetch.mock.calls[1]?.[1] as AbortSignal;

    expect(firstSignal.aborted).toBe(true);
    expect(secondSignal.aborted).toBe(false);

    firstRequest.resolve(guideResult('STALE GUIDE CONTENT'));
    await waitFor(() => expect(screen.queryByText('STALE GUIDE CONTENT')).not.toBeInTheDocument());
    expect(screen.getByRole('textbox', { name: 'Guide URL' })).toBeInTheDocument();

    secondRequest.resolve(guideResult('CURRENT GUIDE CONTENT'));
    await waitFor(() =>
      expect(screen.getByDisplayValue('CURRENT GUIDE CONTENT')).toBeInTheDocument(),
    );
  });

  it('does not surface an AbortError from a replaced request', async () => {
    const firstRequest = deferred<ReturnType<typeof guideResult>>();
    const secondRequest = deferred<ReturnType<typeof guideResult>>();
    mockFetch
      .mockImplementationOnce(() => firstRequest.promise)
      .mockImplementationOnce(() => secondRequest.promise);
    renderPanel();

    typeUrl('https://example.com/first');
    fireEvent.click(screen.getByRole('button', { name: /fetch guide/i }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    typeUrl('https://example.com/second');
    fireEvent.click(screen.getByRole('button', { name: /fetching/i }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));

    const abortError = new Error('The operation was aborted.');
    abortError.name = 'AbortError';
    firstRequest.reject(abortError);

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    secondRequest.resolve(guideResult('CURRENT GUIDE CONTENT'));
    await waitFor(() =>
      expect(screen.getByDisplayValue('CURRENT GUIDE CONTENT')).toBeInTheDocument(),
    );
  });

  it('aborts the active request when the panel unmounts', async () => {
    const request = deferred<ReturnType<typeof guideResult>>();
    mockFetch.mockReturnValue(request.promise);
    const { unmount } = renderPanel();

    typeUrl('https://example.com/guide');
    fireEvent.click(screen.getByRole('button', { name: /fetch guide/i }));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const signal = mockFetch.mock.calls[0]?.[1] as AbortSignal;

    unmount();

    expect(signal.aborted).toBe(true);
    const abortError = new Error('The operation was aborted.');
    abortError.name = 'AbortError';
    request.reject(abortError);
  });
});
