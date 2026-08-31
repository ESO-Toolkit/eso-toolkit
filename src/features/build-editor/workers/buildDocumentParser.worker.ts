import type { Build } from '../types/build.types';
import { parseBuildDocument } from '../utils/buildDocument';

export type BuildDocumentParserResponse =
  { type: 'success'; build: Build | null } | { type: 'error'; message: string };

interface BuildDocumentWorkerScope {
  postMessage: (response: BuildDocumentParserResponse) => void;
  addEventListener: (type: 'message', listener: (event: MessageEvent<ArrayBuffer>) => void) => void;
}

const workerScope = globalThis as unknown as BuildDocumentWorkerScope;

const parseTransferredDocument = async (buffer: ArrayBuffer): Promise<void> => {
  try {
    const source = new TextDecoder().decode(buffer);
    const build = await parseBuildDocument(source);
    const response: BuildDocumentParserResponse = {
      type: 'success',
      build: build ?? null,
    };
    workerScope.postMessage(response);
  } catch (error) {
    const response: BuildDocumentParserResponse = {
      type: 'error',
      message: error instanceof Error ? error.message : 'The build document could not be parsed.',
    };
    workerScope.postMessage(response);
  }
};

workerScope.addEventListener('message', (event: MessageEvent<ArrayBuffer>) => {
  void parseTransferredDocument(event.data);
});

export {};
