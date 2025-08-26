import { render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from './features/auth/AuthContext';
import { OAuthRedirect } from './OAuthRedirect';

describe('OAuthRedirect Storybook Snapshot', () => {
  it('matches the default story snapshot', () => {
    const { container } = render(
      <AuthProvider>
        <MemoryRouter>
          <OAuthRedirect />
        </MemoryRouter>
      </AuthProvider>
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
