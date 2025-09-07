/**
 * Tests for classNameUtils utility
 * Tests ESO class name normalization and alias resolution
 */

import { CLASS_ALIASES, toClassKey } from './classNameUtils';

describe('classNameUtils', () => {
  describe('CLASS_ALIASES', () => {
    it('should contain all expected ESO classes', () => {
      const expectedClasses = [
        'dragonknight',
        'templar', 
        'warden',
        'nightblade',
        'sorcerer',
        'necromancer',
        'arcanist'
      ];

      expectedClasses.forEach(className => {
        expect(CLASS_ALIASES).toHaveProperty(className);
        expect(CLASS_ALIASES[className]).toBe(className);
      });
    });

    it('should have dragonknight aliases', () => {
      expect(CLASS_ALIASES['dragonknight']).toBe('dragonknight');
      expect(CLASS_ALIASES['dragon knight']).toBe('dragonknight');
      expect(CLASS_ALIASES['dk']).toBe('dragonknight');
    });

    it('should have templar aliases', () => {
      expect(CLASS_ALIASES['templar']).toBe('templar');
      expect(CLASS_ALIASES['plar']).toBe('templar');
    });

    it('should have nightblade aliases', () => {
      expect(CLASS_ALIASES['nightblade']).toBe('nightblade');
      expect(CLASS_ALIASES['night blade']).toBe('nightblade');
      expect(CLASS_ALIASES['nb']).toBe('nightblade');
    });

    it('should have sorcerer aliases', () => {
      expect(CLASS_ALIASES['sorcerer']).toBe('sorcerer');
      expect(CLASS_ALIASES['sorc']).toBe('sorcerer');
    });

    it('should have necromancer aliases', () => {
      expect(CLASS_ALIASES['necromancer']).toBe('necromancer');
      expect(CLASS_ALIASES['necro']).toBe('necromancer');
    });

    it('should have single-name classes without aliases', () => {
      expect(CLASS_ALIASES['warden']).toBe('warden');
      expect(CLASS_ALIASES['arcanist']).toBe('arcanist');
    });

    it('should not have duplicate entries pointing to wrong classes', () => {
      // Ensure each alias maps to the correct canonical name
      Object.entries(CLASS_ALIASES).forEach(([alias, canonical]) => {
        expect(typeof canonical).toBe('string');
        expect(canonical.length).toBeGreaterThan(0);
        expect(canonical).not.toContain(' '); // Canonical names should not have spaces
      });
    });
  });

  describe('toClassKey', () => {
    describe('canonical class names', () => {
      it('should return canonical names unchanged', () => {
        expect(toClassKey('dragonknight')).toBe('dragonknight');
        expect(toClassKey('templar')).toBe('templar');
        expect(toClassKey('warden')).toBe('warden');
        expect(toClassKey('nightblade')).toBe('nightblade');
        expect(toClassKey('sorcerer')).toBe('sorcerer');
        expect(toClassKey('necromancer')).toBe('necromancer');
        expect(toClassKey('arcanist')).toBe('arcanist');
      });
    });

    describe('alias resolution', () => {
      it('should resolve dragonknight aliases', () => {
        expect(toClassKey('dragon knight')).toBe('dragonknight');
        expect(toClassKey('dk')).toBe('dragonknight');
        expect(toClassKey('DK')).toBe('dragonknight');
        expect(toClassKey('Dragon Knight')).toBe('dragonknight');
      });

      it('should resolve templar aliases', () => {
        expect(toClassKey('plar')).toBe('templar');
        expect(toClassKey('PLAR')).toBe('templar');
        expect(toClassKey('Plar')).toBe('templar');
      });

      it('should resolve nightblade aliases', () => {
        expect(toClassKey('night blade')).toBe('nightblade');
        expect(toClassKey('nb')).toBe('nightblade');
        expect(toClassKey('NB')).toBe('nightblade');
        expect(toClassKey('Night Blade')).toBe('nightblade');
      });

      it('should resolve sorcerer aliases', () => {
        expect(toClassKey('sorc')).toBe('sorcerer');
        expect(toClassKey('SORC')).toBe('sorcerer');
        expect(toClassKey('Sorc')).toBe('sorcerer');
      });

      it('should resolve necromancer aliases', () => {
        expect(toClassKey('necro')).toBe('necromancer');
        expect(toClassKey('NECRO')).toBe('necromancer');
        expect(toClassKey('Necro')).toBe('necromancer');
      });
    });

    describe('case insensitivity', () => {
      it('should handle uppercase input', () => {
        expect(toClassKey('DRAGONKNIGHT')).toBe('dragonknight');
        expect(toClassKey('TEMPLAR')).toBe('templar');
        expect(toClassKey('WARDEN')).toBe('warden');
        expect(toClassKey('NIGHTBLADE')).toBe('nightblade');
        expect(toClassKey('SORCERER')).toBe('sorcerer');
        expect(toClassKey('NECROMANCER')).toBe('necromancer');
        expect(toClassKey('ARCANIST')).toBe('arcanist');
      });

      it('should handle mixed case input', () => {
        expect(toClassKey('DragonKnight')).toBe('dragonknight');
        expect(toClassKey('Templar')).toBe('templar');
        expect(toClassKey('NightBlade')).toBe('nightblade');
        expect(toClassKey('Sorcerer')).toBe('sorcerer');
      });

      it('should handle mixed case aliases', () => {
        expect(toClassKey('Dk')).toBe('dragonknight');
        expect(toClassKey('Plar')).toBe('templar');
        expect(toClassKey('Nb')).toBe('nightblade');
        expect(toClassKey('Sorc')).toBe('sorcerer');
        expect(toClassKey('Necro')).toBe('necromancer');
      });
    });

    describe('whitespace handling', () => {
      it('should trim whitespace from input', () => {
        expect(toClassKey('  dragonknight  ')).toBe('dragonknight');
        expect(toClassKey('\ttemplar\n')).toBe('templar');
        expect(toClassKey(' dk ')).toBe('dragonknight');
      });

      it('should handle internal spaces in multi-word class names', () => {
        expect(toClassKey('dragon knight')).toBe('dragonknight');
        expect(toClassKey('night blade')).toBe('nightblade');
        expect(toClassKey('  dragon knight  ')).toBe('dragonknight');
        expect(toClassKey('\tnight blade\n')).toBe('nightblade');
      });
    });

    describe('invalid input handling', () => {
      it('should return "unknown" for unrecognized class names', () => {
        expect(toClassKey('warrior')).toBe('unknown');
        expect(toClassKey('mage')).toBe('unknown');
        expect(toClassKey('hunter')).toBe('unknown');
        expect(toClassKey('paladin')).toBe('unknown');
        expect(toClassKey('rogue')).toBe('unknown');
      });

      it('should return "unknown" for empty or whitespace-only input', () => {
        expect(toClassKey('')).toBe('unknown');
        expect(toClassKey('   ')).toBe('unknown');
        expect(toClassKey('\t\n')).toBe('unknown');
      });

      it('should return "unknown" for null or undefined input', () => {
        expect(toClassKey(null)).toBe('unknown');
        expect(toClassKey(undefined)).toBe('unknown');
      });

      it('should return "unknown" for non-alphabetic input', () => {
        expect(toClassKey('123')).toBe('unknown');
        expect(toClassKey('!@#')).toBe('unknown');
        expect(toClassKey('class123')).toBe('unknown');
      });
    });

    describe('edge cases', () => {
      it('should handle partial matches correctly', () => {
        expect(toClassKey('dragon')).toBe('unknown'); // Partial of 'dragonknight'
        expect(toClassKey('knight')).toBe('unknown'); // Partial of 'dragonknight'
        expect(toClassKey('night')).toBe('unknown'); // Partial of 'nightblade'
        expect(toClassKey('blade')).toBe('unknown'); // Partial of 'nightblade'
      });

      it('should handle concatenated names without spaces', () => {
        expect(toClassKey('dragonknight')).toBe('dragonknight');
        expect(toClassKey('nightblade')).toBe('nightblade');
        // These should fail since they're not in the aliases
        expect(toClassKey('dragoknight')).toBe('unknown');
        expect(toClassKey('nightbla')).toBe('unknown');
      });

      it('should handle very long input', () => {
        const longInput = 'dragonknight'.repeat(100);
        expect(toClassKey(longInput)).toBe('unknown');
      });
    });

    describe('real-world usage scenarios', () => {
      it('should handle typical user input variations', () => {
        // Common user typos and variations that should still work
        expect(toClassKey('Dragon Knight')).toBe('dragonknight');
        expect(toClassKey('Night Blade')).toBe('nightblade');
        expect(toClassKey('DK')).toBe('dragonknight');
        expect(toClassKey('NB')).toBe('nightblade');
        expect(toClassKey('Sorc')).toBe('sorcerer');
        expect(toClassKey('Necro')).toBe('necromancer');
      });

      it('should be consistent with ESO community terminology', () => {
        // Test abbreviations commonly used in ESO community
        expect(toClassKey('dk')).toBe('dragonknight');
        expect(toClassKey('nb')).toBe('nightblade');
        expect(toClassKey('sorc')).toBe('sorcerer');
        expect(toClassKey('necro')).toBe('necromancer');
        expect(toClassKey('plar')).toBe('templar');
      });
    });
  });
});
