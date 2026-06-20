import { act, fireEvent, render, screen } from '@testing-library/react';

import type { UserReportSummaryFragment } from '../../../graphql/gql/graphql';
import { ReportCard } from './ReportCard';

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
  segments: 0,
};

describe('ReportCard', () => {
  it('is a keyboard-operable link with an accessible name', () => {
    const onSelect = jest.fn();
    render(<ReportCard report={report} onSelect={onSelect} />);
    const link = screen.getByRole('link', { name: /Rockgrove HM, Rockgrove\. View report\./i });
    expect(link).toHaveAttribute('tabindex', '0');
  });

  it('activates on Enter and Space', () => {
    const onSelect = jest.fn();
    render(<ReportCard report={report} onSelect={onSelect} />);
    const link = screen.getByRole('link');
    fireEvent.keyDown(link, { key: 'Enter' });
    fireEvent.keyDown(link, { key: ' ' });
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledWith('XYZ123', expect.anything());
  });

  it('activates on click and middle-click', () => {
    const onSelect = jest.fn();
    render(<ReportCard report={report} onSelect={onSelect} />);
    const link = screen.getByRole('link');
    fireEvent.click(link);
    fireEvent.mouseDown(link, { button: 1 });
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('shows the empty-log badge when the report has no combat data', () => {
    const onSelect = jest.fn();
    render(<ReportCard report={emptyReport} onSelect={onSelect} />);
    expect(screen.getByText('Empty')).toBeInTheDocument();
  });

  it('does not show the empty badge for a normal report', () => {
    const onSelect = jest.fn();
    render(<ReportCard report={report} onSelect={onSelect} />);
    expect(screen.queryByText('Empty')).not.toBeInTheDocument();
  });

  it('renders the zone name in the identity pill', () => {
    const onSelect = jest.fn();
    render(<ReportCard report={report} onSelect={onSelect} />);
    expect(screen.getByText('Rockgrove')).toBeInTheDocument();
  });

  it('copies the share code without triggering navigation', async () => {
    const onSelect = jest.fn();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<ReportCard report={report} onSelect={onSelect} />);
    const copyButton = screen.getByRole('button', { name: /copy share code/i });
    // Wrap in act so the resolved-clipboard "copied" state update flushes.
    await act(async () => {
      fireEvent.click(copyButton);
    });

    expect(writeText).toHaveBeenCalledWith('XYZ123');
    // The copy button must not bubble up to the card link.
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('does not navigate when Enter/Space is pressed on a nested control', () => {
    const onSelect = jest.fn();
    render(<ReportCard report={report} onSelect={onSelect} />);
    const copyButton = screen.getByRole('button', { name: /copy share code/i });
    // Keys on the copy button bubble to the card handler; the target guard
    // keeps them from activating the card link.
    fireEvent.keyDown(copyButton, { key: 'Enter' });
    fireEvent.keyDown(copyButton, { key: ' ' });
    expect(onSelect).not.toHaveBeenCalled();
  });
});
