import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { DiscordOAuthRedirect } from './DiscordOAuthRedirect';
import * as discordAuth from './features/auth/discord-auth';
import { useDiscordAuth } from './features/auth/DiscordAuthContext';

jest.mock('./features/auth/DiscordAuthContext');

const mockUseDiscordAuth = useDiscordAuth as jest.MockedFunction<typeof useDiscordAuth>;

describe('Discord OAuth redirect', () => {
  beforeEach(() => {
    mockUseDiscordAuth.mockReturnValue({
      discordToken: null,
      isDiscordAuthed: false,
      startDiscordLogin: jest.fn(),
      clearDiscordAuth: jest.fn(),
      setDiscordToken: jest.fn(),
    });
  });

  it('validates and consumes OAuth state when Discord authorization is cancelled', async () => {
    const validateState = jest.spyOn(discordAuth, 'validateOAuthState').mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={['/discord-oauth-redirect?error=access_denied&state=state-1']}>
        <DiscordOAuthRedirect />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Connection Failed')).toBeInTheDocument();
    expect(screen.getByText(/authorization was denied or failed/)).toBeInTheDocument();
    expect(validateState).toHaveBeenCalledWith('state-1');
  });

  it('does not treat a forged cancellation callback as a valid Discord response', async () => {
    jest.spyOn(discordAuth, 'validateOAuthState').mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={['/discord-oauth-redirect?error=access_denied&state=wrong']}>
        <DiscordOAuthRedirect />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Discord session expired/)).toBeInTheDocument();
  });
});
