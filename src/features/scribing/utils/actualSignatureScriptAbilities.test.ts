import '@testing-library/jest-dom';
import {
  SIGNATURE_SCRIPT_ABILITIES,
  type SignatureScriptAbility,
  getAbilitiesBySignatureScript,
  getAbilitiesByGrimoire,
  getAbilityById,
  getAbilityByName,
  findAbilitiesByNamePattern,
  getConfirmedSignatureScriptAbilities,
  detectSignatureScriptFromAbilityId,
  getAbilitiesForSignatureScript,
  getGrimoiresForSignatureScript,
  analyzeSignatureScriptsFromAbilityIds,
  getAllGrimoires,
  getAllSignatureScripts,
  ABILITY_ID_TO_SIGNATURE_SCRIPT,
  SIGNATURE_SCRIPT_TO_ABILITIES,
} from './actualSignatureScriptAbilities';

describe('actualSignatureScriptAbilities', () => {
  describe('SIGNATURE_SCRIPT_ABILITIES', () => {
    it('should contain signature script abilities', () => {
      expect(SIGNATURE_SCRIPT_ABILITIES).toBeDefined();
      expect(Array.isArray(SIGNATURE_SCRIPT_ABILITIES)).toBe(true);
      expect(SIGNATURE_SCRIPT_ABILITIES.length).toBeGreaterThan(0);
    });

    it('should have valid ability structure', () => {
      const firstAbility = SIGNATURE_SCRIPT_ABILITIES[0];
      expect(firstAbility).toBeDefined();
      expect(firstAbility).toHaveProperty('id');
      expect(firstAbility).toHaveProperty('name');
      expect(firstAbility).toHaveProperty('signatureScript');
      expect(firstAbility).toHaveProperty('grimoire');
      expect(firstAbility).toHaveProperty('icon');
      
      expect(typeof firstAbility.id).toBe('number');
      expect(typeof firstAbility.name).toBe('string');
      expect(typeof firstAbility.signatureScript).toBe('string');
      expect(typeof firstAbility.grimoire).toBe('string');
      expect(typeof firstAbility.icon).toBe('string');
    });

    it('should have unique ability IDs', () => {
      const ids = SIGNATURE_SCRIPT_ABILITIES.map(ability => ability.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should contain expected signature scripts', () => {
      const signatureScripts = new Set(
        SIGNATURE_SCRIPT_ABILITIES.map(ability => ability.signatureScript)
      );
      
      // Test for some known signature scripts
      expect(signatureScripts.has('lingering-torment')).toBe(true);
      expect(signatureScripts.has('hunters-snare')).toBe(true);
    });

    it('should contain expected grimoires', () => {
      const grimoires = new Set(
        SIGNATURE_SCRIPT_ABILITIES.map(ability => ability.grimoire)
      );
      
      // Test for some known grimoires
      expect(grimoires.has('vault')).toBe(true);
      expect(grimoires.has('soul-burst')).toBe(true);
      expect(grimoires.has('elemental-explosion')).toBe(true);
    });
  });

  describe('getAbilitiesBySignatureScript', () => {
    it('should return abilities for a valid signature script', () => {
      const abilities = getAbilitiesBySignatureScript('lingering-torment');
      expect(Array.isArray(abilities)).toBe(true);
      expect(abilities.length).toBeGreaterThan(0);
      
      abilities.forEach(ability => {
        expect(ability.signatureScript).toBe('lingering-torment');
      });
    });

    it('should return empty array for non-existent signature script', () => {
      const abilities = getAbilitiesBySignatureScript('non-existent-script');
      expect(Array.isArray(abilities)).toBe(true);
      expect(abilities.length).toBe(0);
    });

    it('should handle empty string', () => {
      const abilities = getAbilitiesBySignatureScript('');
      expect(Array.isArray(abilities)).toBe(true);
      expect(abilities.length).toBe(0);
    });
  });

  describe('getAbilitiesByGrimoire', () => {
    it('should return abilities for a valid grimoire', () => {
      const abilities = getAbilitiesByGrimoire('vault');
      expect(Array.isArray(abilities)).toBe(true);
      expect(abilities.length).toBeGreaterThan(0);
      
      abilities.forEach(ability => {
        expect(ability.grimoire).toBe('vault');
      });
    });

    it('should return empty array for non-existent grimoire', () => {
      const abilities = getAbilitiesByGrimoire('non-existent-grimoire');
      expect(Array.isArray(abilities)).toBe(true);
      expect(abilities.length).toBe(0);
    });

    it('should handle empty string', () => {
      const abilities = getAbilitiesByGrimoire('');
      expect(Array.isArray(abilities)).toBe(true);
      expect(abilities.length).toBe(0);
    });
  });

  describe('detectSignatureScriptFromAbilityId', () => {
    it('should return signature script for valid ability ID', () => {
      const firstAbility = SIGNATURE_SCRIPT_ABILITIES[0];
      const signatureScript = detectSignatureScriptFromAbilityId(firstAbility.id);
      expect(signatureScript).toBe(firstAbility.signatureScript);
    });

    it('should return null for non-existent ability ID', () => {
      const signatureScript = detectSignatureScriptFromAbilityId(999999);
      expect(signatureScript).toBeNull();
    });

    it('should handle negative IDs', () => {
      const signatureScript = detectSignatureScriptFromAbilityId(-1);
      expect(signatureScript).toBeNull();
    });
  });

  describe('getAbilityById', () => {
    it('should return ability for valid ability ID', () => {
      const firstAbility = SIGNATURE_SCRIPT_ABILITIES[0];
      const ability = getAbilityById(firstAbility.id);
      expect(ability).toEqual(firstAbility);
    });

    it('should return undefined for non-existent ability ID', () => {
      const ability = getAbilityById(999999);
      expect(ability).toBeUndefined();
    });

    it('should handle negative IDs', () => {
      const ability = getAbilityById(-1);
      expect(ability).toBeUndefined();
    });
  });

  describe('getAbilityByName', () => {
    it('should return ability for valid ability name', () => {
      const firstAbility = SIGNATURE_SCRIPT_ABILITIES[0];
      const ability = getAbilityByName(firstAbility.name);
      expect(ability).toEqual(firstAbility);
    });

    it('should return undefined for non-existent ability name', () => {
      const ability = getAbilityByName('Non Existent Ability');
      expect(ability).toBeUndefined();
    });

    it('should handle empty string', () => {
      const ability = getAbilityByName('');
      expect(ability).toBeUndefined();
    });
  });

  describe('findAbilitiesByNamePattern', () => {
    it('should find abilities matching pattern', () => {
      const pattern = /Lingering/i;
      const abilities = findAbilitiesByNamePattern(pattern);
      
      expect(Array.isArray(abilities)).toBe(true);
      abilities.forEach(ability => {
        expect(ability.name).toMatch(pattern);
      });
    });

    it('should return empty array for non-matching pattern', () => {
      const pattern = /ZZZNONEXISTENT/i;
      const abilities = findAbilitiesByNamePattern(pattern);
      expect(Array.isArray(abilities)).toBe(true);
      expect(abilities.length).toBe(0);
    });
  });

  describe('getConfirmedSignatureScriptAbilities', () => {
    it('should return confirmed signature script abilities', () => {
      const confirmed = getConfirmedSignatureScriptAbilities();
      expect(Array.isArray(confirmed)).toBe(true);
      
      confirmed.forEach(ability => {
        expect(ability.signatureScript).not.toBe('unknown');
      });
    });
  });

  describe('analyzeSignatureScriptsFromAbilityIds', () => {
    it('should analyze signature scripts from ability IDs', () => {
      const abilityIds = SIGNATURE_SCRIPT_ABILITIES.slice(0, 5).map(a => a.id);
      const analysis = analyzeSignatureScriptsFromAbilityIds(abilityIds);
      
      expect(analysis).toHaveProperty('detectedScripts');
      expect(analysis).toHaveProperty('detectedAbilities');
      expect(analysis).toHaveProperty('scriptConfidence');
      
      expect(Array.isArray(analysis.detectedScripts)).toBe(true);
      expect(Array.isArray(analysis.detectedAbilities)).toBe(true);
      expect(typeof analysis.scriptConfidence).toBe('object');
    });

    it('should handle empty array', () => {
      const analysis = analyzeSignatureScriptsFromAbilityIds([]);
      expect(analysis.detectedScripts).toEqual([]);
      expect(analysis.detectedAbilities).toEqual([]);
      expect(Object.keys(analysis.scriptConfidence)).toEqual([]);
    });
  });

  describe('data integrity checks', () => {
    it('should not have duplicate ability IDs', () => {
      const abilityIds = new Set<number>();
      
      SIGNATURE_SCRIPT_ABILITIES.forEach(ability => {
        expect(abilityIds.has(ability.id)).toBe(false);
        abilityIds.add(ability.id);
      });
    });

    it('should have valid icon patterns', () => {
      const validPatterns = [
        /^ability_grimoire_/,
        /^ability_mage_/,
        /^scribing_/
      ];

      SIGNATURE_SCRIPT_ABILITIES.forEach(ability => {
        const hasValidPattern = validPatterns.some(pattern => pattern.test(ability.icon));
        expect(hasValidPattern).toBe(true);
      });
    });

    it('should have valid signature script naming conventions', () => {
      SIGNATURE_SCRIPT_ABILITIES.forEach(ability => {
        // Signature scripts should be lowercase with hyphens
        expect(ability.signatureScript).toMatch(/^[a-z][a-z\-]*[a-z]$/);
      });
    });

    it('should have valid grimoire naming conventions', () => {
      SIGNATURE_SCRIPT_ABILITIES.forEach(ability => {
        // Grimoires should be lowercase with hyphens
        expect(ability.grimoire).toMatch(/^[a-z][a-z\-]*[a-z]?$/);
      });
    });

    it('should have positive ability IDs', () => {
      SIGNATURE_SCRIPT_ABILITIES.forEach(ability => {
        expect(ability.id).toBeGreaterThan(0);
      });
    });

    it('should have non-empty names', () => {
      SIGNATURE_SCRIPT_ABILITIES.forEach(ability => {
        expect(ability.name).toBeTruthy();
        expect(ability.name.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe('getAllGrimoires', () => {
    it('should return all unique grimoires', () => {
      const grimoires = getAllGrimoires();
      expect(Array.isArray(grimoires)).toBe(true);
      expect(grimoires.length).toBeGreaterThan(0);
      
      const uniqueSet = new Set(grimoires);
      expect(uniqueSet.size).toBe(grimoires.length);
    });
  });

  describe('getAllSignatureScripts', () => {
    it('should return all unique signature scripts', () => {
      const scripts = getAllSignatureScripts();
      expect(Array.isArray(scripts)).toBe(true);
      expect(scripts.length).toBeGreaterThan(0);
      
      const uniqueSet = new Set(scripts);
      expect(uniqueSet.size).toBe(scripts.length);
      
      // Should not include "unknown"
      expect(scripts.includes('unknown')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined inputs gracefully', () => {
      expect(() => getAbilitiesBySignatureScript(undefined as any)).not.toThrow();
      expect(() => getAbilitiesByGrimoire(undefined as any)).not.toThrow();
      expect(() => detectSignatureScriptFromAbilityId(undefined as any)).not.toThrow();
      expect(() => getAbilityById(undefined as any)).not.toThrow();
      expect(() => getAbilityByName(undefined as any)).not.toThrow();
    });

    it('should handle null inputs gracefully', () => {
      expect(() => getAbilitiesBySignatureScript(null as any)).not.toThrow();
      expect(() => getAbilitiesByGrimoire(null as any)).not.toThrow();
      expect(() => detectSignatureScriptFromAbilityId(null as any)).not.toThrow();
      expect(() => getAbilityById(null as any)).not.toThrow();
      expect(() => getAbilityByName(null as any)).not.toThrow();
    });

    it('should handle empty arrays and datasets', () => {
      // Test that data structures are available
      expect(ABILITY_ID_TO_SIGNATURE_SCRIPT).toBeDefined();
      expect(SIGNATURE_SCRIPT_TO_ABILITIES).toBeDefined();
      expect(typeof SIGNATURE_SCRIPT_TO_ABILITIES).toBe('object');
    });
  });

  describe('performance considerations', () => {
    it('should efficiently lookup abilities by ID', () => {
      // Test that lookups are reasonably fast even with many items
      const startTime = performance.now();
      
      // Perform multiple lookups
      for (let i = 0; i < 100; i++) {
        const ability = SIGNATURE_SCRIPT_ABILITIES[i % SIGNATURE_SCRIPT_ABILITIES.length];
        detectSignatureScriptFromAbilityId(ability.id);
        getAbilityById(ability.id);
        getAbilityByName(ability.name);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete lookups quickly (under 100ms for 100 lookups)
      expect(duration).toBeLessThan(100);
    });
  });
});