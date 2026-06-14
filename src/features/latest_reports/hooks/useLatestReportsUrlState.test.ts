import {
  applyFilterPatch,
  hasActiveServerFilter,
  parseLatestReportsFilters,
  type LatestReportsFilters,
} from './useLatestReportsUrlState';

const parse = (qs: string) => parseLatestReportsFilters(new URLSearchParams(qs));
const apply = (qs: string, patch: Parameters<typeof applyFilterPatch>[1]) =>
  applyFilterPatch(new URLSearchParams(qs), patch).toString();

describe('parseLatestReportsFilters', () => {
  it('defaults everything when the URL is empty', () => {
    expect(parse('')).toEqual<LatestReportsFilters>({
      page: 1,
      zoneId: null,
      range: 'all',
      customFrom: null,
      customTo: null,
      q: '',
    });
  });

  it('parses page/zone/range/q', () => {
    const f = parse('page=3&zone=15&range=7d&q=rockgrove');
    expect(f.page).toBe(3);
    expect(f.zoneId).toBe(15);
    expect(f.range).toBe('7d');
    expect(f.q).toBe('rockgrove');
  });

  it('rejects invalid page and zone values', () => {
    expect(parse('page=0').page).toBe(1);
    expect(parse('page=-2').page).toBe(1);
    expect(parse('page=abc').page).toBe(1);
    expect(parse('zone=abc').zoneId).toBeNull();
    expect(parse('zone=0').zoneId).toBeNull();
  });

  it('falls back to "all" for an unknown range token', () => {
    expect(parse('range=banana').range).toBe('all');
  });

  it('only honors from/to when range=custom and they are valid yyyy-MM-dd', () => {
    expect(parse('range=custom&from=2026-06-01&to=2026-06-10')).toMatchObject({
      range: 'custom',
      customFrom: '2026-06-01',
      customTo: '2026-06-10',
    });
    // from/to with a non-custom range are ignored.
    expect(parse('range=7d&from=2026-06-01')).toMatchObject({ range: '7d', customFrom: null });
    // malformed custom dates are dropped.
    expect(parse('range=custom&from=06-01-2026')).toMatchObject({ customFrom: null });
  });
});

describe('applyFilterPatch', () => {
  it('omits page when 1 (clean URLs)', () => {
    expect(apply('page=5', { page: 1 })).toBe('');
    expect(apply('', { page: 4 })).toBe('page=4');
  });

  it('deletes zone when set to null', () => {
    expect(apply('zone=15', { zoneId: null })).toBe('');
    expect(apply('', { zoneId: 22 })).toBe('zone=22');
  });

  it('omits range=all and drops from/to when leaving custom', () => {
    expect(apply('range=custom&from=2026-06-01&to=2026-06-10', { range: 'all' })).toBe('');
    expect(apply('range=custom&from=2026-06-01', { range: '30d' })).toBe('range=30d');
  });

  it('keeps from/to only with range=custom', () => {
    const out = apply('', { range: 'custom', customFrom: '2026-06-01', customTo: '2026-06-10' });
    const sp = new URLSearchParams(out);
    expect(sp.get('range')).toBe('custom');
    expect(sp.get('from')).toBe('2026-06-01');
    expect(sp.get('to')).toBe('2026-06-10');
  });

  it('deletes q when empty', () => {
    expect(apply('q=foo', { q: '' })).toBe('');
    expect(apply('', { q: 'bar' })).toBe('q=bar');
  });

  it('does not mutate the input params', () => {
    const input = new URLSearchParams('page=2');
    applyFilterPatch(input, { page: 5 });
    expect(input.toString()).toBe('page=2');
  });
});

describe('hasActiveServerFilter', () => {
  const base: LatestReportsFilters = {
    page: 1,
    zoneId: null,
    range: 'all',
    customFrom: null,
    customTo: null,
    q: '',
  };

  it('is false with no server filters (text search alone does not count)', () => {
    expect(hasActiveServerFilter({ ...base, q: 'anything' })).toBe(false);
  });

  it('is true with a zone or date filter', () => {
    expect(hasActiveServerFilter({ ...base, zoneId: 10 })).toBe(true);
    expect(hasActiveServerFilter({ ...base, range: '7d' })).toBe(true);
  });
});
