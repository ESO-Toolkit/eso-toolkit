import { fetchGuideByUrl } from './fetch-guide-api';

jest.mock('../../../utils/envUtils', () => ({
  getRosterHubBaseUrl: () => 'https://roster.example.test',
}));

const jsonResponse = (body: unknown): Response =>
  ({
    ok: true,
    json: async () => body,
  }) as Response;

describe('fetchGuideByUrl', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('passes the caller AbortSignal to the worker proxy request', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        html: '<main><h1>Example build</h1><p>Example guide text</p></main>',
        finalUrl: 'https://example.com/build',
        truncated: false,
      }),
    );
    const controller = new AbortController();

    await fetchGuideByUrl('https://example.com/build', controller.signal);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://roster.example.test/fetch-guide?url=https%3A%2F%2Fexample.com%2Fbuild',
      { signal: controller.signal },
    );
  });
});
