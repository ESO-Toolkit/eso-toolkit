/**
 * Tests for buildTextParser against a real published build guide
 * (hyperioxes.com solo magicka sorcerer). Skill-name resolution depends on the
 * lazily-loaded skill cache (not guaranteed in jsdom), so skill *ids* are not
 * asserted — only the structural extraction is.
 */

// Populate itemIdMap synchronously with the REAL generated data — must be
// the FIRST import (module-scope reads elsewhere depend on it).
import '@/test/initItemData';

import { readFileSync } from 'fs';
import { join } from 'path';

import {
  buildImportPayload,
  parseBuildText,
  parseSetCellCandidates,
  pickWeaponVariant,
  resolveCanonicalSetName,
  type ParsedBuildResult,
} from '../buildTextParser';

const FIXTURE = readFileSync(join(__dirname, 'fixtures', 'hyperioxes-solo-mag-sorc.txt'), 'utf8');
const SKINNY_GEAR = readFileSync(
  join(__dirname, 'fixtures', 'skinnycheeks-stamblade-gear.txt'),
  'utf8',
);

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

  it('emits clearGearSlots (and no setup.gear) when every gear row is unresolved', () => {
    const r = parseBuildText(
      [
        'GEAR SLOT\tSET\tWEIGHT/TYPE\tTRAIT\tENCHANTMENT',
        'Head\tNonexistent Fake Set\tMedium\tDivines\tMagicka',
        'Shoulders\tNonexistent Fake Set\tLight\tDivines\tMagicka',
      ].join('\n'),
    );
    expect(r.gear.every((g) => g.itemId == null)).toBe(true);
    const p = buildImportPayload(r, {
      gear: true,
      skills: false,
      champion: false,
      character: false,
      identity: false,
    });
    expect(p.setup.gear).toBeUndefined();
    expect(p.clearGearSlots).toEqual([0, 3]); // Head, Shoulders — cleared, not stale
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

describe('parseSetCellCandidates — image-guide set syntax', () => {
  it('strips a MYTHIC:/MONSTER: category prefix', () => {
    expect(parseSetCellCandidates("MYTHIC: HUNTSMAN'S WARMASK")).toEqual(["HUNTSMAN'S WARMASK"]);
    expect(parseSetCellCandidates('MONSTER: Slimecraw')).toEqual(['Slimecraw']);
  });

  it('splits "A / B / C" and "A OR B" choice lists', () => {
    expect(parseSetCellCandidates('NULL ARCA / CORAL / ANSUUL')).toEqual([
      'NULL ARCA',
      'CORAL',
      'ANSUUL',
    ]);
    expect(parseSetCellCandidates('Aegis Caller OR Soulcleaver')).toEqual([
      'Aegis Caller',
      'Soulcleaver',
    ]);
  });

  it('passes a plain set name through unchanged', () => {
    expect(parseSetCellCandidates('Slimecraw')).toEqual(['Slimecraw']);
  });
});

describe('resolveCanonicalSetName — abbreviation resolution', () => {
  it('resolves an exact name', () => {
    expect(resolveCanonicalSetName('Slimecraw')).toBe('Slimecraw');
  });

  it('resolves a unique prefix/abbreviation to the full set name', () => {
    // "Slimecra" is a unique prefix of "Slimecraw".
    expect(resolveCanonicalSetName('Slimecra')).toBe('Slimecraw');
  });

  it('returns null for an unknown / too-short token', () => {
    expect(resolveCanonicalSetName('zzzznotaset')).toBeNull();
    expect(resolveCanonicalSetName('a')).toBeNull();
  });
});

describe('parseBuildText — skinnycheeks image-guide gear panel', () => {
  let r: ParsedBuildResult;
  beforeAll(() => {
    r = parseBuildText(SKINNY_GEAR);
  });

  it('detects the swapped column order (Slot · Weight · Set · Trait · Enchant)', () => {
    // 13 rows in ESO slot order — proves the slot column was read, not the weight column.
    expect(r.gear.map((g) => g.slot)).toEqual([0, 3, 2, 16, 6, 8, 9, 1, 11, 12, 4, 5, 20]);
  });

  it('reads trait/enchant from the correct columns despite the swap', () => {
    const head = r.gear.find((g) => g.slot === 0);
    expect(head?.trait).toBe('divines');
    expect(head?.enchant).toBe('stamina');
    const main = r.gear.find((g) => g.slot === 4);
    expect(main?.trait).toBe('charged');
    expect(main?.enchant).toBe('flame');
  });

  it('imports a single weight but leaves a "Light or Medium" choice cell unset', () => {
    // HEAD = "MEDIUM" → imported; SHOULDER = "LIGHT OR MEDIUM" is the guide
    // offering a choice, so we don't silently pick one — and we warn instead.
    expect(r.gear.find((g) => g.slot === 0)?.weight).toBe('medium');
    expect(r.gear.find((g) => g.slot === 3)?.weight).toBeUndefined();
    expect(r.warnings.some((w) => /multiple weights/i.test(w))).toBe(true);
  });

  it('resolves the mythic head set from "MYTHIC: …" and a jewelry abbreviation', () => {
    expect(r.gear.find((g) => g.slot === 0)?.itemId).toBeGreaterThan(0); // Huntsman's Warmask
    expect(r.gear.find((g) => g.slot === 1)?.itemId).toBeGreaterThan(0); // Aegis Caller (necklace)
  });
});

describe('parseBuildText — set choice cells', () => {
  it('imports the first option but flags a multi-set choice cell as partial', () => {
    // Both sets resolve for a ring slot, so the cell is the guide offering a
    // choice — import the first, but mark it partial and warn (don't pretend
    // it's a confident single match).
    const r = parseBuildText(
      [
        'GEAR SLOT\tSET\tWEIGHT/TYPE\tTRAIT\tENCHANT',
        "Ring 1\tSul-Xan's Torment / Ring of the Pale Order\t-\tInfused\tWeapon Damage",
      ].join('\n'),
    );
    const ring = r.gear.find((g) => g.slot === 11);
    expect(ring?.itemId).toBeGreaterThan(0);
    expect(ring?.status).toBe('partial');
    expect(r.warnings.some((w) => /set options/i.test(w))).toBe(true);
  });

  it('flags a choice cell even when one option fails to resolve (Qx9 / …)', () => {
    // "Qx9" can't resolve, but the cell still offered a choice — the row must be
    // marked partial, not imported as a confident single match.
    const r = parseBuildText(
      [
        'GEAR SLOT\tSET\tWEIGHT/TYPE\tTRAIT\tENCHANT',
        'Ring 1\tQx9 / Ring of the Pale Order\t-\tInfused\tWeapon Damage',
      ].join('\n'),
    );
    const ring = r.gear.find((g) => g.slot === 11);
    expect(ring?.itemId).toBeGreaterThan(0); // Ring of the Pale Order resolved
    expect(ring?.status).toBe('partial');
    expect(r.warnings.some((w) => /set options/i.test(w))).toBe(true);
  });
});

describe('parseBuildText — OCR resilience (pipe/space delimiters + fuzzy matching)', () => {
  it('parses a pipe-delimited gear table', () => {
    const text = [
      'GEAR SLOT | SET | WEIGHT/TYPE | TRAIT | ENCHANT',
      'Head | Slimecraw | Medium | Divines | Magicka',
      'Shoulders | Slimecraw | Light | Divines | Magicka',
    ].join('\n');
    const r = parseBuildText(text);
    expect(r.gear.map((g) => g.slot)).toEqual([0, 3]);
    expect(r.gear[0].trait).toBe('divines');
    expect(r.gear[0].enchant).toBe('magicka');
  });

  it('fuzzy-recovers a slightly OCR-garbled trait and slot label', () => {
    const text = [
      'GEAR SLOT | SET | WEIGHT/TYPE | TRAIT | ENCHANT',
      'Shoulder | Slimecraw | Medium | Dvines | Magicka', // "Shoulder"+"Divines" misreads
    ].join('\n');
    const r = parseBuildText(text);
    expect(r.gear[0]?.slot).toBe(3); // shoulders
    expect(r.gear[0]?.trait).toBe('divines'); // fuzzy-recovered from "Dvines"
  });

  it('does not fuzzy-match an unrelated word to a trait', () => {
    // "Banana" is far from every trait — must stay unresolved, not snap to one.
    const text = [
      'GEAR SLOT | SET | WEIGHT/TYPE | TRAIT | ENCHANT',
      'Head | Slimecraw | Medium | Banana | Magicka',
    ].join('\n');
    const r = parseBuildText(text);
    expect(r.gear[0]?.trait).toBeUndefined();
  });
});

describe('parseBuildText — race detection', () => {
  it('does NOT fabricate Orc from the word "Sorcerer"', () => {
    const r = parseBuildText('Magicka Sorcerer build. Storm Calling. No race mentioned here.');
    expect(r.raceId).toBeUndefined();
  });

  it('still detects an explicit "I use Nord" pick', () => {
    const r = parseBuildText('I use Nord because the armor racial is worth it.');
    expect(r.raceId).toBe('nord');
  });

  it('detects a race named on a word boundary', () => {
    expect(parseBuildText('Orc is the best race for this build.').raceId).toBe('orc');
    expect(parseBuildText('Run High Elf for the magicka.').raceId).toBe('highelf');
  });
});

describe('parseBuildText — matcher word boundaries (no substring false positives)', () => {
  it('mundus "The Mage" is not matched inside "Mages Guild"', () => {
    const r = parseBuildText('MUNDUS\nUse the Mages Guild ultimate. No mundus stone named here.');
    expect(r.mundusId).toBeUndefined();
  });

  it('mundus still resolves a genuinely named stone', () => {
    expect(parseBuildText('MUNDUS\nDEFAULT\nThe Thief').mundusId).toBe('thief');
  });

  it('class lines resolve on word boundaries (Sorcerer guide → sorcerer)', () => {
    const r = parseBuildText('Dark Magic, Daedric Summoning, and Storm Calling are the lines.');
    expect(r.esoClass).toBe('sorcerer');
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
    // "Ring 2" first, then a bare "Ring" → 12, then first-free 11 (no collision).
    expect(parseBuildText(mk('Ring 2', 'Ring')).gear.map((g) => g.slot)).toEqual([12, 11]);
  });
});

describe('pickWeaponVariant — weapon type matching', () => {
  // Inject a label map so the logic is tested without item/icon data.
  const label =
    (m: Record<number, string | null>) =>
    (id: number): string | null =>
      m[id] ?? null;

  it('picks the exact staff element and confirms it', () => {
    // 1 = Inferno Staff, 2 = Lightning Staff (both resolvable).
    const r = pickWeaponVariant(
      [1, 2],
      'Lightning Staff',
      label({ 1: 'Inferno Staff', 2: 'Lightning Staff' }),
    );
    expect(r).toEqual({ itemId: 2, confirmed: true });
  });

  it('does NOT confirm a specific staff element when only a generic Staff is available', () => {
    // Both candidates only resolve to generic "Staff" (element unknown).
    const r = pickWeaponVariant([1, 2], 'Lightning Staff', label({ 1: 'Staff', 2: 'Staff' }));
    expect(r.itemId).toBe(1); // best-effort first candidate
    expect(r.confirmed).toBe(false); // → caller warns
  });

  it('confirms a generic "Staff" request against any staff candidate', () => {
    const r = pickWeaponVariant([1, 2], 'Staff', label({ 1: 'Staff', 2: 'Staff' }));
    expect(r).toEqual({ itemId: 1, confirmed: true });
  });

  it('matches a non-staff weapon type exactly (Dagger over Sword)', () => {
    const r = pickWeaponVariant([1, 2], 'Dagger', label({ 1: 'Sword', 2: 'Dagger' }));
    expect(r).toEqual({ itemId: 2, confirmed: true });
  });

  it('a single candidate is confirmed regardless of type cell', () => {
    expect(pickWeaponVariant([7], 'Greatsword', () => null)).toEqual({
      itemId: 7,
      confirmed: true,
    });
  });

  it('falls back unconfirmed when no candidate matches the requested type', () => {
    const r = pickWeaponVariant([1, 2], 'Bow', label({ 1: 'Sword', 2: 'Dagger' }));
    expect(r).toEqual({ itemId: 1, confirmed: false });
  });
});

describe('parseBuildText — food id resolution', () => {
  it('resolves a known food name to its consumable id', () => {
    const r = parseBuildText(['FOOD', 'DEFAULT', 'Artaeum Pickled Fish Bowl'].join('\n'));
    expect(r.foodName).toBe('Artaeum Pickled Fish Bowl');
    expect(r.foodId).toBeGreaterThan(0);
  });

  it('warns and leaves foodId undefined for an unknown food', () => {
    const r = parseBuildText(['FOOD', 'DEFAULT', 'Totally Not A Real Dish'].join('\n'));
    expect(r.foodName).toBe('Totally Not A Real Dish');
    expect(r.foodId).toBeUndefined();
    expect(r.warnings.some((w) => /Couldn't match food/i.test(w))).toBe(true);
  });

  it('buildImportPayload only imports food when an id resolved (visible in the UI)', () => {
    const resolved = parseBuildText(['FOOD', 'DEFAULT', 'Artaeum Pickled Fish Bowl'].join('\n'));
    const p1 = buildImportPayload(resolved, {
      gear: false,
      skills: false,
      champion: false,
      character: true,
      identity: false,
    });
    expect(p1.setup.consumables?.food.id).toBeGreaterThan(0);

    const unresolved = parseBuildText(['FOOD', 'DEFAULT', 'Totally Not A Real Dish'].join('\n'));
    const p2 = buildImportPayload(unresolved, {
      gear: false,
      skills: false,
      champion: false,
      character: true,
      identity: false,
    });
    expect(p2.setup.consumables).toBeUndefined();
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
