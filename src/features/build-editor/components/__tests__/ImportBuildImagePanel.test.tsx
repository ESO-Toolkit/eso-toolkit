/**
 * Tests the image-import wiring: a selected image runs through the (mocked) OCR
 * layer, and the resulting text is handed to ImportBuildTextPanel. The real OCR
 * engine (tesseract.js, CDN-loaded) is mocked — we assert the pipeline, not OCR.
 */

import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SnackbarProvider } from 'notistack';
import React from 'react';
import { Provider } from 'react-redux';

import buildEditorReducer from '../../store/buildEditorSlice';
import { ImportBuildImagePanel } from '../ImportBuildImagePanel';

const mockOcr = jest.fn();
jest.mock('../../utils/imageOcr', () => ({
  ocrImages: (...args: unknown[]) => mockOcr(...args),
}));

const renderPanel = (onClose = jest.fn()) => {
  const store = configureStore({ reducer: { buildEditor: buildEditorReducer } });
  return render(
    <Provider store={store}>
      <SnackbarProvider>
        <ImportBuildImagePanel onClose={onClose} />
      </SnackbarProvider>
    </Provider>,
  );
};

const imageFile = (): File => new File(['x'], 'gear.png', { type: 'image/png' });

// jsdom doesn't implement object URLs (used for image previews) — stub them.
beforeAll(() => {
  global.URL.createObjectURL = jest.fn(() => 'blob:mock');
  global.URL.revokeObjectURL = jest.fn();
});

beforeEach(() => mockOcr.mockReset());

describe('ImportBuildImagePanel', () => {
  it('disables "Read text" until an image is added', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: /read text/i })).toBeDisabled();
  });

  it('runs OCR on the selected image and shows the extracted text for review', async () => {
    mockOcr.mockResolvedValue(
      [
        'GEAR SLOT\tSET\tWEIGHT/TYPE\tTRAIT\tENCHANT',
        'Head\tSlimecraw\tMedium\tDivines\tMagicka',
      ].join('\n'),
    );
    renderPanel();

    // Select an image via the hidden file input.
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [imageFile()] } });

    const readBtn = screen.getByRole('button', { name: /read text/i });
    await waitFor(() => expect(readBtn).toBeEnabled());
    fireEvent.click(readBtn);

    expect(mockOcr).toHaveBeenCalledTimes(1);
    // After OCR, the text-review panel is shown seeded with the extracted text.
    await waitFor(() =>
      expect(screen.getByText(/detect the gear, skills, champion points/i)).toBeInTheDocument(),
    );
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toMatch(/Slimecraw/);
  });

  it('surfaces an OCR failure as an error message', async () => {
    mockOcr.mockRejectedValue(new Error('Could not load the OCR engine.'));
    renderPanel();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [imageFile()] } });
    fireEvent.click(screen.getByRole('button', { name: /read text/i }));
    await waitFor(() =>
      expect(screen.getByText(/could not load the ocr engine/i)).toBeInTheDocument(),
    );
  });
});
