import { parseReportCode } from '../useLogCalibration';

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
