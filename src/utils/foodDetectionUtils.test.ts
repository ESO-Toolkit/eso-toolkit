/**
 * Tests for foodDetectionUtils
 * Tests ESO food and drink buff detection and formatting utilities
 */

import { detectFoodFromAuras, abbreviateFood, getFoodColor } from './foodDetectionUtils';

// Mock some food ID constants for testing
jest.mock('../types/abilities', () => ({
  TRI_STAT_FOOD: new Set([1001, 1002]),
  HEALTH_AND_REGEN_FOOD: new Set([2001, 2002]),
  HEALTH_FOOD: new Set([3001, 3002]),
  MAGICKA_FOOD: new Set([4001, 4002]),
  STAMINA_FOOD: new Set([5001, 5002]),
  INCREASE_MAX_HEALTH_AND_STAMINA: new Set([6001, 6002]),
  INCREASE_MAX_HEALTH_AND_MAGICKA: new Set([7001, 7002]),
}));

describe('foodDetectionUtils', () => {
  describe('detectFoodFromAuras', () => {
    describe('named food detection', () => {
      it('should detect Artaeum Takeaway Broth', () => {
        const auras = [
          { name: 'Artaeum Takeaway Broth', id: 9999 },
          { name: 'Some Other Buff', id: 8888 },
        ];

        const result = detectFoodFromAuras(auras);
        expect(result).toEqual({ name: 'Artaeum Takeaway Broth', id: 9999 });
      });

      it('should detect Bewitched Sugar Skulls', () => {
        const auras = [{ name: 'Bewitched Sugar Skulls', id: 9998 }];
        const result = detectFoodFromAuras(auras);
        expect(result).toEqual({ name: 'Bewitched Sugar Skulls', id: 9998 });
      });

      it('should detect Clockwork Citrus Filet', () => {
        const auras = [{ name: 'Clockwork Citrus Filet', id: 9997 }];
        const result = detectFoodFromAuras(auras);
        expect(result).toEqual({ name: 'Clockwork Citrus Filet', id: 9997 });
      });

      it('should detect Crown Fortifying Meal', () => {
        const auras = [{ name: 'Crown Fortifying Meal', id: 9996 }];
        const result = detectFoodFromAuras(auras);
        expect(result).toEqual({ name: 'Crown Fortifying Meal', id: 9996 });
      });

      it('should detect Dubious Camoran Throne', () => {
        const auras = [{ name: 'Dubious Camoran Throne', id: 9995 }];
        const result = detectFoodFromAuras(auras);
        expect(result).toEqual({ name: 'Dubious Camoran Throne', id: 9995 });
      });

      it('should detect Witchmother\'s Potent Brew variations', () => {
        const auras1 = [{ name: "Witchmother's Potent Brew", id: 9994 }];
        const auras2 = [{ name: "Witchmothers Potent Brew", id: 9993 }];
        
        expect(detectFoodFromAuras(auras1)).toEqual({ name: "Witchmother's Potent Brew", id: 9994 });
        expect(detectFoodFromAuras(auras2)).toEqual({ name: "Witchmothers Potent Brew", id: 9993 });
      });

      it('should be case insensitive for named foods', () => {
        const auras = [{ name: 'artaeum takeaway broth', id: 9999 }];
        const result = detectFoodFromAuras(auras);
        expect(result).toEqual({ name: 'artaeum takeaway broth', id: 9999 });
      });

      it('should handle extra whitespace in food names', () => {
        const auras = [{ name: 'Artaeum   Takeaway    Broth', id: 9999 }];
        const result = detectFoodFromAuras(auras);
        expect(result).toEqual({ name: 'Artaeum   Takeaway    Broth', id: 9999 });
      });
    });

    describe('food ID detection', () => {
      it('should detect tri-stat food by ID', () => {
        const auras = [
          { name: 'Some Tri-Stat Food', id: 1001 },
          { name: 'Other Buff', id: 8888 },
        ];

        const result = detectFoodFromAuras(auras);
        expect(result).toEqual({ name: 'Some Tri-Stat Food', id: 1001 });
      });

      it('should detect health and regen food by ID', () => {
        const auras = [{ name: 'Health and Regen Food', id: 2001 }];
        const result = detectFoodFromAuras(auras);
        expect(result).toEqual({ name: 'Health and Regen Food', id: 2001 });
      });

      it('should detect health food by ID', () => {
        const auras = [{ name: 'Health Food', id: 3001 }];
        const result = detectFoodFromAuras(auras);
        expect(result).toEqual({ name: 'Health Food', id: 3001 });
      });

      it('should detect magicka food by ID', () => {
        const auras = [{ name: 'Magicka Food', id: 4001 }];
        const result = detectFoodFromAuras(auras);
        expect(result).toEqual({ name: 'Magicka Food', id: 4001 });
      });

      it('should detect stamina food by ID', () => {
        const auras = [{ name: 'Stamina Food', id: 5001 }];
        const result = detectFoodFromAuras(auras);
        expect(result).toEqual({ name: 'Stamina Food', id: 5001 });
      });

      it('should detect health+stamina food by ID', () => {
        const auras = [{ name: 'Health and Stamina Food', id: 6001 }];
        const result = detectFoodFromAuras(auras);
        expect(result).toEqual({ name: 'Health and Stamina Food', id: 6001 });
      });

      it('should detect health+magicka food by ID', () => {
        const auras = [{ name: 'Health and Magicka Food', id: 7001 }];
        const result = detectFoodFromAuras(auras);
        expect(result).toEqual({ name: 'Health and Magicka Food', id: 7001 });
      });

      it('should handle empty name with valid ID', () => {
        const auras = [{ name: '', id: 1001 }];
        const result = detectFoodFromAuras(auras);
        expect(result).toEqual({ name: '', id: 1001 });
      });
    });

    describe('generic effect detection', () => {
      it('should detect "Increase All Primary Stats" effect', () => {
        const auras = [{ name: 'Increase All Primary Stats', id: 9999 }];
        const result = detectFoodFromAuras(auras);
        expect(result).toEqual({ name: 'Increase All Primary Stats', id: 9999 });
      });

      it('should detect "Increase Max Health & Magicka" effect', () => {
        const auras = [{ name: 'Increase Max Health & Magicka', id: 9998 }];
        const result = detectFoodFromAuras(auras);
        expect(result).toEqual({ name: 'Increase Max Health & Magicka', id: 9998 });
      });

      it('should detect "Increase Max Health & Stamina" effect', () => {
        const auras = [{ name: 'Increase Max Health & Stamina', id: 9997 }];
        const result = detectFoodFromAuras(auras);
        expect(result).toEqual({ name: 'Increase Max Health & Stamina', id: 9997 });
      });

      it('should be case insensitive for generic effects', () => {
        const auras = [{ name: 'increase all primary stats', id: 9999 }];
        const result = detectFoodFromAuras(auras);
        expect(result).toEqual({ name: 'increase all primary stats', id: 9999 });
      });
    });

    describe('priority order', () => {
      it('should prioritize named foods over ID detection', () => {
        const auras = [
          { name: 'Artaeum Takeaway Broth', id: 1001 }, // Named food with tri-stat ID
          { name: 'Some Tri-Stat Food', id: 1002 },
        ];

        const result = detectFoodFromAuras(auras);
        expect(result).toEqual({ name: 'Artaeum Takeaway Broth', id: 1001 });
      });

      it('should prioritize ID detection over generic effects', () => {
        const auras = [
          { name: 'Increase All Primary Stats', id: 9999 },
          { name: 'Some Food', id: 1001 }, // Tri-stat food ID
        ];

        const result = detectFoodFromAuras(auras);
        expect(result).toEqual({ name: 'Some Food', id: 1001 });
      });

      it('should fall back to generic effects when no named foods or IDs match', () => {
        const auras = [
          { name: 'Some Random Buff', id: 9999 },
          { name: 'Increase All Primary Stats', id: 8888 },
        ];

        const result = detectFoodFromAuras(auras);
        expect(result).toEqual({ name: 'Increase All Primary Stats', id: 8888 });
      });
    });

    describe('edge cases', () => {
      it('should return undefined for empty auras array', () => {
        const result = detectFoodFromAuras([]);
        expect(result).toBeUndefined();
      });

      it('should return undefined for undefined auras', () => {
        const result = detectFoodFromAuras(undefined);
        expect(result).toBeUndefined();
      });

      it('should return undefined when no food buffs found', () => {
        const auras = [
          { name: 'Some Random Buff', id: 9999 },
          { name: 'Another Buff', id: 8888 },
        ];

        const result = detectFoodFromAuras(auras);
        expect(result).toBeUndefined();
      });

      it('should handle auras with missing properties', () => {
        const auras = [
          { name: '', id: 9999 } as any,
          { id: 8888 } as any,
          { name: 'Some Regular Buff' } as any, // No ID, not a named food
        ];

        const result = detectFoodFromAuras(auras);
        expect(result).toBeUndefined(); // No complete food aura found
      });

      it('should handle null/undefined in aura properties', () => {
        const auras = [
          { name: null, id: 1001 } as any,
          { name: undefined, id: 2001 } as any,
          { name: 'Valid Food', id: null } as any,
        ];

        const result = detectFoodFromAuras(auras);
        expect(result).toEqual({ name: '', id: 1001 }); // First valid ID match
      });
    });
  });

  describe('abbreviateFood', () => {
    it('should abbreviate tri-stat foods', () => {
      expect(abbreviateFood('Some Tri-Stat Food')).toBe('TRI');
      expect(abbreviateFood('Max Tri-Stat Boost')).toBe('TRI');
    });

    it('should abbreviate health and regen foods', () => {
      expect(abbreviateFood('Health and Regen Food')).toBe('H+R');
      expect(abbreviateFood('Max Health & Regen Boost')).toBe('H+R');
    });

    it('should abbreviate health and stamina foods', () => {
      expect(abbreviateFood('Health and Stamina Food')).toBe('H+S');
      expect(abbreviateFood('Max Health & Stamina Boost')).toBe('H+S');
    });

    it('should abbreviate health and magicka foods', () => {
      expect(abbreviateFood('Health and Magicka Food')).toBe('H+M');
      expect(abbreviateFood('Max Health & Magicka Boost')).toBe('H+M');
    });

    it('should abbreviate single stat foods', () => {
      expect(abbreviateFood('Max Health Food')).toBe('HEALTH');
      expect(abbreviateFood('Some Magicka Boost')).toBe('MAG');
      expect(abbreviateFood('Stamina Enhancement')).toBe('STAM');
    });

    it('should handle priority when multiple keywords present', () => {
      // Based on the actual function logic, it checks keywords in order
      expect(abbreviateFood('Health and Regen Magicka Food')).toBe('H+R');
      expect(abbreviateFood('Health and Stamina Regen')).toBe('H+R'); // "Regen" comes before "Stamina" in checks
    });

    it('should truncate unknown food names', () => {
      expect(abbreviateFood('Unknown Food Name')).toBe('UNKNOW');
      expect(abbreviateFood('ABC')).toBe('ABC');
      expect(abbreviateFood('ABCDEFGHIJ')).toBe('ABCDEF');
    });

    it('should handle empty or short names', () => {
      expect(abbreviateFood('')).toBe('');
      expect(abbreviateFood('A')).toBe('A');
      expect(abbreviateFood('AB')).toBe('AB');
    });

    it('should convert truncated names to uppercase', () => {
      expect(abbreviateFood('custom food')).toBe('CUSTOM');
      expect(abbreviateFood('weird-name')).toBe('WEIRD-');
    });
  });

  describe('getFoodColor', () => {
    it('should return specific colors for each food type', () => {
      expect(getFoodColor(1001)).toBe('#4CAF50'); // Tri-stat = green
      expect(getFoodColor(2001)).toBe('#FF9800'); // Health+regen = orange
      expect(getFoodColor(3001)).toBe('#F44336'); // Health = red
      expect(getFoodColor(4001)).toBe('#3F51B5'); // Magicka = blue
      expect(getFoodColor(5001)).toBe('#4CAF50'); // Stamina = green
      expect(getFoodColor(6001)).toBe('#FF5722'); // Health+stamina = deep orange
      expect(getFoodColor(7001)).toBe('#9C27B0'); // Health+magicka = purple
    });

    it('should return gray for unknown food IDs', () => {
      expect(getFoodColor(9999)).toBe('#888');
      expect(getFoodColor(0)).toBe('#888');
      expect(getFoodColor(-1)).toBe('#888');
    });

    it('should return gray for undefined food ID', () => {
      expect(getFoodColor(undefined)).toBe('#888');
      expect(getFoodColor()).toBe('#888');
    });

    it('should handle different IDs within same food type', () => {
      expect(getFoodColor(1001)).toBe('#4CAF50'); // First tri-stat ID
      expect(getFoodColor(1002)).toBe('#4CAF50'); // Second tri-stat ID
      expect(getFoodColor(2001)).toBe('#FF9800'); // First health+regen ID
      expect(getFoodColor(2002)).toBe('#FF9800'); // Second health+regen ID
    });
  });

  describe('integration tests', () => {
    it('should work together for complete food detection and formatting', () => {
      const auras = [
        { name: 'Some Random Buff', id: 9999 },
        { name: 'Artaeum Takeaway Broth', id: 1001 },
        { name: 'Another Buff', id: 8888 },
      ];

      const detected = detectFoodFromAuras(auras);
      expect(detected).toBeDefined();
      
      if (detected) {
        const abbreviated = abbreviateFood(detected.name);
        const color = getFoodColor(detected.id);
        
        expect(detected.name).toBe('Artaeum Takeaway Broth');
        expect(detected.id).toBe(1001);
        expect(abbreviated).toBe('ARTAEU'); // Truncated unknown name
        expect(color).toBe('#4CAF50'); // Tri-stat color
      }
    });

    it('should handle edge case where no food is detected', () => {
      const auras = [{ name: 'Some Random Buff', id: 9999 }];
      
      const detected = detectFoodFromAuras(auras);
      expect(detected).toBeUndefined();
      
      // Test default behaviors when no food detected
      expect(abbreviateFood('Unknown')).toBe('UNKNOW');
      expect(getFoodColor(undefined)).toBe('#888');
    });
  });
});
