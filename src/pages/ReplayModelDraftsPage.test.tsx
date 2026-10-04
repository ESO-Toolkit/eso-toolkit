import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import '@testing-library/jest-dom';

import { getBaseUrl } from '../utils/envUtils';

import {
  parseDraftModelManifest,
  ReplayModelDraftsPage,
  type DraftModelEntry,
  type DraftModelManifest,
} from './ReplayModelDraftsPage';

jest.mock('../utils/envUtils', () => ({ getBaseUrl: jest.fn() }));
jest.mock('../features/fight_replay/components/DraftReplayCanvas', () => ({
  DraftReplayCanvas: ({ entry: selected }: { entry: DraftModelEntry }) => (
    <div data-testid="replay-canvas" data-model={selected.model}>
      {selected.name}
    </div>
  ),
}));
jest.mock('../features/fight_replay/components/DraftModelCanvas', () => ({
  DraftModelCanvas: ({
    modelUrl,
    name,
    posterUrl,
  }: {
    modelUrl: string;
    name: string;
    posterUrl: string;
  }) => (
    <div data-testid="draft-canvas" data-model={modelUrl} data-poster={posterUrl}>
      {name}
    </div>
  ),
}));

const entry = (
  id: string,
  name: string,
  kind: 'lesser' | 'boss',
  family: string,
): DraftModelEntry => ({
  id,
  name,
  kind,
  family,
  model: `models/${id}.glb`,
  referenceImage: `references/${id}.png`,
  previewImage: `previews/${id}.png`,
  sourceUrl: `https://example.com/${id}`,
  reviewNote: 'Unaccepted reconstruction; rear surface inferred.',
});
const manifest: DraftModelManifest = {
  status: 'draft-unaccepted',
  totalBytes: 300,
  entries: [
    entry('bear', 'Brown Bear', 'lesser', 'Bear'),
    entry('spider', 'Organic Spider', 'lesser', 'Spider'),
    entry('boss', 'Trial Guardian', 'boss', 'Construct'),
  ],
};
const prefix = '/dev-previews/pr-test/replay-model-drafts/';
const fetchMock = jest.fn();
const originalFetch = global.fetch;
const originalMatchMedia = window.matchMedia;

function LocationProbe(): React.ReactElement {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname}
      {location.search}
    </output>
  );
}
function renderPage(path = '/replay-model-drafts') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ReplayModelDraftsPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}
async function selectFilter(label: string, option: string): Promise<void> {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: label }));
  fireEvent.click(await screen.findByRole('option', { name: option }));
}

