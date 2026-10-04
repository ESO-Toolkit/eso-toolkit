import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import {
  AppAuth,
  APP_AUTH_PORT_KEY,
  consumeAppAuthPortBinding,
  storeAppAuthPortBinding,
} from './AppAuth';
import * as auth from './features/auth/auth';

describe('desktop callback binding', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('preserves the desktop nonce separately from the generated OAuth state', () => {
    jest.spyOn(auth, 'generateOAuthState').mockReturnValue('provider-csrf-state');
    const start = jest.spyOn(auth, 'startPKCEAuth').mockResolvedValue(undefined);
    render(
      <MemoryRouter initialEntries={['/app-auth?port=12345&state=desktop-nonce']}>
        <AppAuth />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Continue to ESO Logs' }));

    expect(start).toHaveBeenCalledWith('provider-csrf-state');
    expect(consumeAppAuthPortBinding()).toEqual({
      port: 12345,
      state: 'provider-csrf-state',
      desktopState: 'desktop-nonce',
    });
    expect(consumeAppAuthPortBinding()).toBeNull();
  });

  it('accepts bindings from older clients without a desktop nonce', () => {
    storeAppAuthPortBinding(12345, 'provider-state');
    expect(consumeAppAuthPortBinding()).toMatchObject({ port: 12345, state: 'provider-state' });
  });

  it.each([null, 42, {}, ''])(
    'consumes and rejects a malformed desktop nonce: %p',
    (desktopState) => {
      sessionStorage.setItem(
        APP_AUTH_PORT_KEY,
        JSON.stringify({ port: 12345, state: 'provider-state', desktopState }),
      );
      expect(consumeAppAuthPortBinding()).toBeNull();
      expect(sessionStorage.getItem(APP_AUTH_PORT_KEY)).toBeNull();
    },
  );
});
