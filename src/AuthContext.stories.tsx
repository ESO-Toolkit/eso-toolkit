import React from 'react';

import { AuthProvider } from './AuthContext';

const story = {
  title: 'AuthContext/AuthProvider',
  component: AuthProvider,
};
export default story;

export const Default = (): React.ReactElement => <AuthProvider>Auth Context Example</AuthProvider>;
