import React from 'react';
import renderer from 'react-test-renderer';

import OAuthRedirect from './OAuthRedirect';

describe('OAuthRedirect Storybook Snapshot', () => {
  it('matches the default story snapshot', () => {
    const tree = renderer.create(<OAuthRedirect />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
