import { createTheme, Theme } from '@mui/material/styles';
import { buildVariantSx, getGearChipProps } from './playerCardStyleUtils';

// Mock the gearUtilities module
jest.mock('./gearUtilities', () => ({
  ARENA_SET_NAMES: new Set(['perfected maelstrom bow', 'perfected asylum staff']),
  MONSTER_ONE_PIECE_HINTS: new Set(['velidreth', 'selene', 'kraghs']),
  MYTHIC_SET_NAMES: new Set(['antiquarian insight', 'ring of the wild hunt']),
  normalizeGearName: jest.fn((name: string) => name.toLowerCase().trim()),
}));

describe('playerCardStyleUtils', () => {
  let darkTheme: Theme;
  let lightTheme: Theme;

  beforeEach(() => {
    darkTheme = createTheme({
      palette: {
        mode: 'dark',
      },
    });

    lightTheme = createTheme({
      palette: {
        mode: 'light',
      },
    });
  });

  describe('buildVariantSx', () => {
    describe('dark theme variants', () => {
      it('should return green variant styles for dark theme', () => {
        const result = buildVariantSx('green', darkTheme);

        expect(result).toHaveProperty('position', 'relative');
        expect(result).toHaveProperty('overflow', 'hidden');
        expect(result).toHaveProperty('cursor', 'pointer');
        expect(result).toHaveProperty('borderRadius', 28);
        expect(result).toHaveProperty('backdropFilter', 'blur(10px)');
        expect(result).toHaveProperty('color', '#5ce572');
        expect(result).toHaveProperty('background');
        expect(result).toHaveProperty('borderColor');
      });

      it('should return blue variant styles for dark theme', () => {
        const result = buildVariantSx('blue', darkTheme);

        expect(result).toHaveProperty('color', '#4da3ff');
        expect(result).toHaveProperty('background');
        expect(result).toHaveProperty('borderColor', 'rgba(0, 122, 255, 0.3)');
      });

      it('should return lightBlue variant styles for dark theme', () => {
        const result = buildVariantSx('lightBlue', darkTheme);

        expect(result).toHaveProperty('color', '#7ee8ff');
        expect(result).toHaveProperty('borderColor', 'rgba(94, 234, 255, 0.35)');
      });

      it('should return purple variant styles for dark theme', () => {
        const result = buildVariantSx('purple', darkTheme);

        expect(result).toHaveProperty('color', '#c57fff');
        expect(result).toHaveProperty('borderColor', 'rgba(175, 82, 222, 0.3)');
      });

      it('should return indigo variant styles for dark theme', () => {
        const result = buildVariantSx('indigo', darkTheme);

        expect(result).toHaveProperty('borderColor', 'rgba(88, 86, 214, 0.3)');
        expect((result as any)['& .MuiChip-label']).toHaveProperty('color', '#8583ff');
      });

      it('should return gold variant styles for dark theme', () => {
        const result = buildVariantSx('gold', darkTheme);

        expect(result).toHaveProperty('color', '#ffd54f');
        expect(result).toHaveProperty('borderColor', 'rgba(255, 193, 7, 0.35)');
      });

      it('should return silver variant styles for dark theme', () => {
        const result = buildVariantSx('silver', darkTheme);

        expect(result).toHaveProperty('color', '#ecf0f1');
        expect(result).toHaveProperty('borderColor', 'rgba(236, 240, 241, 0.35)');
      });

      it('should return champion variant styles for dark theme', () => {
        const championRed = buildVariantSx('championRed', darkTheme);
        const championBlue = buildVariantSx('championBlue', darkTheme);
        const championGreen = buildVariantSx('championGreen', darkTheme);

        expect((championRed as any)['& .MuiChip-label']).toHaveProperty('color', '#ff6666');
        expect((championBlue as any)['& .MuiChip-label']).toHaveProperty('color', '#66aaff');
        expect((championGreen as any)['& .MuiChip-label']).toHaveProperty('color', '#66ffaa');
      });

      it('should return legendary variant styles with animation for dark theme', () => {
        const result = buildVariantSx('legendary', darkTheme);

        expect(result).toHaveProperty('color', '#ffffff');
        expect(result).toHaveProperty('animation');
        expect(result).toHaveProperty('borderImage');
      });
    });

    describe('light theme variants', () => {
      it('should return green variant styles for light theme', () => {
        const result = buildVariantSx('green', lightTheme);

        expect(result).toHaveProperty('position', 'relative');
        expect((result as any)['& .MuiChip-label']).toHaveProperty('color', '#065f46');
      });

      it('should return blue variant styles for light theme', () => {
        const result = buildVariantSx('blue', lightTheme);

        expect((result as any)['& .MuiChip-label']).toHaveProperty('color', '#1e3a8a');
        expect(result).toHaveProperty('borderColor', 'rgba(37, 99, 235, 0.3)');
      });

      it('should return purple variant styles for light theme', () => {
        const result = buildVariantSx('purple', lightTheme);

        expect((result as any)['& .MuiChip-label']).toHaveProperty('color', '#581c87');
        expect(result).toHaveProperty('borderColor', 'rgba(126, 34, 206, 0.3)');
      });

      it('should return gold variant styles for light theme', () => {
        const result = buildVariantSx('gold', lightTheme);

        expect((result as any)['& .MuiChip-label']).toHaveProperty('color', '#92400e');
        expect(result).toHaveProperty('borderColor', 'rgba(217, 119, 6, 0.3)');
      });

      it('should return legendary variant styles for light theme', () => {
        const result = buildVariantSx('legendary', lightTheme);

        expect((result as any)['& .MuiChip-label']).toHaveProperty('color', '#1f2937');
        expect((result as any)['& .MuiChip-label']).toHaveProperty('fontWeight', 'bold');
        expect(result).toHaveProperty('animation');
      });
    });

    describe('fallback behavior', () => {
      it('should fallback to silver variant for unknown variants', () => {
        const result = buildVariantSx('unknownVariant', darkTheme);

        expect(result).toHaveProperty('color', '#ecf0f1');
        expect(result).toHaveProperty('borderColor', 'rgba(236, 240, 241, 0.35)');
      });

      it('should include base glossy styles for all variants', () => {
        const result = buildVariantSx('green', darkTheme);

        // Check base glossy styles are present
        expect(result).toHaveProperty('position', 'relative');
        expect(result).toHaveProperty('overflow', 'hidden');
        expect(result).toHaveProperty('cursor', 'pointer');
        expect(result).toHaveProperty('transition', 'all 0.3s ease');
        expect(result).toHaveProperty('borderRadius', 28);
        expect(result).toHaveProperty('backdropFilter', 'blur(10px)');
        expect(result).toHaveProperty('WebkitBackdropFilter', 'blur(10px)');
      });

      it('should include hover effects and pseudo-elements', () => {
        const result = buildVariantSx('blue', darkTheme);

        expect(result).toHaveProperty('&:hover');
        expect(result).toHaveProperty('&:hover::before');
        expect(result).toHaveProperty('&::before');
        expect(result).toHaveProperty('&::after');
      });
    });

    describe('theme-specific styling', () => {
      it('should apply different box shadows for dark vs light themes', () => {
        const darkResult = buildVariantSx('green', darkTheme);
        const lightResult = buildVariantSx('green', lightTheme);

        expect(darkResult).toHaveProperty('boxShadow');
        expect(lightResult).toHaveProperty('boxShadow');

        // They should be different
        expect((darkResult as any).boxShadow).not.toEqual((lightResult as any).boxShadow);
      });

      it('should apply different label colors for dark vs light themes', () => {
        const darkResult = buildVariantSx('green', darkTheme) as any;
        const lightResult = buildVariantSx('green', lightTheme) as any;

        expect(darkResult['& .MuiChip-label'].color).toBe('#ffffff');
        expect(lightResult['& .MuiChip-label'].color).toBe('#065f46');
      });
    });
  });

  describe('getGearChipProps', () => {
    const mockNormalizeGearName = require('./gearUtilities').normalizeGearName;

    beforeEach(() => {
      mockNormalizeGearName.mockClear();
    });

    it('should return gold styling for mythic sets', () => {
      mockNormalizeGearName.mockReturnValue('ring of the wild hunt');

      const result = getGearChipProps('Ring of the Wild Hunt', 1, darkTheme);

      expect(mockNormalizeGearName).toHaveBeenCalledWith('Ring of the Wild Hunt');
      expect(result).toHaveProperty('sx');
      expect(result.sx).toHaveProperty('color', '#ffd54f');
    });

    it('should return blue styling for arena sets', () => {
      mockNormalizeGearName.mockReturnValue('perfected maelstrom bow');

      const result = getGearChipProps('Perfected Maelstrom Bow', 2, darkTheme);

      expect(result).toHaveProperty('sx');
      expect(result.sx).toHaveProperty('color', '#4da3ff');
    });

    it('should return green styling for Highland Sentinel with 4 pieces', () => {
      mockNormalizeGearName.mockReturnValue('highland sentinel');

      const result = getGearChipProps('Highland Sentinel', 4, darkTheme);

      expect(result).toHaveProperty('sx');
      expect(result.sx).toHaveProperty('color', '#5ce572');
    });

    it('should return green styling for 5+ piece sets', () => {
      mockNormalizeGearName.mockReturnValue('some random set');

      const result = getGearChipProps('Some Random Set', 5, darkTheme);

      expect(result).toHaveProperty('sx');
      expect(result.sx).toHaveProperty('color', '#5ce572');
    });

    it('should return purple styling for 2-piece monster sets', () => {
      mockNormalizeGearName.mockReturnValue('velidreth');

      const result = getGearChipProps('Velidreth', 2, darkTheme);

      expect(result).toHaveProperty('sx');
      expect(result.sx).toHaveProperty('color', '#c57fff');
    });

    it('should return light blue styling for 1-piece monster sets', () => {
      mockNormalizeGearName.mockReturnValue('selene');

      const result = getGearChipProps('Selene', 1, darkTheme);

      expect(result).toHaveProperty('sx');
      expect(result.sx).toHaveProperty('color', '#7ee8ff');
    });

    it('should return silver styling as default', () => {
      mockNormalizeGearName.mockReturnValue('unknown set');

      const result = getGearChipProps('Unknown Set', 3, darkTheme);

      expect(result).toHaveProperty('sx');
      expect(result.sx).toHaveProperty('color', '#ecf0f1');
    });

    it('should prioritize mythic over other categories', () => {
      mockNormalizeGearName.mockReturnValue('antiquarian insight');

      // Even with 5 pieces, mythic should take precedence
      const result = getGearChipProps('Antiquarian Insight', 5, darkTheme);

      expect(result.sx).toHaveProperty('color', '#ffd54f'); // Gold, not green
    });

    it('should prioritize arena over piece count', () => {
      mockNormalizeGearName.mockReturnValue('perfected asylum staff');

      // Even with 5 pieces, arena should take precedence
      const result = getGearChipProps('Perfected Asylum Staff', 5, darkTheme);

      expect(result.sx).toHaveProperty('color', '#4da3ff'); // Blue, not green
    });

    it('should work with light theme', () => {
      mockNormalizeGearName.mockReturnValue('ring of the wild hunt');

      const result = getGearChipProps('Ring of the Wild Hunt', 1, lightTheme);

      expect(result).toHaveProperty('sx');
      expect((result.sx as any)['& .MuiChip-label']).toHaveProperty('color', '#92400e');
    });

    it('should handle edge cases', () => {
      mockNormalizeGearName.mockReturnValue('');

      const result = getGearChipProps('', 0, darkTheme);

      expect(result).toHaveProperty('sx');
      expect(result.sx).toHaveProperty('color', '#ecf0f1'); // Default silver
    });

    it('should handle Highland Sentinel special case correctly', () => {
      mockNormalizeGearName.mockReturnValue('highland sentinel');

      // Should be green only for exactly 4 pieces
      const result4 = getGearChipProps('Highland Sentinel', 4, darkTheme);
      const result3 = getGearChipProps('Highland Sentinel', 3, darkTheme);
      const result5 = getGearChipProps('Highland Sentinel', 5, darkTheme);

      expect(result4.sx).toHaveProperty('color', '#5ce572'); // Green
      expect(result3.sx).toHaveProperty('color', '#ecf0f1'); // Silver (default)
      expect(result5.sx).toHaveProperty('color', '#5ce572'); // Green (5+ pieces rule)
    });

    it('should not apply monster styling to non-monster sets with 1-2 pieces', () => {
      mockNormalizeGearName.mockReturnValue('random gear set');

      const result1 = getGearChipProps('Random Gear Set', 1, darkTheme);
      const result2 = getGearChipProps('Random Gear Set', 2, darkTheme);

      expect(result1.sx).toHaveProperty('color', '#ecf0f1'); // Silver, not light blue
      expect(result2.sx).toHaveProperty('color', '#ecf0f1'); // Silver, not purple
    });
  });

  describe('integration tests', () => {
    const mockNormalizeGearName = require('./gearUtilities').normalizeGearName;

    it('should provide consistent styling across theme changes', () => {
      mockNormalizeGearName.mockReturnValue('some set');

      const darkResult = getGearChipProps('Some Set', 5, darkTheme);
      const lightResult = getGearChipProps('Some Set', 5, lightTheme);

      // Both should have the same general structure
      expect(darkResult).toHaveProperty('sx');
      expect(lightResult).toHaveProperty('sx');

      // Both should have base styling properties
      expect(darkResult.sx).toHaveProperty('position', 'relative');
      expect(lightResult.sx).toHaveProperty('position', 'relative');
    });

    it('should handle complex gear names correctly', () => {
      mockNormalizeGearName.mockReturnValue('perfected maelstrom bow');

      const result = getGearChipProps('Perfected Maelstrom Bow (Infused)', 1, darkTheme);

      expect(mockNormalizeGearName).toHaveBeenCalledWith('Perfected Maelstrom Bow (Infused)');
      expect(result.sx).toHaveProperty('color', '#4da3ff'); // Should be arena blue
    });
  });
});
