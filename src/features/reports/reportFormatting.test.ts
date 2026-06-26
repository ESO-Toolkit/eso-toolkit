import { isReportEmpty, partitionReportsByData, selectReportsForDisplay } from './reportFormatting';

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
});

describe('selectReportsForDisplay', () => {
  it('hides empty logs but keeps the reports that have data, counting the hidden ones', () => {
    const healthy = { ...baseReport, code: 'A' };
    const inProgress = { ...baseReport, code: 'B', segments: 0, endTime: baseReport.startTime };
    const brokenSlipThrough = { ...baseReport, code: 'C', fights: [] };

    const { reportsToShow, hiddenEmptyCount } = selectReportsForDisplay([
      healthy,
      inProgress,
      brokenSlipThrough,
    ]);

    expect(reportsToShow).toEqual([healthy]);
    expect(hiddenEmptyCount).toBe(2);
  });

  it('fails open and shows every report when the whole page would be hidden', () => {
    // The real-world dead-end: during a busy upload window the freshest page is
    // dominated by just-uploaded logs that have not parsed fights yet
    // (segments: 0, fights: []). Hiding all of them would strand the user on an
    // "every report on this page is empty" wall, so we show them instead.
    const stillParsing = [
      { ...baseReport, code: 'A', segments: 0, endTime: baseReport.startTime, fights: [] },
      { ...baseReport, code: 'B', segments: 0, endTime: baseReport.startTime, fights: [] },
      { ...baseReport, code: 'C', segments: 0, endTime: baseReport.startTime, fights: [] },
    ];

    const { reportsToShow, hiddenEmptyCount } = selectReportsForDisplay(stillParsing);

    expect(reportsToShow).toEqual(stillParsing);
    expect(hiddenEmptyCount).toBe(0);
  });

  it('fails open for a single empty report rather than showing nothing', () => {
    const onlyEmpty = [{ ...baseReport, code: 'A', fights: [] }];
    const { reportsToShow, hiddenEmptyCount } = selectReportsForDisplay(onlyEmpty);
    expect(reportsToShow).toEqual(onlyEmpty);
    expect(hiddenEmptyCount).toBe(0);
  });

  it('returns nothing (not a fail-open) when the server returned no reports at all', () => {
    // An empty input is a genuine "no results" — there is nothing to fail open
    // to, so we must not fabricate rows. The page shows its cold/filter empty
    // state, never the "all hidden" wall.
    expect(selectReportsForDisplay([])).toEqual({ reportsToShow: [], hiddenEmptyCount: 0 });
  });

  it('leaves a fully healthy page untouched', () => {
    const reports = [
      { ...baseReport, code: 'A' },
      { ...baseReport, code: 'B' },
    ];
    expect(selectReportsForDisplay(reports)).toEqual({
      reportsToShow: reports,
      hiddenEmptyCount: 0,
    });
  });
});
