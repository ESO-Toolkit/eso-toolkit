import { fireEvent, render, screen } from '@testing-library/react';

import { DATE_RANGE_PRESETS, dateRangePresetLabel } from '../hooks/rangeToEpochMs';

import { DateRangeFilter, type DateRangeValue } from './DateRangeFilter';

const allTime: DateRangeValue = { range: 'all', customFrom: null, customTo: null };

describe('DateRangeFilter (inline / mobile)', () => {
  it('renders every preset as a touch target', () => {
    render(<DateRangeFilter value={allTime} onChange={jest.fn()} inline />);
    for (const preset of DATE_RANGE_PRESETS) {
      expect(
        screen.getByRole('button', { name: dateRangePresetLabel(preset) }),
      ).toBeInTheDocument();
    }
  });

  it('marks the active preset with aria-pressed', () => {
    render(
      <DateRangeFilter
        value={{ range: '7d', customFrom: null, customTo: null }}
        onChange={jest.fn()}
        inline
      />,
    );
    expect(screen.getByRole('button', { name: 'Last 7 days' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'All time' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('emits the selected rolling preset and clears any custom bounds', () => {
    const onChange = jest.fn();
    render(
      <DateRangeFilter
        value={{ range: 'custom', customFrom: '2026-01-01', customTo: '2026-02-01' }}
        onChange={onChange}
        inline
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Last 30 days' }));
    expect(onChange).toHaveBeenCalledWith({ range: '30d', customFrom: null, customTo: null });
  });

  it('reveals the From/To fields once Custom is active', () => {
    render(
      <DateRangeFilter
        value={{ range: 'custom', customFrom: null, customTo: null }}
        onChange={jest.fn()}
        inline
      />,
    );
    expect(screen.getByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toBeInTheDocument();
  });
});
