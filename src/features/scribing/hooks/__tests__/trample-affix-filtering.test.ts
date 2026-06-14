/**
 * Test to verify Trample affix detection with grimoire filtering
 * Tests Player 1, Ability ID 220542 (Magical Trample)
 */

import { describe, it, expect } from '@jest/globals';

// Import the scribing database using require for Jest compatibility
const scribingData = require('../../../../../data/scribing-complete.json');

describe('Trample Affix Detection with Grimoire Filtering', () => {
  it('should build correct grimoire-compatible affix ID set for Trample', () => {
    const grimoireKey = 'trample';
    const GRIMOIRE_COMPATIBLE_AFFIX_IDS = new Set<number>();

    Object.entries(scribingData.affixScripts).forEach(([_, script]: [string, any]) => {
      if (script.compatibleGrimoires && script.compatibleGrimoires.includes(grimoireKey)) {
        if (script.abilityIds) {
          script.abilityIds.forEach((id: number) => {
            GRIMOIRE_COMPATIBLE_AFFIX_IDS.add(id);
          });
        }
      }
    });

    // This test guards the grimoire-FILTERING logic, not a frozen ID list (the affix buff-ID
    // coverage is expanded over time as ESO Logs reveals new internal variant IDs — see v6.4).
    // The invariants below assert the filter includes the right affixes and excludes the wrong
    // ones, which is what actually matters for detection accuracy.

    // The 10 affixes compatible with Trample: off-balance, savagery-and-prophecy, expedition,
    // brutality-and-sorcery, protection, heroism, vulnerability, cowardice, mangle, defile.
    const trampleAffixes = Object.values(scribingData.affixScripts as Record<string, any>).filter(
      (script) => script.compatibleGrimoires?.includes('trample'),
    );
    expect(trampleAffixes.length).toBe(10);

    // The compatible-ID set is exactly the union of those 10 affixes' abilityIds (no leakage).
    const expectedUnion = new Set<number>();
    trampleAffixes.forEach((script) =>
      (script.abilityIds ?? []).forEach((id: number) => expectedUnion.add(id)),
    );
    expect([...GRIMOIRE_COMPATIBLE_AFFIX_IDS].sort((a, b) => a - b)).toEqual(
      [...expectedUnion].sort((a, b) => a - b),
    );

    // Should include Heroism IDs (compatible)
    expect(GRIMOIRE_COMPATIBLE_AFFIX_IDS.has(61708)).toBe(true); // Minor Heroism
    expect(GRIMOIRE_COMPATIBLE_AFFIX_IDS.has(61709)).toBe(true); // Major Heroism

    // Should NOT include Brittle IDs (incompatible with Trample)
    expect(GRIMOIRE_COMPATIBLE_AFFIX_IDS.has(145975)).toBe(false); // Minor Brittle
    expect(GRIMOIRE_COMPATIBLE_AFFIX_IDS.has(145977)).toBe(false); // Major Brittle

    // Should NOT include Courage/Berserk IDs (NOT compatible with Trample) — guards the
    // filtering that, combined with the v6.4 coverage fix, prevents the Courage→Berserk mislabel.
    expect(GRIMOIRE_COMPATIBLE_AFFIX_IDS.has(147417)).toBe(false); // Minor Courage
    expect(GRIMOIRE_COMPATIBLE_AFFIX_IDS.has(61744)).toBe(false); // Minor Berserk

    // Ensure Minor Protection variants are covered by the affix mapping
    expect(GRIMOIRE_COMPATIBLE_AFFIX_IDS.has(203344)).toBe(true);
  });

  it('should verify Heroism is compatible with Trample', () => {
    const heroismAffix = scribingData.affixScripts.heroism;
    expect(heroismAffix.compatibleGrimoires).toContain('trample');
  });

  it('should verify Brittle is NOT compatible with Trample', () => {
    const brittleAffix = scribingData.affixScripts.brittle;
    expect(brittleAffix.compatibleGrimoires).not.toContain('trample');
  });
});
