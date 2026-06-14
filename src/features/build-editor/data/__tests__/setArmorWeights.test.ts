/**
 * Tests for the per-set armor-weight lock data + lookup.
 *
 * The locking rule (verified against authoritative ESO sources — see the
 * generator header and project memory):
 *   - Mythics + non-craftable overland/dungeon/trial drops = LOCKED to one weight.
 *   - Crafted sets + Monster sets = FREE (come in all three weights).
 */

import { getLockedArmorWeight, isArmorWeightLocked, normalizeSetName } from '../setArmorWeights';

describe('setArmorWeights', () => {
  describe('normalizeSetName', () => {
    it('lowercases, trims, and strips punctuation', () => {
      expect(normalizeSetName("Huntsman's Warmask")).toBe("huntsman's warmask");
      expect(normalizeSetName('Dov-rha Sabatons')).toBe('dovrha sabatons');
      expect(normalizeSetName('  Mother’s   Sorrow ')).toBe("mother's sorrow");
    });

    it('strips the "Perfected" prefix so both variants resolve to one key', () => {
      expect(normalizeSetName("Perfected Bahsei's Mania")).toBe("bahsei's mania");
    });
  });

  describe('getLockedArmorWeight — mythics', () => {
    // These must agree with the corrections in src/utils/armorUtils.ts.
    const mythicWeights: Array<[string, 'light' | 'medium' | 'heavy']> = [
      ["Huntsman's Warmask", 'medium'],
      ['Gaze of Sithis', 'heavy'],
      ['Snow Treaders', 'medium'],
      ["Bloodlord's Embrace", 'heavy'],
      ["Harpooner's Wading Kilt", 'medium'],
      ['Dov-rha Sabatons', 'heavy'],
      ["Lefthander's Aegis Belt", 'medium'],
      ["Faun's Lark Cladding", 'medium'],
      ["Syrabane's Ward", 'heavy'],
      ['Esoteric Environment Greaves', 'heavy'],
      ['Rourken Steamguards', 'heavy'],
      ["Rakkhat's Voidmantle", 'medium'],
    ];

    it.each(mythicWeights)('locks %s to %s', (setName, weight) => {
      expect(getLockedArmorWeight(setName)).toBe(weight);
    });
  });

  describe('getLockedArmorWeight — single-weight overland/dungeon/trial drops', () => {
    const lockedSets: Array<[string, 'light' | 'medium' | 'heavy']> = [
      ["Mother's Sorrow", 'light'],
      ['Burning Spellweave', 'light'],
      ["Bahsei's Mania", 'light'],
      ["Spriggan's Thorns", 'medium'],
      ['Briarheart', 'medium'],
      ['Plague Doctor', 'heavy'],
      ['Akaviri Dragonguard', 'heavy'],
    ];

    it.each(lockedSets)('locks %s to %s', (setName, weight) => {
      expect(getLockedArmorWeight(setName)).toBe(weight);
    });

    it('resolves Perfected variants to the same lock', () => {
      expect(getLockedArmorWeight("Perfected Bahsei's Mania")).toBe('light');
    });
  });

  describe('getLockedArmorWeight — free (all-weight) sets', () => {
    // Crafted + monster sets come in all three weights → null (free choice).
    const freeSets = [
      "Hunding's Rage", // crafted
      'Law of Julianos', // crafted
      'Armor Master', // crafted
      'Valkyn Skoria', // monster
      'Bloodspawn', // monster
      'Slimecraw', // monster
      'Zaan', // monster
    ];

    it.each(freeSets)('leaves %s free', (setName) => {
      expect(getLockedArmorWeight(setName)).toBeNull();
      expect(isArmorWeightLocked(setName)).toBe(false);
    });
  });

  describe('getLockedArmorWeight — two-weight artifact overrides', () => {
    // LibSets exported these as two-weight, but they are actually single-weight.
    const overrides: Array<[string, 'light' | 'medium' | 'heavy']> = [
      ['Blessing of High Isle', 'light'],
      ["Night Mother's Embrace", 'medium'],
      ["Draugr's Heritage", 'heavy'],
      ["Steadfast's Mettle", 'medium'],
    ];

    it.each(overrides)('locks %s to %s (artifact corrected)', (setName, weight) => {
      expect(getLockedArmorWeight(setName)).toBe(weight);
    });
  });

  describe('getLockedArmorWeight — edge cases', () => {
    it('returns null for null/undefined/empty input', () => {
      expect(getLockedArmorWeight(null)).toBeNull();
      expect(getLockedArmorWeight(undefined)).toBeNull();
      expect(getLockedArmorWeight('')).toBeNull();
    });

    it('returns null for an unknown set name', () => {
      expect(getLockedArmorWeight('Totally Not A Real Set 9000')).toBeNull();
    });
  });
});
