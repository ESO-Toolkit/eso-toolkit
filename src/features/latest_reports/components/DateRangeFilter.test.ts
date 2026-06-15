import { isInvalidDateRange, type DateRangeValue } from './DateRangeFilter';

const make = (over: Partial<DateRangeValue>): DateRangeValue => ({
  range: 'custom',
  customFrom: null,
  customTo: null,
  ...over,
});

describe('isInvalidDateRange', () => {
  it('is false for non-custom ranges regardless of bounds', () => {
    expect(isInvalidDateRange(make({ range: 'all' }))).toBe(false);
    expect(
      isInvalidDateRange(make({ range: '7d', customFrom: '2026-06-10', customTo: '2026-06-01' })),
    ).toBe(false);
  });

  it('is false when either custom bound is missing', () => {
    expect(isInvalidDateRange(make({ customFrom: '2026-06-10', customTo: null }))).toBe(false);
    expect(isInvalidDateRange(make({ customFrom: null, customTo: '2026-06-10' }))).toBe(false);
  });

  it('is false when from is on or before to', () => {
    expect(isInvalidDateRange(make({ customFrom: '2026-06-01', customTo: '2026-06-10' }))).toBe(
      false,
    );
    expect(isInvalidDateRange(make({ customFrom: '2026-06-10', customTo: '2026-06-10' }))).toBe(
      false,
    );
  });

  it('is true only when from is strictly after to', () => {
    expect(isInvalidDateRange(make({ customFrom: '2026-06-11', customTo: '2026-06-10' }))).toBe(
      true,
    );
    expect(isInvalidDateRange(make({ customFrom: '2027-01-01', customTo: '2026-12-31' }))).toBe(
      true,
    );
  });
});
