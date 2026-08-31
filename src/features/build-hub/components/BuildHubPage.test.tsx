import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

jest.mock('@/hooks/useDocumentTitle', () => ({ usePageTitle: () => undefined }));
jest.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: () => undefined }),
}));
jest.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ isLoggedIn: true, accessToken: 'token', currentUser: { id: 'user-1' } }),
}));
jest.mock('../hooks/use-build-hub', () => ({
  useBuildHub: () => ({
    filteredBuilds: [],
    loading: false,
    error: null,
    filters: {},
    hasMore: false,
    setFilter: () => undefined,
    loadMore: () => undefined,
    refresh: () => undefined,
    vote: () => undefined,
  }),
}));
jest.mock('../../../components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../../roster-hub/components/ConfirmDialog', () => ({ ConfirmDialog: () => null }));
jest.mock('./BuildCard', () => ({ BuildCard: () => null }));
jest.mock('./BuildCardSkeleton', () => ({ BuildCardSkeleton: () => null }));
jest.mock('./BuildFilterBar', () => ({ BuildFilterBar: () => null }));
jest.mock('./PublishBuildDialog', () => ({ PublishBuildDialog: () => null }));

import { BuildHubPage } from './BuildHubPage';

const DestinationProbe: React.FC = () => {
  const location = useLocation();
  return <div data-testid="destination-state">{JSON.stringify(location.state)}</div>;
};

describe('BuildHubPage create navigation', () => {
  it('marks the Create Build destination as an explicit new build', async () => {
    render(
      <MemoryRouter initialEntries={['/build-hub']}>
        <Routes>
          <Route path="/build-hub" element={<BuildHubPage />} />
          <Route path="/build-editor" element={<DestinationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('link', { name: 'Create Build' }));

    await waitFor(() =>
      expect(screen.getByTestId('destination-state')).toHaveTextContent('{"newBuild":true}'),
    );
  });
});
