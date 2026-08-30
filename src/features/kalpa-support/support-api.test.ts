import {
  createKalpaTicket,
  createSupportSession,
  parseCreatedTicket,
  SupportApiError,
} from './support-api';
import { supportDraftFixture } from './support-fixtures';

describe('Kalpa support API client', () => {
  const fetchMock = jest.fn();

  function jsonResponse(body: unknown, status = 200): Response {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: jest.fn().mockResolvedValue(body),
    } as unknown as Response;
  }

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it('exchanges the Discord bearer token without placing identity in the request body', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ token: 'support-token', expiresAt: '2026-08-28T12:10:00Z' }),
    );

    await expect(createSupportSession('discord-token')).resolves.toMatchObject({
      token: 'support-token',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/discord\/support\/kalpa\/session$/),
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer discord-token' },
      }),
    );
  });

  it('reuses the caller idempotency key and sends only the validated payload', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          status: 'created',
          ticketId: '0042-mtf4xj8k-u1ep8z',
          channelId: '123456789012345678',
          channelUrl: 'https://discord.com/channels/1375703719995244686/123456789012345678',
        },
        201,
      ),
    );

    await createKalpaTicket(
      'support-token',
      '123e4567-e89b-42d3-a456-426614174000',
      supportDraftFixture(),
    );
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer support-token',
      'Idempotency-Key': '123e4567-e89b-42d3-a456-426614174000',
    });
    expect(JSON.parse(init.body as string)).toEqual({ payload: supportDraftFixture() });
  });

  it.each([
    // Exactly what `nextTicketId` in the bot's KV module produces:
    // <counter padded to 4>-<base36 Date.now()>-<base36 uint32>.
    '0006-mtf4xj8k-u1ep8z',
    '0001-m0000000-0',
    '12345-mzzzzzzz-zzzzzzz',
  ])('accepts the ticket id format the ticket service actually issues: %s', (ticketId) => {
    expect(
      parseCreatedTicket({
        status: 'created',
        ticketId,
        channelId: '123456789012345678',
        channelUrl: 'https://discord.com/channels/1375703719995244686/123456789012345678',
      }),
    ).not.toBeNull();
  });

  it('still rejects a ticket id that is not in the service format', () => {
    for (const ticketId of ['0042', '', 'not-a-ticket', '../../etc', '0042-MTF4XJ8K-u1ep8z']) {
      expect(
        parseCreatedTicket({
          status: 'created',
          ticketId,
          channelId: '123456789012345678',
          channelUrl: 'https://discord.com/channels/1375703719995244686/123456789012345678',
        }),
      ).toBeNull();
    }
  });

  it('rejects a ticket confirmation that points outside the configured Discord guild', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        status: 'created',
        ticketId: '0042-mtf4xj8k-u1ep8z',
        channelId: '123456789012345678',
        channelUrl: 'https://example.test/not-a-ticket',
      }),
    );

    await expect(
      createKalpaTicket(
        'support-token',
        '123e4567-e89b-42d3-a456-426614174000',
        supportDraftFixture(),
      ),
    ).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
  });

  it('turns structured failures into retry-aware errors', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          requestId: 'request-1',
          error: { code: 'DISCORD_UNAVAILABLE', message: 'Try again.', retryable: true },
        },
        503,
      ),
    );

    const failure = createSupportSession('discord-token');
    await expect(failure).rejects.toBeInstanceOf(SupportApiError);
    await expect(failure).rejects.toMatchObject({
      code: 'DISCORD_UNAVAILABLE',
      retryable: true,
      requestId: 'request-1',
    });
  });
});
