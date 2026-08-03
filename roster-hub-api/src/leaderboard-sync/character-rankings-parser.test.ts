import fixture from './__fixtures__/character-rankings-page.json';
import {
  hasRealCombatantInfo,
  isDpsSpec,
  parseCharacterRankingsPage,
} from './character-rankings-parser';

/**
 * The fixture is a redacted real response captured by
 * scripts/probe-character-rankings.ts: 8 entries with full combat info and 2
 * stubbed ones, so both ingest paths stay covered.
 */
describe('parseCharacterRankingsPage', () => {
  it('parses the real captured response', () => {
    const page = parseCharacterRankingsPage(fixture);

    // 10 entries in, 2 stubbed dropped.
    expect(page.rankings).toHaveLength(8);
    expect(page.dropped.stubbed).toBe(2);
    expect(page.dropped.malformed).toBe(0);
    expect(page.page).toBe(1);
    expect(typeof page.hasMorePages).toBe('boolean');
  });

  it('extracts the fields the ingest depends on', () => {
    const [first] = parseCharacterRankingsPage(fixture).rankings;

    expect(first.amount).toBeGreaterThan(0);
    expect(first.reportCode).toBeTruthy();
    expect(typeof first.fightId).toBe('number');
    expect(first.esoClass).toBeTruthy();
    expect(first.spec).toBeTruthy();
    expect(first.rank).toBe(1);
  });

  it('coerces the string-typed numeric gear fields', () => {
    const [first] = parseCharacterRankingsPage(fixture).rankings;

    // setID/trait/cp arrive as strings from the API; nothing downstream should
    // ever have to know that.
    first.gear.forEach((piece) => {
      expect(typeof piece.setId).toBe('number');
      expect(typeof piece.itemId).toBe('number');
      if (piece.trait !== undefined) expect(typeof piece.trait).toBe('number');
      if (piece.cp !== undefined) expect(typeof piece.cp).toBe('number');
    });
  });

  it('drops the id:0 padding that pads every gear array to 16', () => {
    parseCharacterRankingsPage(fixture).rankings.forEach((entry) => {
      expect(entry.gear.length).toBeGreaterThan(0);
      expect(entry.gear.length).toBeLessThan(16);
      entry.gear.forEach((piece) => expect(piece.itemId).toBeGreaterThan(0));
    });
  });

  it('preserves array position as the slot', () => {
    const [first] = parseCharacterRankingsPage(fixture).rankings;
    const slots = first.gear.map((piece) => piece.slot);

    expect(slots).toEqual([...slots].sort((a, b) => a - b));
    expect(slots[0]).toBe(0);
  });

  it('returns exactly 12 talents per populated entry', () => {
    parseCharacterRankingsPage(fixture).rankings.forEach((entry) => {
      expect(entry.talents).toHaveLength(12);
      entry.talents.forEach((talent, index) => {
        expect(talent.slot).toBe(index);
        expect(talent.abilityId).toBeGreaterThan(0);
      });
    });
  });

  it('drops the "Unknown Set" placeholder name so our own table can win', () => {
    const withPlaceholder = {
      rankings: [
        {
          amount: 1,
          report: { code: 'abc', fightID: 1 },
          gear: [{ id: 5, setID: '848' }],
          talents: [{ id: 7 }],
          sets: [
            { id: 848, name: 'Unknown Set' },
            { id: 777, name: 'Corpseburster' },
          ],
        },
      ],
    };

    const [entry] = parseCharacterRankingsPage(withPlaceholder).rankings;
    expect(entry.sets).toEqual([
      { setId: 848, name: undefined },
      { setId: 777, name: 'Corpseburster' },
    ]);
  });

  it('accepts a JSON string and an object identically', () => {
    const fromObject = parseCharacterRankingsPage(fixture);
    const fromString = parseCharacterRankingsPage(JSON.stringify(fixture));

    expect(fromString).toEqual(fromObject);
  });

  it('unwraps a { data: ... } envelope', () => {
    const enveloped = { data: fixture };
    expect(parseCharacterRankingsPage(enveloped).rankings).toHaveLength(8);
  });

  it('reads combat info nested under combatantInfo', () => {
    const nested = {
      rankings: [
        {
          amount: 100,
          report: { code: 'xyz', fightID: 2 },
          combatantInfo: { gear: [{ id: 9, setID: '1' }], talents: [{ id: 3 }] },
        },
      ],
    };

    const [entry] = parseCharacterRankingsPage(nested).rankings;
    expect(entry.gear).toHaveLength(1);
    expect(entry.talents).toHaveLength(1);
  });

  it('tolerates has_more_pages as well as hasMorePages', () => {
    expect(parseCharacterRankingsPage({ rankings: [], has_more_pages: true }).hasMorePages).toBe(true);
    expect(parseCharacterRankingsPage({ rankings: [], hasMorePages: true }).hasMorePages).toBe(true);
  });

  it('drops entries with no amount or no report code', () => {
    const bad = {
      rankings: [
        { report: { code: 'a' }, gear: [{ id: 1 }], talents: [{ id: 1 }] }, // no amount
        { amount: 5, gear: [{ id: 1 }], talents: [{ id: 1 }] }, // no report
      ],
    };

    const page = parseCharacterRankingsPage(bad);
    expect(page.rankings).toHaveLength(0);
    expect(page.dropped.malformed).toBe(2);
  });

  // A malformed response from one encounter must never abort a whole cron run.
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty string', ''],
    ['non-JSON string', 'not json'],
    ['number', 42],
    ['empty object', {}],
    ['non-array rankings', { rankings: 'nope' }],
    ['array of junk', { rankings: [null, 3, {}, 'x'] }],
    ['array at top level', [1, 2, 3]],
  ])('never throws for %s', (_label, input) => {
    expect(() => parseCharacterRankingsPage(input)).not.toThrow();
    expect(parseCharacterRankingsPage(input).rankings).toEqual([]);
  });
});

describe('hasRealCombatantInfo', () => {
  it('rejects entries with combat info hidden', () => {
    const stubbed = { gear: [], talents: [], sets: [] } as never;
    expect(hasRealCombatantInfo(stubbed)).toBe(false);
  });

  it('accepts entries carrying both gear and talents', () => {
    const [first] = parseCharacterRankingsPage(fixture).rankings;
    expect(hasRealCombatantInfo(first)).toBe(true);
  });
});

describe('isDpsSpec', () => {
  it.each(['MagickaDPS', 'StaminaDPS', 'WerewolfDPS'])('keeps %s', (spec) => {
    expect(isDpsSpec(spec)).toBe(true);
  });

  it.each(['Tank', 'Healer', undefined, ''])('rejects %s', (spec) => {
    expect(isDpsSpec(spec)).toBe(false);
  });
});
