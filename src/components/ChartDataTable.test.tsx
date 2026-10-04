import { fireEvent, render, screen, within } from '@testing-library/react';

import { ChartDataTable } from './ChartDataTable';

describe('ChartDataTable', () => {
  it('keeps long timelines bounded while making every sample reachable', () => {
    const rows = Array.from({ length: 26 }, (_, index) => [index, index * 10]);
    const { rerender } = render(
      <ChartDataTable caption="Player timeline" columns={['Seconds', 'Points']} rows={rows} />,
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View data table: Player timeline' }));
    expect(
      screen.getByRole('button', { name: 'View data table: Player timeline' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(26);
    fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }));
    expect(
      within(screen.getByRole('table')).getByRole('row', { name: '25 250' }),
    ).toBeInTheDocument();
    rerender(
      <ChartDataTable caption="Player timeline" columns={['Seconds', 'Points']} rows={[[0, 5]]} />,
    );
    expect(within(screen.getByRole('table')).getByRole('row', { name: '0 5' })).toBeInTheDocument();
  });

  it('describes missing samples and invalid values instead of treating them as zero', () => {
    const { rerender } = render(
      <ChartDataTable caption="Player timeline" columns={['Seconds', 'Points']} rows={[]} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'View data table: Player timeline' }));
    expect(screen.getByRole('cell', { name: 'No samples available.' })).toBeInTheDocument();
    rerender(
      <ChartDataTable
        caption="Player timeline"
        columns={['Seconds', 'Points']}
        rows={[[0, NaN]]}
      />,
    );
    expect(screen.getByRole('cell', { name: 'Unavailable' })).toBeInTheDocument();
  });
});
