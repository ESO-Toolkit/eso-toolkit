import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import '@testing-library/jest-dom';

import { FightFragment, ReportFragment } from '../../graphql/gql/graphql';
import reportReducer from '../../store/report/reportSlice';

import { ReportFightDetails } from './ReportFightDetails';

const mockClient = { query: jest.fn() };
const mockNavigation = {
  reportId: 'ABC123',
  fightId: '1',
  tabId: 'insights',
  selectedTabId: 'insights',
};

jest.mock('../../hooks', () => ({
  useReportData: jest.requireActual('../../hooks/useReportData').useReportData,
}));
jest.mock('../../EsoLogsClientContext', () => ({
  useEsoLogsClientContext: () => ({ client: mockClient, isReady: true }),
}));
jest.mock('../../ReportFightContext', () => ({
  useReportFightDetailsNavigation: () => mockNavigation,
  useSelectedReportAndFight: () => mockNavigation,
}));
jest.mock('../../components/DynamicMetaTags', () => ({
  DynamicMetaTags: () => null,
  generateReportMetaTags: () => null,
}));
jest.mock('../../utils/errorTracking', () => ({ addBreadcrumb: jest.fn() }));
jest.mock('../../utils/getSkeletonForTab', () => ({
  TabId: { INSIGHTS: 'insights' },
  getSkeletonForTab: () => <div data-testid="fight-skeleton" />,
}));
jest.mock('./ReportFightHeader', () => ({ ReportFightHeader: () => null }));
jest.mock('./FightDetails', () => ({ FightDetails: () => <div>Fight loaded</div> }));

const fight = { id: 1, name: 'Boss', startTime: 0, endTime: 1000 } as FightFragment;
const report = { code: 'ABC123', title: 'Report', fights: [fight] } as ReportFragment;

const renderDetails = () => {
  const store = configureStore({
    reducer: { report: reportReducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
  });
  return render(<ReportFightDetails />, {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  });
};

beforeEach(() => {
  mockClient.query.mockReset();
  mockNavigation.reportId = 'ABC123';
  mockNavigation.fightId = '1';
});

it('keeps the skeleton while the initial request is pending', () => {
  mockClient.query.mockReturnValue(new Promise(() => {}));
  renderDetails();
  expect(screen.getByTestId('fight-skeleton')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.queryByText(/not found/)).not.toBeInTheDocument();
});

it('replaces a failed request with an error and retries the network successfully', async () => {
  mockClient.query
    .mockRejectedValueOnce(new Error('Service unavailable'))
    .mockResolvedValueOnce({ reportData: { report } });
  renderDetails();

  expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable');
  expect(screen.queryByTestId('fight-skeleton')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

  expect(await screen.findByText('Fight loaded')).toBeInTheDocument();
  expect(mockClient.query).toHaveBeenCalledTimes(2);
  expect(mockClient.query).toHaveBeenLastCalledWith(
    expect.objectContaining({ fetchPolicy: 'network-only' }),
  );
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('reports a nonexistent fight after loading a valid report', async () => {
  mockNavigation.fightId = '99';
  mockClient.query.mockResolvedValue({ reportData: { report } });
  renderDetails();
  expect(await screen.findByText('Fight (99) not found.')).toBeInTheDocument();
  expect(screen.queryByTestId('fight-skeleton')).not.toBeInTheDocument();
});

it('reports a missing or inaccessible report rather than a missing fight', async () => {
  mockClient.query.mockResolvedValue({ reportData: { report: null } });
  renderDetails();
  expect(await screen.findByRole('alert')).toHaveTextContent('Report not found or not public.');
  expect(screen.queryByText(/Fight .* not found/)).not.toBeInTheDocument();
});

it('does not show the previous report error while navigating to another report', async () => {
  mockClient.query.mockRejectedValueOnce(new Error('Old report failure'));
  const view = renderDetails();
  await screen.findByRole('alert');
  mockNavigation.reportId = 'OTHER';
  mockClient.query.mockReturnValue(new Promise(() => {}));
  // Preserve the store/provider while rendering the new route.
  view.rerender(<ReportFightDetails />);
  await waitFor(() => expect(screen.getByTestId('fight-skeleton')).toBeInTheDocument());
  expect(screen.queryByText('Old report failure')).not.toBeInTheDocument();
});
