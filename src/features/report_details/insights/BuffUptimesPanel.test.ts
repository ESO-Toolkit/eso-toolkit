/**
 * Tests for BuffUptimesPanel - Gear set proc buff tracking (ESO-608)
 *
 * Verifies that:
 * 1. IMPORTANT_BUFF_ABILITIES includes Pillager's Profit proc buff (172055)
 * 2. IMPORTANT_BUFF_ABILITIES includes Ozezan's Plating proc buff (188471)
 * 3. The IMPORTANT_BUFF_ABILITIES set correctly includes/excludes abilities
 */

import { KnownAbilities } from '../../../types/abilities';

import { IMPORTANT_BUFF_ABILITIES } from './BuffUptimesPanel';

describe('BuffUptimesPanel', () => {
  describe('IMPORTANT_BUFF_ABILITIES', () => {
    it("should include the Pillager's Profit gear set proc buff (172055)", () => {
      expect(IMPORTANT_BUFF_ABILITIES.has(KnownAbilities.PILLAGERS_PROFIT_BUFF)).toBe(true);
    });

    it("should include the Ozezan's Plating gear set proc buff (188471)", () => {
      expect(IMPORTANT_BUFF_ABILITIES.has(KnownAbilities.OZEZANS_PLATING)).toBe(true);
    });

    it('should include all expected important buffs', () => {
      const expectedBuffs = [
        KnownAbilities.MINOR_SAVAGERY,
        KnownAbilities.MAJOR_SAVAGERY,
        KnownAbilities.MINOR_SORCERY,
        KnownAbilities.MAJOR_SORCERY,
        KnownAbilities.PEARLESCENT_WARD,
        KnownAbilities.LUCENT_ECHOES_RECIPIENT,
        KnownAbilities.LUCENT_ECHOES_WEARER,
        KnownAbilities.MAJOR_COURAGE,
        KnownAbilities.MAJOR_RESOLVE,
        KnownAbilities.ENLIVENING_OVERFLOW_BUFF,
        KnownAbilities.MINOR_BERSERK,
        KnownAbilities.MINOR_COURAGE,
        KnownAbilities.EMPOWER,
        KnownAbilities.MINOR_HEROISM,
        KnownAbilities.POWERFUL_ASSAULT,
        KnownAbilities.MINOR_BRUTALITY,
        KnownAbilities.MAJOR_BRUTALITY,
        KnownAbilities.MINOR_FORCE,
        KnownAbilities.MINOR_SLAYER,
        KnownAbilities.MAJOR_SLAYER,
        KnownAbilities.GRAND_REJUVENATION,
        KnownAbilities.MAJOR_BERSERK,
        KnownAbilities.PILLAGERS_PROFIT_BUFF,
        KnownAbilities.OZEZANS_PLATING,
      ];

      expectedBuffs.forEach((buff) => {
        expect(IMPORTANT_BUFF_ABILITIES.has(buff)).toBe(true);
      });

      // Verify the set size matches to catch any accidental additions or omissions
      expect(IMPORTANT_BUFF_ABILITIES.size).toBe(expectedBuffs.length);
    });

    it('should not include debuff abilities', () => {
      expect(IMPORTANT_BUFF_ABILITIES.has(KnownAbilities.MAJOR_BREACH)).toBe(false);
      expect(IMPORTANT_BUFF_ABILITIES.has(KnownAbilities.MINOR_BREACH)).toBe(false);
      expect(IMPORTANT_BUFF_ABILITIES.has(KnownAbilities.NAZARAY_DEBUFF)).toBe(false);
    });

    it("should have correct ability ID for Pillager's Profit buff", () => {
      expect(KnownAbilities.PILLAGERS_PROFIT_BUFF).toBe(172055);
    });

    it("should have correct ability ID for Ozezan's Plating buff", () => {
      expect(KnownAbilities.OZEZANS_PLATING).toBe(188471);
    });
  });
});
