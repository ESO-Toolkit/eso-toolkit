import type { ResourceChangeEvent } from '../../../../types/combatlogEvents';
import {
  collectCalibrationEventPages,
  isCursorAdvancing,
  parseReportCode,
} from '../useLogCalibration';

jest.mock('../../../../store/events_data/constants', () => ({
  ...jest.requireActual('../../../../store/events_data/constants'),
  EVENT_MAX_EVENTS_PER_STREAM: 5,
  EVENT_MAX_PAGES_PER_STREAM: 2,
}));

const resourceEvent = (timestamp: number, resourceChange = 10) =>
  ({
    type: 'resourcechange',
    timestamp,
    sourceID: 1,
    targetID: 1,
    abilityGameID: 2,
    resourceChange,
    resourceChangeType: 0,
    otherResourceChange: 0,
    fight: 1,
  }) as unknown as ResourceChangeEvent;

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

describe('collectCalibrationEventPages', () => {
  it('deduplicates an exact ordered page-boundary replay', async () => {
    const boundary = resourceEvent(150, 20);
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce({ data: [resourceEvent(100), boundary], nextPageTimestamp: 150 })
      .mockResolvedValueOnce({ data: [boundary, resourceEvent(200)], nextPageTimestamp: null });

    await expect(collectCalibrationEventPages(100, fetchPage)).resolves.toHaveLength(3);
  });

  it.each([100, 99, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects a non-advancing cursor %s instead of returning a partial measurement',
    async (cursor) => {
      await expect(
        collectCalibrationEventPages(100, async () => ({ data: [], nextPageTimestamp: cursor })),
      ).rejects.toThrow('pagination cursor did not advance');
    },
  );

  it('rejects page and event caps instead of returning truncated measurements', async () => {
    await expect(
      collectCalibrationEventPages(100, async (startTime) => ({
        data: [],
        nextPageTimestamp: startTime + 1,
      })),
    ).rejects.toThrow('exceeded 2 pages');

    await expect(
      collectCalibrationEventPages(100, async () => ({
        data: Array.from({ length: 6 }, () => resourceEvent(100)),
        nextPageTimestamp: null,
      })),
    ).rejects.toThrow('exceeded 5 events');
  });

  it('accepts a successful empty stream', async () => {
    await expect(
      collectCalibrationEventPages(100, async () => ({ data: [], nextPageTimestamp: null })),
    ).resolves.toEqual([]);
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
