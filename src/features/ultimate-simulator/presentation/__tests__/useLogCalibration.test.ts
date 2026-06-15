import { isCursorAdvancing, parseReportCode } from '../useLogCalibration';

describe('isCursorAdvancing', () => {
  it('advances only for a finite cursor strictly greater than the page start', () => {
    expect(isCursorAdvancing(100, 200)).toBe(true);
  });

  it('stops on a repeated or backwards cursor (malformed paginator → no infinite loop)', () => {
    expect(isCursorAdvancing(100, 100)).toBe(false); // repeated
    expect(isCursorAdvancing(100, 50)).toBe(false); // backwards
  });

  it('stops on a null/undefined/non-finite cursor', () => {
    expect(isCursorAdvancing(100, null)).toBe(false);
    expect(isCursorAdvancing(100, undefined)).toBe(false);
    expect(isCursorAdvancing(100, Infinity)).toBe(false);
    expect(isCursorAdvancing(100, NaN)).toBe(false);
  });
});

describe('parseReportCode', () => {
  it('returns a bare 16-char code unchanged', () => {
    expect(parseReportCode('kZAvqFwYcRTLB97W')).toBe('kZAvqFwYcRTLB97W');
  });

  it('extracts the code from a full esologs report URL', () => {
    expect(parseReportCode('https://www.esologs.com/reports/kZAvqFwYcRTLB97W')).toBe(
      'kZAvqFwYcRTLB97W',
    );
    expect(parseReportCode('https://www.esologs.com/reports/kZAvqFwYcRTLB97W#fight=2')).toBe(
      'kZAvqFwYcRTLB97W',
    );
  });

  it('trims whitespace', () => {
    expect(parseReportCode('  kZAvqFwYcRTLB97W  ')).toBe('kZAvqFwYcRTLB97W');
  });

  it('extracts a code embedded in arbitrary text', () => {
    expect(parseReportCode('check kZAvqFwYcRTLB97W please')).toBe('kZAvqFwYcRTLB97W');
  });

  it('returns the input as-is when no 16-char code is present (validated by caller)', () => {
    expect(parseReportCode('short')).toBe('short');
  });
});
