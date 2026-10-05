import { act, renderHook, waitFor } from '@testing-library/react';

import { buildDraftReplayLookup } from '../utils/draftReplayPreview';

import { useDraftReplayModels } from './useDraftReplayModels';

jest.mock('../../../utils/envUtils', () => ({
  getBaseUrl: () => 'https://example.com/preview/',
}));

const manifest = {
  status: 'draft-unaccepted',
  totalBytes: 0,
  entries: [
    {
      id: 'count-ryelaz-complete-folded-front',
      name: 'Count Ryelaz',
      kind: 'boss',
      family: 'Vampire',
      model: 'count/model.glb',
      referenceImage: 'reference.png',
      previewImage: 'preview.png',
      sourceUrl: 'https://example.com/reference',
      reviewNote: 'Unaccepted draft.',
    },
  ],
};

const mockFetch = jest.fn();
const originalFetch = global.fetch;

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch;
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('useDraftReplayModels', () => {
  it('does not request drafts in a standard recorded replay', () => {
    const { result } = renderHook(() => useDraftReplayModels(false, null));
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.overrides.size).toBe(0);
    expect(result.current.status).toBe('idle');
  });

  it('loads from the preview base and matches positions when the fight finishes loading', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => manifest });
    const { result, rerender } = renderHook(({ lookup }) => useDraftReplayModels(true, lookup), {
      initialProps: { lookup: null as ReturnType<typeof buildDraftReplayLookup> | null },
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/preview/replay-model-drafts/manifest.json',
      { signal: expect.any(AbortSignal) },
    );
    expect(result.current.overrides.size).toBe(0);
    const lookup = buildDraftReplayLookup({ name: 'Count Ryelaz', kind: 'boss' });
    rerender({ lookup });
    expect(result.current.overrides.get(900001)?.id).toBe(
      'draft-preview-count-ryelaz-complete-folded-front',
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    { ok: false, json: async () => manifest },
    { ok: true, json: async () => ({ status: 'accepted', entries: [] }) },
  ])('falls back when the manifest is unavailable or invalid', async (response) => {
    mockFetch.mockResolvedValue(response);
    const { result } = renderHook(() => useDraftReplayModels(true, null));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.overrides.size).toBe(0);
  });

  it('aborts a pending request and ignores its result when draft mode is disabled', async () => {
    let resolveRequest!: (value: unknown) => void;
    mockFetch.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const lookup = buildDraftReplayLookup({ name: 'Count Ryelaz', kind: 'boss' });
    const { result, rerender } = renderHook(
      ({ enabled }) => useDraftReplayModels(enabled, lookup),
      {
        initialProps: { enabled: true },
      },
    );
    const request = mockFetch.mock.calls[0][1] as { signal: AbortSignal };
    rerender({ enabled: false });
    expect(request.signal.aborted).toBe(true);
    await act(async () => {
      resolveRequest({ ok: true, json: async () => manifest });
    });
    expect(result.current.status).toBe('idle');
    expect(result.current.overrides.size).toBe(0);
  });
});
