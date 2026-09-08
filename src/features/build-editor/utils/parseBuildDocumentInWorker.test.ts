import type { Build } from '../types/build.types';
import type { BuildDocumentParserResponse } from '../workers/buildDocumentParser.worker';

import { createBuildDocumentParserWorker } from './createBuildDocumentParserWorker';
import { parseBuildDocumentInWorker } from './parseBuildDocumentInWorker';

jest.mock('./createBuildDocumentParserWorker', () => ({
  createBuildDocumentParserWorker: jest.fn(),
}));

const mockCreateWorker = createBuildDocumentParserWorker as jest.MockedFunction<
  typeof createBuildDocumentParserWorker
>;
const importedBuild = { id: 'imported', name: 'Imported Build' } as Build;

class FakeWorker extends EventTarget {
  postMessage = jest.fn();
  terminate = jest.fn();
}

describe('parseBuildDocumentInWorker', () => {
  let worker: FakeWorker;

  beforeEach(() => {
    worker = new FakeWorker();
    mockCreateWorker.mockReturnValue(worker as unknown as Worker);
  });

  it('transfers the source buffer and terminates after a successful response', async () => {
    const buffer = new ArrayBuffer(16);
    const controller = new AbortController();
    const result = parseBuildDocumentInWorker(buffer, controller.signal);

    expect(worker.postMessage).toHaveBeenCalledWith(buffer, [buffer]);
    worker.dispatchEvent(
      new MessageEvent<BuildDocumentParserResponse>('message', {
        data: { type: 'success', build: importedBuild },
      }),
    );

    await expect(result).resolves.toBe(importedBuild);
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it('terminates and rejects when the worker reports a parse error', async () => {
    const controller = new AbortController();
    const result = parseBuildDocumentInWorker(new ArrayBuffer(8), controller.signal);

    worker.dispatchEvent(
      new MessageEvent<BuildDocumentParserResponse>('message', {
        data: { type: 'error', message: 'Invalid document' },
      }),
    );

    await expect(result).rejects.toThrow('Invalid document');
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });

  it('terminates on abort and ignores a late worker response', async () => {
    const controller = new AbortController();
    const result = parseBuildDocumentInWorker(new ArrayBuffer(8), controller.signal);

    controller.abort();

    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    worker.dispatchEvent(
      new MessageEvent<BuildDocumentParserResponse>('message', {
        data: { type: 'success', build: importedBuild },
      }),
    );
    expect(worker.terminate).toHaveBeenCalledTimes(1);
  });
});