describe('ReplayModelDraftsPage', () => {
  beforeEach(() => {
    jest.mocked(getBaseUrl).mockReturnValue('/dev-previews/pr-test/');
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, json: async () => manifest });
    global.fetch = fetchMock;
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
  });
  afterAll(() => {
    global.fetch = originalFetch;
    window.matchMedia = originalMatchMedia;
  });

  it('opens a deep-linked draft and resolves the manifest and media under the preview base', async () => {
    renderPage('/replay-model-drafts?model=spider');
    const canvas = await screen.findByTestId('draft-canvas');
    expect(fetchMock).toHaveBeenCalledWith(`${prefix}manifest.json`, {
      signal: expect.any(AbortSignal),
    });
    expect(canvas).toHaveAttribute('data-model', `${prefix}models/spider.glb`);
    expect(canvas).toHaveAttribute('data-poster', `${prefix}previews/spider.png`);
    expect(screen.getByRole('img', { name: 'Organic Spider game reference' })).toHaveAttribute(
      'src',
      `${prefix}references/spider.png`,
    );
    expect(screen.getByRole('link', { name: 'Download draft GLB' })).toHaveAttribute(
      'href',
      `${prefix}models/spider.glb`,
    );
    expect(screen.getByRole('link', { name: /Open reference source/ })).toHaveAttribute(
      'href',
      'https://example.com/spider',
    );
    expect(screen.getByText('Unaccepted drafts')).toBeInTheDocument();
  });

  it('updates the model and share URL on selection while preserving other query parameters', async () => {
    renderPage('/replay-model-drafts?model=spider&embed=1');
    fireEvent.click(await screen.findByRole('button', { name: 'View Brown Bear' }));
    expect(screen.getByTestId('draft-canvas')).toHaveAttribute(
      'data-model',
      `${prefix}models/bear.glb`,
    );
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/replay-model-drafts?model=bear&embed=1',
    );
    expect(screen.getByRole('button', { name: 'View Brown Bear' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('combines search, type and family filters and clears an empty result', async () => {
    renderPage();
    await screen.findByTestId('draft-canvas');
    await selectFilter('Type', 'Lesser enemies');
    expect(screen.getByText('Showing 2 of 3 drafts')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View Trial Guardian' })).not.toBeInTheDocument();
    await selectFilter('Family', 'Spider');
    expect(screen.getByText('Showing 1 of 3 drafts')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Organic Spider' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search models' }), {
      target: { value: ' bear ' },
    });
    expect(screen.getByText('Showing 0 of 3 drafts')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText('Showing 3 of 3 drafts')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Search models' })).toHaveValue('');
    fireEvent.change(screen.getByRole('textbox', { name: 'Search models' }), {
      target: { value: ' BEAR ' },
    });
    expect(screen.getByText('Showing 1 of 3 drafts')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Brown Bear' })).toBeInTheDocument();
  });

  it('opens replay deep links and preserves the replay mode when selecting another model', async () => {
    renderPage('/replay-model-drafts?model=spider&view=replay&embed=1');
    expect(await screen.findByTestId('replay-canvas')).toHaveAttribute(
      'data-model',
      'models/spider.glb',
    );
    expect(screen.queryByTestId('draft-canvas')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View Brown Bear' }));
    expect(screen.getByTestId('replay-canvas')).toHaveAttribute('data-model', 'models/bear.glb');
    expect(screen.getByTestId('location')).toHaveTextContent('model=bear&view=replay&embed=1');
  });

  it('switches between model and replay viewers with shareable URLs', async () => {
    renderPage('/replay-model-drafts?model=boss&embed=1');
    await screen.findByTestId('draft-canvas');
    fireEvent.click(screen.getByRole('button', { name: 'Replay preview' }));
    await screen.findByTestId('replay-canvas');
    expect(screen.getByTestId('location')).toHaveTextContent('model=boss&embed=1&view=replay');
    fireEvent.click(screen.getByRole('button', { name: 'Model viewer' }));
    expect(screen.getByTestId('draft-canvas')).toHaveAttribute(
      'data-model',
      `${prefix}models/boss.glb`,
    );
    expect(screen.getByTestId('location')).toHaveTextContent('model=boss&embed=1');
    expect(screen.queryByTestId('replay-canvas')).not.toBeInTheDocument();
  });

  it('retries a failed manifest request and aborts requests on cleanup', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });
    const view = renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The draft gallery could not be loaded.',
    );
    const firstSignal = (fetchMock.mock.calls[0][1] as RequestInit).signal;
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByTestId('draft-canvas');
    expect(firstSignal?.aborted).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondSignal = (fetchMock.mock.calls[1][1] as RequestInit).signal;
    view.unmount();
    expect(secondSignal?.aborted).toBe(true);
  });

  it('falls back to the first draft for an unknown deep link', async () => {
    renderPage('/replay-model-drafts?model=missing');
    await waitFor(() =>
      expect(screen.getByTestId('draft-canvas')).toHaveAttribute(
        'data-model',
        `${prefix}models/bear.glb`,
      ),
    );
  });
});

describe('parseDraftModelManifest', () => {
  it('rejects accepted status, duplicate IDs and incomplete entries', () => {
    expect(() => parseDraftModelManifest({ ...manifest, status: 'accepted' })).toThrow('invalid');
    expect(() =>
      parseDraftModelManifest({ ...manifest, entries: [manifest.entries[0], manifest.entries[0]] }),
    ).toThrow('invalid');
    expect(() =>
      parseDraftModelManifest({ ...manifest, entries: [{ ...manifest.entries[0], model: '' }] }),
    ).toThrow('invalid');
  });
});
