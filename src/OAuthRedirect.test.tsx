import '@testing-library/jest-dom';

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { consumeAppAuthPortBinding } from './AppAuth';
import * as auth from './features/auth/auth';
import { useAuth } from './features/auth/AuthContext';
import { OAuthRedirect } from './OAuthRedirect';
import { useAppDispatch } from './store/useAppDispatch';

jest.mock('./AppAuth', () => ({
  consumeAppAuthPortBinding: jest.fn(),
}));

jest.mock('./features/auth/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('./store/useAppDispatch', () => ({
  useAppDispatch: jest.fn(),
}));

const mockConsumeAppAuthPortBinding = jest.mocked(consumeAppAuthPortBinding);
const mockUseAuth = jest.mocked(useAuth);
const mockUseAppDispatch = jest.mocked(useAppDispatch);
const mockFetch = jest.fn();

const callbackState = 'one-time-state';
const callbackVerifier = 'pkce-verifier';

const renderCallback = (query: string) =>
  render(
    <MemoryRouter initialEntries={[`/oauth-redirect?${query}`]}>
      <OAuthRedirect />
    </MemoryRouter>,
  );

const seedValidCallback = (): void => {
  sessionStorage.setItem(auth.OAUTH_STATE_KEY, callbackState);
  sessionStorage.setItem(auth.PKCE_CODE_VERIFIER_KEY, callbackVerifier);
};

const expectNoCredentialsPersisted = (): void => {
  for (const key of [auth.ACCESS_TOKEN_KEY, auth.REFRESH_TOKEN_KEY]) {
    expect(sessionStorage.getItem(key)).toBeNull();
    expect(localStorage.getItem(key)).toBeNull();
  }
};

describe('OAuthRedirect callback failures', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    mockFetch.mockReset();
    global.fetch = mockFetch as unknown as typeof fetch;
    mockConsumeAppAuthPortBinding.mockReturnValue(null);
    mockUseAppDispatch.mockReturnValue(jest.fn());
    mockUseAuth.mockReturnValue({ rebindAccessToken: jest.fn() } as unknown as ReturnType<
      typeof useAuth
    >);
    jest.spyOn(auth, 'getRedirectUri').mockReturnValue('https://example.test/oauth-redirect');
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it.each(['invalid_request', 'server_error'])(
    'shows the provider %s error without exchanging or storing credentials',
    async (providerError) => {
      renderCallback(`error=${providerError}`);

      expect(await screen.findByRole('alert')).toHaveTextContent(`OAuth error: ${providerError}`);
      expect(mockFetch).not.toHaveBeenCalled();
      expectNoCredentialsPersisted();
    },
  );

  it('rejects a callback without an authorization code before token exchange', async () => {
    renderCallback(`state=${callbackState}`);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Missing authorization code in URL parameters.',
    );
    expect(mockFetch).not.toHaveBeenCalled();
    expectNoCredentialsPersisted();
  });

  it('rejects a callback without a PKCE verifier before token exchange', async () => {
    sessionStorage.setItem(auth.OAUTH_STATE_KEY, callbackState);

    renderCallback(`code=authorization-code&state=${callbackState}`);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Missing PKCE code verifier. Please restart the authentication process.',
    );
    expect(screen.getByRole('button', { name: 'Restart Authentication' })).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
    expectNoCredentialsPersisted();
  });

  it('shows a token-exchange failure and consumes the valid callback state', async () => {
    seedValidCallback();
    mockFetch.mockResolvedValue({ ok: false });

    renderCallback(`code=authorization-code&state=${callbackState}`);

    expect(await screen.findByRole('alert')).toHaveTextContent('Token exchange failed');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(auth.OAUTH_STATE_KEY)).toBeNull();
    expectNoCredentialsPersisted();
  });

  it('shows a malformed token response error without storing credentials', async () => {
    seedValidCallback();
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockRejectedValue(new SyntaxError('Malformed token response')),
    });

    renderCallback(`code=authorization-code&state=${callbackState}`);

    expect(await screen.findByRole('alert')).toHaveTextContent('Malformed token response');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(auth.OAUTH_STATE_KEY)).toBeNull();
    expectNoCredentialsPersisted();
  });

  it('rejects a token response without an access token without storing credentials', async () => {
    seedValidCallback();
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ refresh_token: 'refresh-token-only' }),
    });

    renderCallback(`code=authorization-code&state=${callbackState}`);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid token response — missing access_token',
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(auth.OAUTH_STATE_KEY)).toBeNull();
    expectNoCredentialsPersisted();
  });

  it('renders a malicious provider error as text rather than HTML', async () => {
    const maliciousError = '<img src=x onerror=alert(1)>';
    const { container } = renderCallback(`error=${encodeURIComponent(maliciousError)}`);

    expect(await screen.findByRole('alert')).toHaveTextContent(`OAuth error: ${maliciousError}`);
    expect(container.querySelector('img')).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
    expectNoCredentialsPersisted();
  });
});
