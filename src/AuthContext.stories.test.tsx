import React from 'react';
import renderer from 'react-test-renderer';

import { AuthProvider } from './AuthContext';

describe('AuthProvider Storybook Snapshot', () => {
  it('matches the default story snapshot', () => {
    const tree = renderer.create(<AuthProvider>Auth Context Example</AuthProvider>).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
