import { packsApi } from './packs-api';

jest.mock('../../../utils/envUtils', () => ({
  getRosterHubBaseUrl: () => 'https://roster.example.test',
}));

const jsonResponse = (body: unknown): Response =>
  ({
    ok: true,
    json: async () => body,
  }) as Response;

describe('packsApi compatibility adapter', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('uses the canonical roster-hub-api URL and maps the pack list shape', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        packs: [
          {
            id: 'pack-1',
            author_id: 'user-1',
            author_name: 'Raid Lead',
            is_anonymous: false,
            title: 'Trial essentials',
            description: 'Core add-ons',
            pack_type: 'addon-pack',
            addons: [{ esouiId: 42, name: 'Combat Metrics', required: true }],
            vote_count: 3,
            created_at: '2026-08-23T00:00:00.000Z',
            updated_at: '2026-08-23T00:00:00.000Z',
            tags: ['trial'],
          },
        ],
        page: 1,
        sort: 'recent',
      }),
    );

    await expect(packsApi.list({ q: 'essentials' })).resolves.toEqual({
      items: [
        expect.objectContaining({
          id: 'pack-1',
          name: 'Trial essentials',
          addonCount: 1,
          buildCount: 0,
          rosterCount: 0,
        }),
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://roster.example.test/packs?sort=recent&page=1',
      expect.objectContaining({ cache: 'no-store' }),
    );
  });

  it('maps a single canonical pack to the legacy build-hub shape', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        pack: {
          id: 'pack-2',
          author_id: 'user-2',
          author_name: 'Anonymous',
          is_anonymous: true,
          title: 'Healing tools',
          description: 'Support add-ons',
          pack_type: 'roster-pack',
          addons: [{ esouiId: 7, name: 'Healer Helper' }],
          vote_count: 0,
          created_at: '2026-08-22T00:00:00.000Z',
          updated_at: '2026-08-23T00:00:00.000Z',
          tags: [],
        },
      }),
    );

    await expect(packsApi.get('pack-2')).resolves.toMatchObject({
      id: 'pack-2',
      name: 'Healing tools',
      type: 'roster-pack',
      metadata: { createdBy: 'Anonymous' },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://roster.example.test/packs/pack-2',
      expect.objectContaining({ cache: 'no-store' }),
    );
  });
});
