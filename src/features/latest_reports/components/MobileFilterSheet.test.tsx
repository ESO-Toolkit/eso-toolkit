import { fireEvent, render, screen } from '@testing-library/react';

import type { LatestReportsFilters } from '../hooks/useLatestReportsUrlState';

import { MobileFilterSheet } from './MobileFilterSheet';

// Avoid the GraphQL client context the real zone hook needs — the sheet's
// behaviour under test (drafts, reset, apply) is independent of zone loading.
jest.mock('../hooks/useZoneOptions', () => ({
  useZoneOptions: () => ({ zones: [], loading: false, error: null }),
}));

const baseFilters: LatestReportsFilters = {
  page: 1,
  q: '',
  zoneId: null,
  range: 'all',
  customFrom: null,
  customTo: null,
};

const renderSheet = (over?: Partial<LatestReportsFilters>) => {
  const onApply = jest.fn();
  const onClose = jest.fn();
  render(
    <MobileFilterSheet
      open
      onClose={onClose}
      filters={{ ...baseFilters, ...over }}
      onApply={onApply}
    />,
  );
  return { onApply, onClose };
};

describe('MobileFilterSheet', () => {
  it('disables Reset and shows a neutral Apply label when nothing is drafted', () => {
    renderSheet();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled();
  });

  it('reflects the active-filter count and commits drafts on Apply', () => {
    const { onApply, onClose } = renderSheet();

    fireEvent.click(screen.getByRole('button', { name: 'Last 7 days' }));

    expect(screen.getByText('1 active')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /Apply 1 filter/ }));

    expect(onApply).toHaveBeenCalledWith({
      zoneId: null,
      date: { range: '7d', customFrom: null, customTo: null },
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('Reset returns the drafts to the all-time default', () => {
    renderSheet({ range: '30d' });

    expect(screen.getByText('1 active')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.queryByText('1 active')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All time' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
