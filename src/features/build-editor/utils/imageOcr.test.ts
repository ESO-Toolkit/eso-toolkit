import { waitFor } from '@testing-library/react';

import { ocrImages, type OcrProgress } from './imageOcr';

describe('ocrImages cancellation', () => {
  it('terminates the worker, rejects with AbortError, and stops progress after abort', async () => {
    let logger: ((message: { status: string; progress: number }) => void) | undefined;
    const recognize = jest.fn(() => new Promise<{ data: { text: string } }>(() => undefined));
    const terminate = jest.fn().mockResolvedValue(undefined);
    const createWorker = jest.fn(
      (
        _langs: string,
        _oem: number,
        options?: { logger?: (message: { status: string; progress: number }) => void },
      ) => {
        logger = options?.logger;
        return Promise.resolve({
          recognize,
          setParameters: jest.fn().mockResolvedValue(undefined),
          terminate,
        });
      },
    );
    window.Tesseract = { createWorker };
    const progress = jest.fn<void, [OcrProgress]>();
    const controller = new AbortController();

    const result = ocrImages(
      [new Blob(['image'], { type: 'image/png' })],
      progress,
      controller.signal,
    );
    await waitFor(() => expect(recognize).toHaveBeenCalledTimes(1));
    logger?.({ status: 'recognizing text', progress: 0.25 });
    expect(progress).toHaveBeenCalledTimes(1);

    controller.abort();

    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(terminate).toHaveBeenCalledTimes(1);
    logger?.({ status: 'recognizing text', progress: 0.75 });
    expect(progress).toHaveBeenCalledTimes(1);
  });
});
