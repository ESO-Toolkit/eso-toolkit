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

    const EXPECTED_TRAMPLE_AFFIX_ABILITY_IDS = [
      3929,
      5805,
      21926,
      22233,
      24153,
      27190,
      39168,
      46202,
      47193,
      61662,
      61665,
      61666,
      61667,
      61685,
      61687,
      61688,
      61689,
      61708,
      61709,
      61721,
      61722,
      61735,
      61736,
      68359,
      79717,
      103570,
      106754,
      111354,
      147643,
      161716,
      186493,
      203344
    ];

    // Ensure set contains exactly the expected ability IDs (10 affixes -> 32 IDs)
    expect([...GRIMOIRE_COMPATIBLE_AFFIX_IDS].sort((a, b) => a - b)).toEqual(
      EXPECTED_TRAMPLE_AFFIX_ABILITY_IDS
    );

    // Should include Heroism IDs
    expect(GRIMOIRE_COMPATIBLE_AFFIX_IDS.has(61708)).toBe(true); // Minor Heroism
    expect(GRIMOIRE_COMPATIBLE_AFFIX_IDS.has(61709)).toBe(true); // Major Heroism

    // Should NOT include Brittle IDs
    expect(GRIMOIRE_COMPATIBLE_AFFIX_IDS.has(145975)).toBe(false); // Minor Brittle
    expect(GRIMOIRE_COMPATIBLE_AFFIX_IDS.has(145977)).toBe(false); // Major Brittle

    // Ensure new Minor Protection variants are covered by the affix mapping
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
