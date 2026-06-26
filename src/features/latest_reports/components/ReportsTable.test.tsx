import { fireEvent, render, screen } from '@testing-library/react';

import type { UserReportSummaryFragment } from '../../../graphql/gql/graphql';

import { ReportsTable } from './ReportsTable';

const report: UserReportSummaryFragment = {
  __typename: 'Report',
  code: 'XYZ123',
  startTime: 1_700_000_000_000,
  endTime: 1_700_000_360_000,
  title: 'Rockgrove HM',
  visibility: 'public',
  segments: 3,
  zone: { __typename: 'Zone', id: 1, name: 'Rockgrove' },
  owner: { __typename: 'User', name: 'Alice' },
};

const emptyReport: UserReportSummaryFragment = {
  ...report,
  code: 'EMPTY1',
  title: 'Still Processing',
  segments: 0,
  endTime: report.startTime,
};

describe('ReportsTable', () => {
  it('renders each report as a keyboard-operable link row', () => {
    const onSelect = jest.fn();
    render(<ReportsTable reports={[report]} onSelect={onSelect} />);
    const row = screen.getByRole('link', { name: /Rockgrove HM, Rockgrove\. View report\./i });
    expect(row).toHaveAttribute('tabindex', '0');
    fireEvent.click(row);
    expect(onSelect).toHaveBeenCalledWith('XYZ123', expect.anything());
  });

  it('flags an empty (no-combat) row with an "Empty" badge', () => {
    // Parity with ReportCard's badge: now that the list fails open and shows
    // whole pages of still-processing logs (instead of a dead-end wall), the
    // default desktop table view must forewarn the user before they open one.
    const onSelect = jest.fn();
    render(<ReportsTable reports={[emptyReport]} onSelect={onSelect} />);
    expect(screen.getByText('Empty')).toBeInTheDocument();
  });

  it('does not flag a normal report', () => {
    const onSelect = jest.fn();
    render(<ReportsTable reports={[report]} onSelect={onSelect} />);
    expect(screen.queryByText('Empty')).not.toBeInTheDocument();
  });
});
