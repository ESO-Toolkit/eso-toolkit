import {
  isRecentlyUploaded,
  isReportEmpty,
  partitionReportsByData,
  REPORT_PROCESSING_WINDOW_MS,
} from './reportFormatting';

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

  it('treats an empty fights array as empty even when segments and duration look healthy', () => {
    // The real-world slip-through: ESO Logs reports segments > 0 and a long
    // duration, but the combat data never parsed so there are no fights.
    expect(isReportEmpty({ ...baseReport, fights: [] })).toBe(true);
  });

  it('treats a non-empty fights array as having data regardless of other fields', () => {
    expect(isReportEmpty({ ...baseReport, segments: 0, fights: [{ id: 1 }] })).toBe(false);
    expect(isReportEmpty({ startTime: 5, endTime: 5, segments: 0, fights: [{ id: 1 }] })).toBe(
      false,
    );
  });

  it('falls back to the heuristic for a non-empty all-null fights array (degraded response)', () => {
    // A non-empty all-null array means a non-null subfield (id) errored and
    // null-propagated — a partial failure that hits every report's fights at
    // once. It is NOT a real empty (those return []), so it must not mass-hide
    // healthy reports: fall through to the metadata heuristic.
    expect(isReportEmpty({ ...baseReport, fights: [null] })).toBe(false);
    expect(isReportEmpty({ ...baseReport, fights: [null, null] })).toBe(false);
    // ...but the heuristic still hides one that also has zero segments.
    expect(isReportEmpty({ ...baseReport, segments: 0, fights: [null, null] })).toBe(true);
  });

  it('keeps a report with at least one non-null fight among null rows', () => {
    expect(isReportEmpty({ ...baseReport, fights: [null, { id: 7 }] })).toBe(false);
  });

  it('ignores the fights field when the query does not select it', () => {
    expect(isReportEmpty({ ...baseReport, fights: undefined })).toBe(false);
    expect(isReportEmpty({ ...baseReport, segments: 0, fights: undefined })).toBe(true);
  });

  it('fails open to the heuristic when a selected fights field came back null', () => {
    // errorPolicy:'all' can null an errored field. Deliberately fail open: a
    // null fights field falls through to segments/duration rather than hiding,
    // so a transient/partial error never blanks out healthy reports on the
    // public browse page (worst case is a rare un-filterable empty, same as the
    // pre-fix behavior — strictly better than mass-hiding real reports).
    expect(isReportEmpty({ ...baseReport, fights: null })).toBe(false);
    expect(isReportEmpty({ ...baseReport, segments: 0, fights: null })).toBe(true);
  });
});

describe('partitionReportsByData', () => {
  it('separates reports with data from empty ones and counts the empties', () => {
    const healthy = { ...baseReport, code: 'A' };
    const noSegments = { ...baseReport, code: 'B', segments: 0 };
    const zeroDuration = { ...baseReport, code: 'C', endTime: baseReport.startTime };
    // Healthy-looking metadata but zero parsed fights — must be counted empty.
    const noFights = { ...baseReport, code: 'D', fights: [] };

    const { reportsWithData, emptyCount } = partitionReportsByData([
      healthy,
      noSegments,
      zeroDuration,
      noFights,
    ]);

    expect(reportsWithData).toEqual([healthy]);
    expect(emptyCount).toBe(3);
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

  it('hides EVERY report when the whole page is empty (no fail-open)', () => {
    // Empty logs open to "No fights available", so a browse list never shows
    // them — even when that hides the entire page. The list surfaces its
    // `all-hidden` empty state (still processing + refresh) instead of a page
    // of dead links.
    const stillParsing = [
      { ...baseReport, code: 'A', segments: 0, endTime: baseReport.startTime, fights: [] },
      { ...baseReport, code: 'B', segments: 0, endTime: baseReport.startTime, fights: [] },
      { ...baseReport, code: 'C', segments: 0, endTime: baseReport.startTime, fights: [] },
    ];

    expect(partitionReportsByData(stillParsing)).toEqual({
      reportsWithData: [],
      emptyCount: 3,
    });
  });
});

describe('isRecentlyUploaded', () => {
  const NOW = 1_700_000_000_000;

  it('is true for a log whose activity ended inside the processing window', () => {
    expect(isRecentlyUploaded({ endTime: NOW - 5 * 60 * 1000 }, NOW)).toBe(true);
  });

  it('is false for a log older than the processing window', () => {
    expect(isRecentlyUploaded({ endTime: NOW - REPORT_PROCESSING_WINDOW_MS - 1 }, NOW)).toBe(false);
  });

  it('tolerates a slightly-future endTime (clock skew) as recent', () => {
    expect(isRecentlyUploaded({ endTime: NOW + 60_000 }, NOW)).toBe(true);
  });
});
