import { isReportEmpty, partitionReportsByData } from './reportFormatting';

const baseReport = {
  startTime: 1_700_000_000_000,
  endTime: 1_700_000_360_000,
  segments: 3,
};

describe('isReportEmpty', () => {
  it('returns false for a report with segments and a real duration', () => {
    expect(isReportEmpty(baseReport)).toBe(false);
  });

  it('returns true when the report has zero segments', () => {
    expect(isReportEmpty({ ...baseReport, segments: 0 })).toBe(true);
  });

  it('returns true when start and end time are identical (zero duration)', () => {
    expect(isReportEmpty({ ...baseReport, endTime: baseReport.startTime })).toBe(true);
  });

  it('falls back to the duration check when segments is not selected by the query', () => {
    expect(isReportEmpty({ startTime: 1, endTime: 2 })).toBe(false);
    expect(isReportEmpty({ startTime: 1, endTime: 1 })).toBe(true);
  });
});

describe('partitionReportsByData', () => {
  it('separates reports with data from empty ones and counts the empties', () => {
    const healthy = { ...baseReport, code: 'A' };
    const noSegments = { ...baseReport, code: 'B', segments: 0 };
    const zeroDuration = { ...baseReport, code: 'C', endTime: baseReport.startTime };

    const { reportsWithData, emptyCount } = partitionReportsByData([
      healthy,
      noSegments,
      zeroDuration,
    ]);

    expect(reportsWithData).toEqual([healthy]);
    expect(emptyCount).toBe(2);
  });

  it('returns everything with a zero count when no reports are empty', () => {
    const reports = [
      { ...baseReport, code: 'A' },
      { ...baseReport, code: 'B' },
    ];
    expect(partitionReportsByData(reports)).toEqual({
      reportsWithData: reports,
      emptyCount: 0,
    });
  });

  it('handles an empty list', () => {
    expect(partitionReportsByData([])).toEqual({ reportsWithData: [], emptyCount: 0 });
  });
});
