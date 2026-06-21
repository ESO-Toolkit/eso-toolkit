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
  const input = document.querySelector('input[type="text"], input:not([type])') as HTMLInputElement;
  fireEvent.change(input, { target: { value } });
};

describe('ImportBuildLinkPanel', () => {
  it('rejects a non-URL before calling the worker', async () => {
    renderPanel();
    typeUrl('not a url');
    fireEvent.click(screen.getByRole('button', { name: /fetch guide/i }));
    await waitFor(() => expect(screen.getByText(/full guide URL/i)).toBeInTheDocument());
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetches a guide and shows the extracted text for review', async () => {
    mockFetch.mockResolvedValue({
      title: 'Guide',
      finalUrl: 'https://example.com/guide',
      images: [],
      text: [
        'GEAR SLOT\tSET\tWEIGHT/TYPE\tTRAIT\tENCHANT',
        'Head\tSlimecraw\tMedium\tDivines\tMagicka',
        'I use Nord for survivability.',
      ].join('\n'),
    });
    renderPanel();
    typeUrl('https://example.com/guide');
    fireEvent.click(screen.getByRole('button', { name: /fetch guide/i }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('https://example.com/guide'));
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
});
