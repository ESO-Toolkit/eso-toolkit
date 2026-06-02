import { fireEvent, render, screen } from '@testing-library/react';

import { MetricsScrollRow } from './MetricsScrollRow';

/** Override the layout metrics jsdom does not compute, then fire a scroll. */
const setScrollMetrics = (
  el: HTMLElement,
  {
    scrollLeft,
    scrollWidth,
    clientWidth,
  }: { scrollLeft: number; scrollWidth: number; clientWidth: number },
): void => {
  Object.defineProperty(el, 'scrollWidth', { value: scrollWidth, configurable: true });
  Object.defineProperty(el, 'clientWidth', { value: clientWidth, configurable: true });
  Object.defineProperty(el, 'scrollLeft', {
    value: scrollLeft,
    configurable: true,
    writable: true,
  });
  fireEvent.scroll(el);
};

describe('MetricsScrollRow', () => {
  it('renders its children', () => {
    render(
      <MetricsScrollRow scrollable>
        <span>metric content</span>
      </MetricsScrollRow>,
    );
    expect(screen.getByText('metric content')).toBeInTheDocument();
  });

  it('hints only at the right edge when scrolled to the start of an overflowing row', () => {
    render(
      <MetricsScrollRow scrollable>
        <span>content</span>
      </MetricsScrollRow>,
    );
    const row = screen.getByTestId('metrics-scroll-row');
    setScrollMetrics(row, { scrollLeft: 0, scrollWidth: 500, clientWidth: 100 });

    expect(row).toHaveAttribute('data-can-scroll-left', 'false');
    expect(row).toHaveAttribute('data-can-scroll-right', 'true');
  });

  it('hints at both edges when scrolled to the middle', () => {
    render(
      <MetricsScrollRow scrollable>
        <span>content</span>
      </MetricsScrollRow>,
    );
    const row = screen.getByTestId('metrics-scroll-row');
    setScrollMetrics(row, { scrollLeft: 200, scrollWidth: 500, clientWidth: 100 });

    expect(row).toHaveAttribute('data-can-scroll-left', 'true');
    expect(row).toHaveAttribute('data-can-scroll-right', 'true');
  });

  it('hints only at the left edge when scrolled to the end', () => {
    render(
      <MetricsScrollRow scrollable>
        <span>content</span>
      </MetricsScrollRow>,
    );
    const row = screen.getByTestId('metrics-scroll-row');
    setScrollMetrics(row, { scrollLeft: 400, scrollWidth: 500, clientWidth: 100 });

    expect(row).toHaveAttribute('data-can-scroll-left', 'true');
    expect(row).toHaveAttribute('data-can-scroll-right', 'false');
  });

  it('shows no hint when the content fits', () => {
    render(
      <MetricsScrollRow scrollable>
        <span>content</span>
      </MetricsScrollRow>,
    );
    const row = screen.getByTestId('metrics-scroll-row');
    setScrollMetrics(row, { scrollLeft: 0, scrollWidth: 100, clientWidth: 100 });

    expect(row).toHaveAttribute('data-can-scroll-left', 'false');
    expect(row).toHaveAttribute('data-can-scroll-right', 'false');
  });

  it('shows no hint when not scrollable even if the content overflows', () => {
    render(
      <MetricsScrollRow scrollable={false}>
        <span>content</span>
      </MetricsScrollRow>,
    );
    const row = screen.getByTestId('metrics-scroll-row');
    setScrollMetrics(row, { scrollLeft: 50, scrollWidth: 500, clientWidth: 100 });

    expect(row).toHaveAttribute('data-can-scroll-left', 'false');
    expect(row).toHaveAttribute('data-can-scroll-right', 'false');
  });
});
