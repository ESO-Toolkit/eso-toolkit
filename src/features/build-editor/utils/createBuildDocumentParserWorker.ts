/** Create the dedicated worker used for large build-document imports. */
export const createBuildDocumentParserWorker = (): Worker =>
  new Worker(new URL('../workers/buildDocumentParser.worker.ts', import.meta.url), {
    type: 'module',
  });
