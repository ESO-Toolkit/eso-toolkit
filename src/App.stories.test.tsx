import { render } from '@testing-library/react';
import React from 'react';

import App from './App';

describe('App Storybook Snapshot', () => {
  it('matches the default story snapshot', () => {
    const { container } = render(<App />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
