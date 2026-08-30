import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';

import { useDiscordAuth } from '@/features/auth/DiscordAuthContext';
import { SUPPORT_DRAFT_KEY, SUPPORT_IDEMPOTENCY_KEY } from '@/features/kalpa-support/support-draft';
import { supportDraftFixture } from '@/features/kalpa-support/support-fixtures';
import { KalpaSupportPage } from '@/pages/KalpaSupportPage';

jest.mock('@/features/auth/DiscordAuthContext');
jest.mock('@/hooks/useDocumentTitle', () => ({ usePageTitle: jest.fn() }));

const mockUseDiscordAuth = useDiscordAuth as jest.MockedFunction<typeof useDiscordAuth>;
const clearDiscordAuth = jest.fn();

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function arrangeAuthenticatedPage(): void {
  sessionStorage.clear();
  sessionStorage.setItem(SUPPORT_DRAFT_KEY, JSON.stringify(supportDraftFixture()));
  sessionStorage.setItem(SUPPORT_IDEMPOTENCY_KEY, '123e4567-e89b-42d3-a456-426614174000');
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: jest.fn().mockResolvedValue(undefined) },
  });
  mockUseDiscordAuth.mockReturnValue({
    discordToken: 'discord-token',
    isDiscordAuthed: true,
    startDiscordLogin: jest.fn(),
    clearDiscordAuth,
    setDiscordToken: jest.fn(),
  });
}

describe('Kalpa authenticated support handoff', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    arrangeAuthenticatedPage();
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it('exchanges Discord identity and creates the reviewed ticket through the real API client', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ token: 'support-token', expiresAt: '2026-08-28T12:10:00Z' }),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            status: 'created',
            ticketId: '0042',
            channelId: '123456789012345678',
            channelUrl: 'https://discord.com/channels/1375703719995244686/123456789012345678',
          },
          201,
        ),
      );
    render(<KalpaSupportPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Create private ticket' }));

    expect(await screen.findByText('Private ticket created')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://discord-bot.test/discord/support/kalpa/session',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer discord-token' },
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://discord-bot.test/discord/support/kalpa/tickets',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer support-token',
          'Idempotency-Key': '123e4567-e89b-42d3-a456-426614174000',
        }),
      }),
    );
  });

  it('creates one ticket for a doubled click and never announces success early', async () => {
    let releaseSession: ((value: Response) => void) | undefined;
    fetchMock
      .mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          releaseSession = resolve;
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            status: 'created',
            ticketId: '0042',
            channelId: '123456789012345678',
            channelUrl: 'https://discord.com/channels/1375703719995244686/123456789012345678',
          },
          201,
        ),
      );
    render(<KalpaSupportPage />);

    const create = screen.getByRole('button', { name: 'Create private ticket' });
    // Dispatched without letting React re-render between them, which is the only
    // way `phase` alone would not have blocked the second and third.
    create.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    create.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    create.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // The in-flight guard has to hold before the session call even resolves,
    // otherwise three sessions race three ticket creations.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Private ticket created')).not.toBeInTheDocument();

    releaseSession?.(jsonResponse({ token: 'support-token', expiresAt: '2026-08-28T12:10:00Z' }));

    expect(await screen.findByText('Private ticket created')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries a transient failure with the same idempotency key so the server can replay', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ token: 'support-token', expiresAt: '2026-08-28T12:10:00Z' }),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          { error: { code: 'TICKET_RECOVERING', message: 'Still creating.', retryable: true } },
          409,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse({ token: 'support-token-2', expiresAt: '2026-08-28T12:20:00Z' }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          status: 'created',
          ticketId: '0042',
          channelId: '123456789012345678',
          channelUrl: 'https://discord.com/channels/1375703719995244686/123456789012345678',
        }),
      );
    render(<KalpaSupportPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Create private ticket' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/may still be creating/i);
    expect(screen.queryByText('Private ticket created')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Create private ticket' }));
    expect(await screen.findByText('Private ticket created')).toBeInTheDocument();

    const keys = fetchMock.mock.calls
      .filter(([url]) => String(url).endsWith('/tickets'))
      .map(([, init]) => (init as RequestInit).headers as Record<string, string>)
      .map((headers) => headers['Idempotency-Key']);
    expect(keys).toEqual([
      '123e4567-e89b-42d3-a456-426614174000',
      '123e4567-e89b-42d3-a456-426614174000',
    ]);
  });

  it.each([
    [403, 'NOT_A_MEMBER', /not a member of the ESO Toolkit server/],
    [503, 'DISCORD_UNAVAILABLE', /Discord is unavailable/],
  ])(
    'preserves the manual fallback for an HTTP %i support failure',
    async (status, code, expectedMessage) => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          {
            error: {
              code,
              message: code === 'DISCORD_UNAVAILABLE' ? 'Discord is unavailable.' : 'Forbidden.',
              retryable: status >= 500,
            },
          },
          status,
        ),
      );
      render(<KalpaSupportPage />);

      fireEvent.click(screen.getByRole('button', { name: 'Create private ticket' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(expectedMessage);
      expect(screen.getByRole('button', { name: 'Copy report' })).toBeEnabled();
      expect(screen.queryByText('Private ticket created')).not.toBeInTheDocument();
      expect(sessionStorage.getItem(SUPPORT_DRAFT_KEY)).not.toBeNull();
    },
  );

  it('clears expired Discord authentication while keeping the same report for recovery', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          error: { code: 'AUTH_EXPIRED', message: 'Expired.', retryable: false },
        },
        401,
      ),
    );
    render(<KalpaSupportPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Create private ticket' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Discord sign-in expired/);
    expect(clearDiscordAuth).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(SUPPORT_DRAFT_KEY)).not.toBeNull();
  });
});
