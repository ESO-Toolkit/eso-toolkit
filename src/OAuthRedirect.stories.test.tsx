import { render } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from './AuthContext';
import { OAuthRedirect } from './OAuthRedirect';

describe('OAuthRedirect Storybook Snapshot', () => {
  it('matches the default story snapshot', () => {
    const { container } = render(
      <AuthProvider>
        <MemoryRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <OAuthRedirect />
        </MemoryRouter>
      </AuthProvider>
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
