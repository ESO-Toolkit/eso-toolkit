/**
 * Tests for roleColors utility
 * Tests role color functions and constants for dark/light mode theming
 */

import { 
  DARK_ROLE_COLORS,
  LIGHT_ROLE_COLORS,
  LIGHT_ROLE_COLORS_SOLID,
  ROLE_COLORS,
  getRoleColor,
  getRoleColorSolid,
} from './roleColors';

describe('roleColors', () => {
  describe('color constants', () => {
    it('should have all required roles in DARK_ROLE_COLORS', () => {
      expect(DARK_ROLE_COLORS).toHaveProperty('dps');
      expect(DARK_ROLE_COLORS).toHaveProperty('healer');
      expect(DARK_ROLE_COLORS).toHaveProperty('tank');
      
      expect(typeof DARK_ROLE_COLORS.dps).toBe('string');
      expect(typeof DARK_ROLE_COLORS.healer).toBe('string');
      expect(typeof DARK_ROLE_COLORS.tank).toBe('string');
    });

    it('should have all required roles in LIGHT_ROLE_COLORS', () => {
      expect(LIGHT_ROLE_COLORS).toHaveProperty('dps');
      expect(LIGHT_ROLE_COLORS).toHaveProperty('healer');
      expect(LIGHT_ROLE_COLORS).toHaveProperty('tank');
      
      expect(typeof LIGHT_ROLE_COLORS.dps).toBe('string');
      expect(typeof LIGHT_ROLE_COLORS.healer).toBe('string');
      expect(typeof LIGHT_ROLE_COLORS.tank).toBe('string');
    });

    it('should have all required roles in LIGHT_ROLE_COLORS_SOLID', () => {
      expect(LIGHT_ROLE_COLORS_SOLID).toHaveProperty('dps');
      expect(LIGHT_ROLE_COLORS_SOLID).toHaveProperty('healer');
      expect(LIGHT_ROLE_COLORS_SOLID).toHaveProperty('tank');
      
      expect(typeof LIGHT_ROLE_COLORS_SOLID.dps).toBe('string');
      expect(typeof LIGHT_ROLE_COLORS_SOLID.healer).toBe('string');
      expect(typeof LIGHT_ROLE_COLORS_SOLID.tank).toBe('string');
    });

    it('should maintain backward compatibility with ROLE_COLORS', () => {
      expect(ROLE_COLORS).toBe(DARK_ROLE_COLORS);
    });

    it('should have different colors for each role in dark mode', () => {
      const dpsColor = DARK_ROLE_COLORS.dps;
      const healerColor = DARK_ROLE_COLORS.healer;
      const tankColor = DARK_ROLE_COLORS.tank;
      
      expect(dpsColor).not.toBe(healerColor);
      expect(dpsColor).not.toBe(tankColor);
      expect(healerColor).not.toBe(tankColor);
    });

    it('should have different colors for each role in light mode', () => {
      const dpsColor = LIGHT_ROLE_COLORS_SOLID.dps;
      const healerColor = LIGHT_ROLE_COLORS_SOLID.healer;
      const tankColor = LIGHT_ROLE_COLORS_SOLID.tank;
      
      expect(dpsColor).not.toBe(healerColor);
      expect(dpsColor).not.toBe(tankColor);
      expect(healerColor).not.toBe(tankColor);
    });
  });

  describe('getRoleColor', () => {
    describe('dark mode (default)', () => {
      it('should return correct dark colors for each role', () => {
        expect(getRoleColor('dps')).toBe(DARK_ROLE_COLORS.dps);
        expect(getRoleColor('healer')).toBe(DARK_ROLE_COLORS.healer);
        expect(getRoleColor('tank')).toBe(DARK_ROLE_COLORS.tank);
      });

      it('should return correct dark colors when explicitly set to dark mode', () => {
        expect(getRoleColor('dps', true)).toBe(DARK_ROLE_COLORS.dps);
        expect(getRoleColor('healer', true)).toBe(DARK_ROLE_COLORS.healer);
        expect(getRoleColor('tank', true)).toBe(DARK_ROLE_COLORS.tank);
      });
    });

    describe('light mode', () => {
      it('should return correct light colors for each role', () => {
        expect(getRoleColor('dps', false)).toBe(LIGHT_ROLE_COLORS.dps);
        expect(getRoleColor('healer', false)).toBe(LIGHT_ROLE_COLORS.healer);
        expect(getRoleColor('tank', false)).toBe(LIGHT_ROLE_COLORS.tank);
      });

      it('should return gradient colors in light mode', () => {
        expect(getRoleColor('dps', false)).toContain('linear-gradient');
        expect(getRoleColor('healer', false)).toContain('linear-gradient');
        expect(getRoleColor('tank', false)).toContain('linear-gradient');
      });
    });

    describe('fallback behavior', () => {
      it('should return default gray color for unknown role in dark mode', () => {
        // @ts-expect-error - Testing invalid role type
        expect(getRoleColor('unknown')).toBe('#9e9e9e');
      });

      it('should return default gray color for unknown role in light mode', () => {
        // @ts-expect-error - Testing invalid role type
        expect(getRoleColor('unknown', false)).toBe('#9e9e9e');
      });
    });
  });

  describe('getRoleColorSolid', () => {
    describe('dark mode (default)', () => {
      it('should return correct dark colors for each role', () => {
        expect(getRoleColorSolid('dps')).toBe(DARK_ROLE_COLORS.dps);
        expect(getRoleColorSolid('healer')).toBe(DARK_ROLE_COLORS.healer);
        expect(getRoleColorSolid('tank')).toBe(DARK_ROLE_COLORS.tank);
      });

      it('should return correct dark colors when explicitly set to dark mode', () => {
        expect(getRoleColorSolid('dps', true)).toBe(DARK_ROLE_COLORS.dps);
        expect(getRoleColorSolid('healer', true)).toBe(DARK_ROLE_COLORS.healer);
        expect(getRoleColorSolid('tank', true)).toBe(DARK_ROLE_COLORS.tank);
      });
    });

    describe('light mode', () => {
      it('should return solid colors instead of gradients for light mode', () => {
        expect(getRoleColorSolid('dps', false)).toBe(LIGHT_ROLE_COLORS_SOLID.dps);
        expect(getRoleColorSolid('healer', false)).toBe(LIGHT_ROLE_COLORS_SOLID.healer);
        expect(getRoleColorSolid('tank', false)).toBe(LIGHT_ROLE_COLORS_SOLID.tank);
      });

      it('should not contain gradient strings in light mode', () => {
        expect(getRoleColorSolid('dps', false)).not.toContain('linear-gradient');
        expect(getRoleColorSolid('healer', false)).not.toContain('linear-gradient');
        expect(getRoleColorSolid('tank', false)).not.toContain('linear-gradient');
      });

      it('should return hex colors in light mode', () => {
        expect(getRoleColorSolid('dps', false)).toMatch(/^#[0-9a-f]{6}$/i);
        expect(getRoleColorSolid('healer', false)).toMatch(/^#[0-9a-f]{6}$/i);
        expect(getRoleColorSolid('tank', false)).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    describe('fallback behavior', () => {
      it('should return default gray color for unknown role in dark mode', () => {
        // @ts-expect-error - Testing invalid role type
        expect(getRoleColorSolid('unknown')).toBe('#9e9e9e');
      });

      it('should return default gray color for unknown role in light mode', () => {
        // @ts-expect-error - Testing invalid role type
        expect(getRoleColorSolid('unknown', false)).toBe('#9e9e9e');
      });
    });
  });

  describe('color format validation', () => {
    it('should have valid hex colors in dark mode', () => {
      expect(DARK_ROLE_COLORS.dps).toMatch(/^#[0-9a-f]{6}$/i);
      expect(DARK_ROLE_COLORS.healer).toMatch(/^#[0-9a-f]{6}$/i);
      expect(DARK_ROLE_COLORS.tank).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should have valid hex colors in light solid colors', () => {
      expect(LIGHT_ROLE_COLORS_SOLID.dps).toMatch(/^#[0-9a-f]{6}$/i);
      expect(LIGHT_ROLE_COLORS_SOLID.healer).toMatch(/^#[0-9a-f]{6}$/i);
      expect(LIGHT_ROLE_COLORS_SOLID.tank).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should have valid CSS gradient syntax in light gradient colors', () => {
      expect(LIGHT_ROLE_COLORS.dps).toContain('linear-gradient(');
      expect(LIGHT_ROLE_COLORS.healer).toContain('linear-gradient(');
      expect(LIGHT_ROLE_COLORS.tank).toContain('linear-gradient(');
    });
  });
});
