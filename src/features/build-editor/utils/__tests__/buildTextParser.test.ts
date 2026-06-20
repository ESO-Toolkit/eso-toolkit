/**
 * Tests for buildTextParser against a real published build guide
 * (hyperioxes.com solo magicka sorcerer). Skill-name resolution depends on the
 * lazily-loaded skill cache (not guaranteed in jsdom), so skill *ids* are not
 * asserted — only the structural extraction is.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import { buildImportPayload, parseBuildText, type ParsedBuildResult } from '../buildTextParser';

const FIXTURE = readFileSync(join(__dirname, 'fixtures', 'hyperioxes-solo-mag-sorc.txt'), 'utf8');

let result: ParsedBuildResult;
beforeAll(() => {
  result = parseBuildText(FIXTURE);
});

describe('parseBuildText — gear table', () => {
  it('extracts all 13 listed gear rows in slot order', () => {
    expect(result.gear).toHaveLength(13);
    expect(result.gear.map((r) => r.slot)).toEqual([0, 3, 2, 16, 6, 8, 9, 1, 11, 12, 4, 5, 20]);
  });

  it('reads set names per slot', () => {
    const bySlot = Object.fromEntries(result.gear.map((r) => [r.slot, r.setName]));
    expect(bySlot[0]).toBe('Slimecraw');
    expect(bySlot[2]).toBe("Sul-Xan's Torment");
    expect(bySlot[11]).toBe("Sul-Xan's Torment");
    expect(bySlot[12]).toBe('Ring of the Pale Order');
    expect(bySlot[20]).toBe('Crushing Wall');
  });

  it('resolves armor weight only for apparel slots', () => {
    const head = result.gear.find((r) => r.slot === 0);
    expect(head?.weight).toBe('medium');
    const shoulders = result.gear.find((r) => r.slot === 3);
    expect(shoulders?.weight).toBe('light');
    // Jewelry / weapons carry no weight.
    expect(result.gear.find((r) => r.slot === 11)?.weight).toBeUndefined();
    expect(result.gear.find((r) => r.slot === 4)?.weight).toBeUndefined();
  });

  it('resolves traits and enchants to editor ids', () => {
    const head = result.gear.find((r) => r.slot === 0);
    expect(head?.trait).toBe('divines');
    expect(head?.enchant).toBe('magicka');

    const neck = result.gear.find((r) => r.slot === 1);
    expect(neck?.trait).toBe('bloodthirsty');
    expect(neck?.enchant).toBe('increase-spell-damage'); // "Increase Magical Harm"

    const frontMain = result.gear.find((r) => r.slot === 4);
    expect(frontMain?.trait).toBe('charged');
    expect(frontMain?.enchant).toBe('poison');

    const backMain = result.gear.find((r) => r.slot === 20);
    expect(backMain?.trait).toBe('infused');
    expect(backMain?.enchant).toBe('weapon-damage');
  });
});

describe('parseBuildText — character & identity', () => {
  it('detects the Sorcerer class from its three skill lines', () => {
    expect(result.esoClass).toBe('sorcerer');
    expect(result.classSkillLines).toEqual([
      'class.dark-magic',
      'class.daedric-summoning',
      'class.storm-calling',
    ]);
  });

  it('detects the author-preferred race (Nord)', () => {
    expect(result.raceId).toBe('nord');
  });

  it('detects the default mundus (The Thief)', () => {
    expect(result.mundusId).toBe('thief');
  });

  it('detects attributes (64 Magicka)', () => {
    expect(result.attributes).toEqual({ health: 0, magicka: 64, stamina: 0 });
  });

  it('detects the default food', () => {
    expect(result.foodName).toMatch(/Artaeum Pickled Fish Bowl/i);
  });
});

describe('parseBuildText — champion points', () => {
  it('matches slottable warfare perks', () => {
    const warfare = result.cp.filter((c) => c.tree === 'warfare').map((c) => c.name);
    expect(warfare).toEqual(
      expect.arrayContaining([
        'Master-at-Arms',
        'Deadly Aim',
        'Fighting Finesse',
        'Wrathful Strikes',
      ]),
    );
  });

  it('matches fitness + craft perks and caps at four per tree', () => {
    const fitness = result.cp.filter((c) => c.tree === 'fitness');
    const craft = result.cp.filter((c) => c.tree === 'craft');
    expect(fitness.length).toBeLessThanOrEqual(4);
    expect(fitness.map((c) => c.name)).toEqual(
      expect.arrayContaining([
        'Boundless Vitality',
        'Siphoning Spells',
        'Rejuvenation',
        'Fortified',
      ]),
    );
    expect(craft.map((c) => c.name)).toContain("Steed's Blessing");
  });
});

describe('parseBuildText — skills (structure)', () => {
  it('extracts front + back bar entries with slot indices', () => {
    expect(result.skills.length).toBeGreaterThanOrEqual(10);
    const front = result.skills.filter((s) => s.bar === 0);
    const back = result.skills.filter((s) => s.bar === 1);
    expect(front.length).toBeGreaterThanOrEqual(5);
    expect(back.length).toBeGreaterThanOrEqual(5);
    // First front entry is the Slot-1 spammable.
    const front1 = front.find((s) => s.slotIndex === 3);
    expect(front1?.name).toMatch(/Traveling Knife/i);
  });
});

describe('buildImportPayload', () => {
  it('includes only the toggled sections', () => {
    const payload = buildImportPayload(result, {
      gear: true,
      skills: false,
      champion: true,
      character: true,
      identity: true,
    });
    expect(payload.setup.skills).toBeUndefined();
    expect(payload.setup.attributes).toEqual({ health: 0, magicka: 64, stamina: 0 });
    expect(payload.setup.mundusStone).toBe('thief');
    expect(payload.buildFields?.esoClass).toBe('sorcerer');
    expect(payload.buildFields?.races).toEqual(['nord']);
    // CP cp object shape
    expect(payload.setup.cp?.warfare.slots.filter(Boolean).length).toBeGreaterThan(0);
  });

  it('builds a gear config keyed by slot for resolved items', () => {
    const payload = buildImportPayload(result, {
      gear: true,
      skills: false,
      champion: false,
      character: false,
      identity: false,
    });
    // Only slots whose set resolved to a real item id are included.
    for (const [, piece] of Object.entries(payload.setup.gear ?? {})) {
      expect(piece.id).toBeGreaterThan(0);
    }
  });
});

describe('parseBuildText — numbered ring labels', () => {
  it('parses "Ring 1"/"Ring 2" and keeps the weapon rows that follow them', () => {
    const text = [
      'GEAR SLOT\tSET\tWEIGHT/TYPE\tTRAIT\tENCHANTMENT',
      'Necklace\tSlimecraw\tJewelry\tBloodthirsty\tIncrease Magical Harm',
      'Ring 1\tSlimecraw\tJewelry\tBloodthirsty\tIncrease Magical Harm',
      'Ring 2\tSlimecraw\tJewelry\tBloodthirsty\tIncrease Magical Harm',
      'Frontbar Main Hand\tCrushing Wall\tLightning Staff\tInfused\tWeapon Damage',
    ].join('\n');
    const r = parseBuildText(text);
    const slots = r.gear.map((g) => g.slot);
    // Neck=1, Ring 1=11, Ring 2=12, Front Main=4 — none dropped.
    expect(slots).toEqual([1, 11, 12, 4]);
  });

  it('handles mixed numbered/bare ring labels without duplicating a slot', () => {
    const mk = (a: string, b: string): string =>
      [
        'GEAR SLOT\tSET\tWEIGHT/TYPE\tTRAIT\tENCHANTMENT',
        `${a}\tSlimecraw\tJewelry\tBloodthirsty\tIncrease Magical Harm`,
        `${b}\tSlimecraw\tJewelry\tBloodthirsty\tIncrease Magical Harm`,
      ].join('\n');
    // "Ring 1" then bare "Ring" → 11, 12 (not 11, 11).
    expect(parseBuildText(mk('Ring 1', 'Ring')).gear.map((g) => g.slot)).toEqual([11, 12]);
    // Bare "Ring" then "Ring 2" → 11, 12.
    expect(parseBuildText(mk('Ring', 'Ring 2')).gear.map((g) => g.slot)).toEqual([11, 12]);
  });
});

describe('parseBuildText — punctuation robustness', () => {
  it('resolves a set name written with a curly apostrophe', () => {
    const straight = parseBuildText(
      [
        'GEAR SLOT\tSET\tWEIGHT/TYPE\tTRAIT\tENCHANTMENT',
        "Chest\tSul-Xan's Torment\tMedium\tDivines\tMagicka",
      ].join('\n'),
    );
    const curly = parseBuildText(
      [
        'GEAR SLOT\tSET\tWEIGHT/TYPE\tTRAIT\tENCHANTMENT',
        'Chest\tSul-Xan’s Torment\tMedium\tDivines\tMagicka',
      ].join('\n'),
    );
    const straightId = straight.gear[0]?.itemId;
    const curlyId = curly.gear[0]?.itemId;
    // Both must resolve, and to the same item.
    expect(straightId).toBeGreaterThan(0);
    expect(curlyId).toBe(straightId);
  });
});
