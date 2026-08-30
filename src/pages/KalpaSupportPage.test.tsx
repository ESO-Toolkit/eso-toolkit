import '@testing-library/jest-dom';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { useDiscordAuth } from '@/features/auth/DiscordAuthContext';
import {
  createKalpaTicket,
  createSupportSession,
  SupportApiError,
} from '@/features/kalpa-support/support-api';
import {
  SUPPORT_DRAFT_KEY,
  SUPPORT_IDEMPOTENCY_KEY,
  SUPPORT_RESULT_KEY,
} from '@/features/kalpa-support/support-draft';
import { supportDraftFixture } from '@/features/kalpa-support/support-fixtures';

import { KalpaSupportPage } from './KalpaSupportPage';

jest.mock('@/features/auth/DiscordAuthContext');
jest.mock('@/features/kalpa-support/support-api', () => {
  const actual = jest.requireActual('@/features/kalpa-support/support-api');
  return { ...actual, createKalpaTicket: jest.fn(), createSupportSession: jest.fn() };
});
jest.mock('@/hooks/useDocumentTitle', () => ({ usePageTitle: jest.fn() }));

const mockUseDiscordAuth = useDiscordAuth as jest.MockedFunction<typeof useDiscordAuth>;
const mockCreateSupportSession = createSupportSession as jest.MockedFunction<
  typeof createSupportSession
>;
const mockCreateKalpaTicket = createKalpaTicket as jest.MockedFunction<typeof createKalpaTicket>;
const startDiscordLogin = jest.fn();
const clearDiscordAuth = jest.fn();

function arrangeAuth(token: string | null): void {
  mockUseDiscordAuth.mockReturnValue({
    discordToken: token,
    isDiscordAuthed: token !== null,
    startDiscordLogin,
    clearDiscordAuth,
    setDiscordToken: jest.fn(),
  });
}

