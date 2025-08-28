import { render } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';

import { AuthProvider } from './features/auth/AuthContext';
import { OAuthRedirect } from './OAuthRedirect';
import store from './store/storeWithHistory';

describe('OAuthRedirect Storybook Snapshot', () => {
  it('matches the default story snapshot', () => {
    const { container } = render(
      <Provider store={store}>
        <AuthProvider>
          <OAuthRedirect />
        </AuthProvider>
      </Provider>
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
