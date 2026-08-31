import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const mockTempBuildGet = jest.fn();

jest.mock('@/hooks/useDocumentTitle', () => ({ usePageTitle: () => undefined }));
jest.mock('../features/build-editor/api/temp-build-api', () => ({
  tempBuildApi: { get: (slug: string) => mockTempBuildGet(slug) },
}));
jest.mock('../features/build-editor/components/primitives/GlassPanel', () => ({
  GlassPanel: ({ children }: { children: React.ReactNode }) => children,
}));

import { TempBuildViewPage } from './TempBuildViewPage';

const DestinationProbe: React.FC = () => {
  const location = useLocation();
  return <div data-testid="destination-state">{JSON.stringify(location.state)}</div>;
};

describe('TempBuildViewPage create navigation', () => {
  beforeEach(() => {
    mockTempBuildGet.mockResolvedValue(null);
  });

  it('marks the expired-link CTA destination as an explicit new build', async () => {
    render(
      <MemoryRouter initialEntries={['/b/expired']}>
        <Routes>
          <Route path="/b/:slug" element={<TempBuildViewPage />} />
          <Route path="/build-editor" element={<DestinationProbe />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Create New Build' }));

    await waitFor(() =>
      expect(screen.getByTestId('destination-state')).toHaveTextContent('{"newBuild":true}'),
    );
  });
});