describe('KalpaSupportPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem(SUPPORT_DRAFT_KEY, JSON.stringify(supportDraftFixture()));
    sessionStorage.setItem(SUPPORT_IDEMPOTENCY_KEY, '123e4567-e89b-42d3-a456-426614174000');
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
    arrangeAuth('discord-token');
    mockCreateSupportSession.mockResolvedValue({
      token: 'support-token',
      expiresAt: '2026-08-28T12:10:00Z',
    });
    mockCreateKalpaTicket.mockResolvedValue({
      status: 'created',
      ticketId: '0042-mtf4xj8k-u1ep8z',
      channelId: '123456789012345678',
      channelUrl: 'https://discord.com/channels/1375703719995244686/123456789012345678',
    });
  });

  it('shows the exact reviewed report and preserves it through Discord login', () => {
    arrangeAuth(null);
    render(<KalpaSupportPage />);

    expect(screen.getByLabelText('Exact support report that will be shared')).toHaveTextContent(
      '# Kalpa support request',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Discord' }));
    expect(startDiscordLogin).toHaveBeenCalledWith('/kalpa/support');
    expect(sessionStorage.getItem(SUPPORT_DRAFT_KEY)).not.toBeNull();
  });

  it('never shows a prepared report beside a confirmed ticket', () => {
    sessionStorage.setItem(
      SUPPORT_RESULT_KEY,
      JSON.stringify({
        status: 'created',
        ticketId: '0042-mtf4xj8k-u1ep8z',
        channelId: '123456789012345678',
        channelUrl: 'https://discord.com/channels/1375703719995244686/123456789012345678',
      }),
    );
    render(<KalpaSupportPage />);

    expect(screen.getByText('Private ticket created')).toBeInTheDocument();
    expect(screen.queryByText(/no ticket created yet/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Manual fallback')).not.toBeInTheDocument();
  });

  it('shows loading and announces authoritative success only after both API calls', async () => {
    let finish: ((value: Awaited<ReturnType<typeof createKalpaTicket>>) => void) | undefined;
    mockCreateKalpaTicket.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    render(<KalpaSupportPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Create private ticket' }));
    expect(await screen.findByRole('button', { name: /Creating private ticket/ })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Creating your private Discord support ticket.',
    );
    expect(screen.queryByText('Private ticket created')).not.toBeInTheDocument();
    finish?.({
      status: 'created',
      ticketId: '0042-mtf4xj8k-u1ep8z',
      channelId: '123456789012345678',
      channelUrl: 'https://discord.com/channels/1375703719995244686/123456789012345678',
    });

    expect(await screen.findByText('Private ticket created')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open private ticket' })).toHaveAttribute(
      'href',
      'https://discord.com/channels/1375703719995244686/123456789012345678',
    );
    expect(mockCreateKalpaTicket).toHaveBeenCalledWith(
      'support-token',
      '123e4567-e89b-42d3-a456-426614174000',
      expect.objectContaining({ issueId: 'install-update' }),
    );
    expect(sessionStorage.getItem(SUPPORT_DRAFT_KEY)).toBeNull();
    expect(sessionStorage.getItem(SUPPORT_IDEMPOTENCY_KEY)).toBeNull();
    expect(sessionStorage.getItem(SUPPORT_RESULT_KEY)).not.toBeNull();
    expect(
      screen.queryByLabelText('Exact support report that will be shared'),
    ).not.toBeInTheDocument();
  });

  it('preserves a confirmed ticket across a page refresh without retaining the report', () => {
    sessionStorage.removeItem(SUPPORT_DRAFT_KEY);
    sessionStorage.removeItem(SUPPORT_IDEMPOTENCY_KEY);
    sessionStorage.setItem(
      SUPPORT_RESULT_KEY,
      JSON.stringify({
        status: 'created',
        ticketId: '0042-mtf4xj8k-u1ep8z',
        channelId: '123456789012345678',
        channelUrl: 'https://discord.com/channels/1375703719995244686/123456789012345678',
      }),
    );
    render(<KalpaSupportPage />);

    expect(screen.getByText('Private ticket created')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create private ticket' })).not.toBeInTheDocument();
    expect(screen.queryByText('Manual fallback')).not.toBeInTheDocument();
  });

  it('keeps confirmed success authoritative when an in-flight clipboard copy later fails', async () => {
    let rejectCopy: ((reason?: unknown) => void) | undefined;
    (navigator.clipboard.writeText as jest.Mock).mockReturnValue(
      new Promise<void>((_resolve, reject) => {
        rejectCopy = reject;
      }),
    );
    render(<KalpaSupportPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy report' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create private ticket' }));

    expect(await screen.findByText('Private ticket created')).toBeInTheDocument();
    rejectCopy?.(new Error('blocked'));

    await waitFor(() =>
      expect(
        screen
          .getAllByRole('alert')
          .some((alert) => alert.textContent?.includes('Clipboard access was blocked')),
      ).toBe(true),
    );
    expect(screen.getByText('Private ticket created')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open private ticket' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create private ticket' })).not.toBeInTheDocument();
    expect(mockCreateKalpaTicket).toHaveBeenCalledTimes(1);
  });

  it('keeps the report and manual fallback after a Discord failure', async () => {
    mockCreateKalpaTicket.mockRejectedValue(
      new SupportApiError('DISCORD_UNAVAILABLE', 'Discord is unavailable.', true),
    );
    render(<KalpaSupportPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Create private ticket' }));

    await waitFor(() =>
      expect(
        screen
          .getAllByRole('alert')
          .some((alert) => alert.textContent?.includes('Discord is unavailable.')),
      ).toBe(true),
    );
    expect(screen.getByRole('button', { name: 'Copy report' })).toBeEnabled();
    expect(sessionStorage.getItem(SUPPORT_DRAFT_KEY)).not.toBeNull();
  });

  it('clears expired authentication but retains the draft for sign-in retry', async () => {
    mockCreateSupportSession.mockRejectedValue(
      new SupportApiError('AUTH_EXPIRED', 'Expired.', false),
    );
    render(<KalpaSupportPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Create private ticket' }));

    await waitFor(() =>
      expect(
        screen
          .getAllByRole('alert')
          .some((alert) => alert.textContent?.includes('Discord sign-in expired')),
      ).toBe(true),
    );
    expect(clearDiscordAuth).toHaveBeenCalled();
    expect(sessionStorage.getItem(SUPPORT_DRAFT_KEY)).not.toBeNull();
  });

  it('disables creation offline and exposes a manual fallback', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    render(<KalpaSupportPage />);

    expect(screen.getByRole('button', { name: 'Create private ticket' })).toBeDisabled();
    expect(screen.getByText(/You appear to be offline/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy report' })).toBeEnabled();
  });

  it('explains clipboard denial without claiming success', async () => {
    (navigator.clipboard.writeText as jest.Mock).mockRejectedValue(new Error('blocked'));
    render(<KalpaSupportPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy report' }));

    await waitFor(() =>
      expect(
        screen
          .getAllByRole('alert')
          .some((alert) => alert.textContent?.includes('Clipboard access was blocked')),
      ).toBe(true),
    );
    expect(screen.queryByText('Private ticket created')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Exact support report that will be shared')).toBeInTheDocument();
  });
});
