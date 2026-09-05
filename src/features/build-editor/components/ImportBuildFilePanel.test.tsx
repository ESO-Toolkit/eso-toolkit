import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const mockDispatch = jest.fn();
const mockEnqueue = jest.fn();

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
}));

jest.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: mockEnqueue }),
}));

jest.mock('../store/buildEditorSlice', () => ({
  loadDraftBuild: jest.fn((build: unknown) => ({
    type: 'buildEditor/loadDraftBuild',
    payload: build,
  })),
}));

jest.mock('../utils/buildDocument', () => ({
  parseBuildDocument: jest.fn(),
}));

jest.mock('../utils/parseBuildDocumentInWorker', () => ({
  parseBuildDocumentInWorker: jest.fn(),
}));

import { loadDraftBuild } from '../store/buildEditorSlice';
import type { Build } from '../types/build.types';
import { parseBuildDocument } from '../utils/buildDocument';
import { parseBuildDocumentInWorker } from '../utils/parseBuildDocumentInWorker';

import { ImportBuildFilePanel } from './ImportBuildFilePanel';

const mockParseBuildDocument = parseBuildDocument as jest.MockedFunction<typeof parseBuildDocument>;
const mockParseBuildDocumentInWorker = parseBuildDocumentInWorker as jest.MockedFunction<
  typeof parseBuildDocumentInWorker
>;
const mockLoadDraftBuild = loadDraftBuild as unknown as jest.Mock;
const importedBuild = { id: 'imported', name: 'Imported Build' } as Build;

