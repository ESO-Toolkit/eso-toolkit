/**
 * Test to verify Trample affix detection with grimoire filtering
 * Tests Player 1, Ability ID 220542 (Magical Trample)
 */

import { describe, it, expect } from '@jest/globals';

// Import the scribing database
import scribingData from '../../../../data/scribing-complete.json';

describe('Trample Affix Detection with Grimoire Filtering', () => {
  it('should build correct grimoire-compatible affix ID set for Trample', () => {
    const grimoireKey = 'trample';
    const GRIMOIRE_COMPATIBLE_AFFIX_IDS = new Set<number>();

    Object.entries(scribingData.affixScripts).forEach(([key, script]: [string, any]) => {
      if (script.compatibleGrimoires && script.compatibleGrimoires.includes(grimoireKey)) {
        if (script.abilityIds) {
          script.abilityIds.forEach((id: number) => {
            GRIMOIRE_COMPATIBLE_AFFIX_IDS.add(id);
          });
        }
      }
    });

    // Should include Heroism IDs
    expect(GRIMOIRE_COMPATIBLE_AFFIX_IDS.has(61708)).toBe(true); // Minor Heroism
    expect(GRIMOIRE_COMPATIBLE_AFFIX_IDS.has(61709)).toBe(true); // Major Heroism

    // Should NOT include Brittle IDs
    expect(GRIMOIRE_COMPATIBLE_AFFIX_IDS.has(145975)).toBe(false); // Minor Brittle
    expect(GRIMOIRE_COMPATIBLE_AFFIX_IDS.has(145977)).toBe(false); // Major Brittle

    // Should have 26 IDs total (10 affixes * varying number of IDs)
    expect(GRIMOIRE_COMPATIBLE_AFFIX_IDS.size).toBe(26);
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
