import type { Decorator } from '@storybook/react';

import { AuthProvider } from '../../features/auth/AuthContext';

export const withAuth: Decorator = (Story, context) => {
  return (
    <AuthProvider>
      <Story />
    </AuthProvider>
  );
};