const enterSourceAndImport = (): void => {
  fireEvent.change(screen.getByRole('textbox', { name: 'Build document' }), {
    target: { value: '{"format":"eso-log-build"}' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Import build' }));
};

const chooseFile = (file: File): void => {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error('Expected a file input');
  fireEvent.change(input, { target: { files: [file] } });
};

const createBuildFile = (name: string, buffer: ArrayBuffer): File => {
  return new File([buffer], name, { type: 'application/json' });
};

describe('ImportBuildFilePanel', () => {
  beforeEach(() => {
    mockLoadDraftBuild.mockImplementation((build: unknown) => ({
      type: 'buildEditor/loadDraftBuild',
      payload: build,
    }));
  });

  it('loads a valid pasted document as a dirty draft and closes', async () => {
    const onClose = jest.fn();
    mockParseBuildDocument.mockResolvedValue(importedBuild);
    render(<ImportBuildFilePanel onClose={onClose} />);

    enterSourceAndImport();

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'buildEditor/loadDraftBuild',
        payload: importedBuild,
      }),
    );
    expect(mockEnqueue).toHaveBeenCalledWith('Imported “Imported Build”.', {
      variant: 'success',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockParseBuildDocumentInWorker).not.toHaveBeenCalled();
  });

  it('transfers file parsing to the worker helper instead of parsing on the main thread', async () => {
    const onClose = jest.fn();
    const buffer = new ArrayBuffer(16);
    const file = createBuildFile('my-build.esobuild', buffer);
    mockParseBuildDocumentInWorker.mockResolvedValue(importedBuild);
    render(<ImportBuildFilePanel onClose={onClose} />);

    chooseFile(file);

    await waitFor(() => expect(mockParseBuildDocumentInWorker).toHaveBeenCalledTimes(1));
    expect(mockParseBuildDocumentInWorker).toHaveBeenCalledWith(buffer, expect.any(AbortSignal));
    expect(mockParseBuildDocument).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'buildEditor/loadDraftBuild',
      payload: importedBuild,
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('aborts a canceled file worker and ignores its late result', async () => {
    let resolveImport: ((build: Build) => void) | undefined;
    mockParseBuildDocumentInWorker.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveImport = resolve;
        }),
    );
    const onClose = jest.fn();
    render(<ImportBuildFilePanel onClose={onClose} />);

    chooseFile(createBuildFile('pending.esobuild', new ArrayBuffer(8)));
    await waitFor(() => expect(mockParseBuildDocumentInWorker).toHaveBeenCalledTimes(1));
    const signal = mockParseBuildDocumentInWorker.mock.calls[0][1];
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(signal.aborted).toBe(true);
    await act(async () => resolveImport?.(importedBuild));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it('aborts a pending file read on cancel and never starts worker parsing', async () => {
    const originalFileReader = globalThis.FileReader;
    const abort = jest.fn();
    let readerStarted = false;

    class PendingFileReader {
      static readonly LOADING = 1;
      readonly LOADING = 1;
      readyState = PendingFileReader.LOADING;
      result: string | ArrayBuffer | null = null;
      error: DOMException | null = null;
      onload: ((this: FileReader, event: ProgressEvent<FileReader>) => unknown) | null = null;
      onerror: ((this: FileReader, event: ProgressEvent<FileReader>) => unknown) | null = null;
      onabort: ((this: FileReader, event: ProgressEvent<FileReader>) => unknown) | null = null;

      readAsArrayBuffer = jest.fn(() => {
        readerStarted = true;
      });

      abort = abort.mockImplementation(() => {
        this.readyState = 2;
        this.onabort?.call(
          this as unknown as FileReader,
          new ProgressEvent('abort') as ProgressEvent<FileReader>,
        );
      });
    }

    Object.defineProperty(globalThis, 'FileReader', {
      configurable: true,
      writable: true,
      value: PendingFileReader,
    });

    try {
      const onClose = jest.fn();
      render(<ImportBuildFilePanel onClose={onClose} />);

      chooseFile(createBuildFile('still-reading.esobuild', new ArrayBuffer(8)));
      await waitFor(() => expect(readerStarted).toBe(true));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(abort).toHaveBeenCalledTimes(1);
      expect(mockParseBuildDocumentInWorker).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(globalThis, 'FileReader', {
        configurable: true,
        writable: true,
        value: originalFileReader,
      });
    }
  });

  it('aborts an older file operation and ignores its result if a newer file wins', async () => {
    const resolvers: Array<(build: Build) => void> = [];
    mockParseBuildDocumentInWorker.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve);
        }),
    );
    const newerBuild = { id: 'newer', name: 'Newer Build' } as Build;
    const onClose = jest.fn();
    render(<ImportBuildFilePanel onClose={onClose} />);

    chooseFile(createBuildFile('older.esobuild', new ArrayBuffer(8)));
    await waitFor(() => expect(mockParseBuildDocumentInWorker).toHaveBeenCalledTimes(1));
    const olderSignal = mockParseBuildDocumentInWorker.mock.calls[0][1];
    chooseFile(createBuildFile('newer.esobuild', new ArrayBuffer(12)));
    await waitFor(() => expect(mockParseBuildDocumentInWorker).toHaveBeenCalledTimes(2));
    expect(olderSignal.aborted).toBe(true);

    await act(async () => resolvers[0](importedBuild));
    expect(mockDispatch).not.toHaveBeenCalled();
    await act(async () => resolvers[1](newerBuild));

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'buildEditor/loadDraftBuild',
      payload: newerBuild,
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not replace the draft when a pending import is canceled', async () => {
    let resolveImport: ((build: Build) => void) | undefined;
    mockParseBuildDocument.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveImport = resolve;
        }),
    );
    const onClose = jest.fn();
    render(<ImportBuildFilePanel onClose={onClose} />);

    enterSourceAndImport();
    await waitFor(() => expect(mockParseBuildDocument).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await act(async () => resolveImport?.(importedBuild));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it('reports an invalid document without replacing or closing the current draft', async () => {
    const onClose = jest.fn();
    mockParseBuildDocument.mockResolvedValue(undefined);
    render(<ImportBuildFilePanel onClose={onClose} />);

    enterSourceAndImport();

    await expect(
      screen.findByText('This is not a supported .esobuild document or legacy build export.'),
    ).resolves.toBeInTheDocument();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
