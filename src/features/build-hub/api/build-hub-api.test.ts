import { buildHubApi } from './build-hub-api';

jest.mock('../../../utils/envUtils', () => ({
  getRosterHubBaseUrl: () => 'https://api.example.test',
}));

const jsonResponse = (body: unknown): Response =>
  ({
    ok: true,
    json: async () => body,
  }) as Response;

describe('buildHubApi', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('sends visibility when publishing builds', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ build: { id: 'build-1' } }));

    await buildHubApi.create(
      {
        title: 'Private build',
        eso_class: 'dragonknight',
        role: 'tank',
        build_data: 'encoded-build',
        visibility: 'private',
      },
      'owner-token',
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/builds',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer owner-token',
          'Content-Type': 'application/json',
        }),
      }),
    );
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toMatchObject({
      visibility: 'private',
    });
  });

  it('sends auth when fetching a build by id', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ build: { id: 'private-build' } }));

    await buildHubApi.get('private-build', 'owner-token');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/builds/private-build',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer owner-token',
        }),
      }),
    );
  });

  it('sends auth when reading comments for a private build', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ comments: [] }));

    await buildHubApi.listComments('private-build', 'owner-token');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/builds/private-build/comments',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer owner-token',
        }),
      }),
    );
  });
});
