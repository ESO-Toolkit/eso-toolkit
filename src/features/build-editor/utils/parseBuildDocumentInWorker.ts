import type { Build } from '../types/build.types';
import type { BuildDocumentParserResponse } from '../workers/buildDocumentParser.worker';

import { createBuildDocumentParserWorker } from './createBuildDocumentParserWorker';

const createAbortError = (): DOMException =>
  new DOMException('The build import was canceled.', 'AbortError');

/** Parse a transferred build document off the main thread. */
export const parseBuildDocumentInWorker = (
  buffer: ArrayBuffer,
  signal: AbortSignal,
): Promise<Build | undefined> =>
  new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(createAbortError());
      return;
    }

    let worker: Worker;
    try {
      worker = createBuildDocumentParserWorker();
    } catch (error) {
      reject(error);
      return;
    }

    let settled = false;
    const cleanup = (): void => {
      signal.removeEventListener('abort', handleAbort);
      worker.terminate();
    };
    const resolveOnce = (build: Build | undefined): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(build);
    };
    const rejectOnce = (error: unknown): void => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const handleAbort = (): void => rejectOnce(createAbortError());

    worker.addEventListener('message', (event: MessageEvent<BuildDocumentParserResponse>) => {
      if (event.data.type === 'success') {
        resolveOnce(event.data.build ?? undefined);
        return;
      }
      rejectOnce(new Error(event.data.message));
    });
    worker.addEventListener('error', (event) => {
      event.preventDefault();
      rejectOnce(new Error(event.message || 'The build document worker failed.'));
    });
    worker.addEventListener('messageerror', () => {
      rejectOnce(new Error('The build document worker returned an unreadable response.'));
    });
    signal.addEventListener('abort', handleAbort, { once: true });

    try {
      worker.postMessage(buffer, [buffer]);
    } catch (error) {
      rejectOnce(error);
    }
  });
