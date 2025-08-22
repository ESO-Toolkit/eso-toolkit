import { render, screen } from '@testing-library/react';
import React from 'react';

import { AuthProvider } from './AuthContext';

describe('AuthProvider Storybook Snapshot', () => {
  it('renders children correctly', () => {
    render(<AuthProvider>Auth Context Example</AuthProvider>);
    const element = screen.getByText('Auth Context Example');
    expect(element).toBeInTheDocument();
  });
});
