import { renderHook, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

// Create mock functions at the top level for Jest hoisting
const mockDetectScribingRecipes = jest.fn();
const mockGetSkillScribingData = jest.fn();
const mockGetScribingDataForSkill = jest.fn();

const mockService = {
  detectScribingRecipes: mockDetectScribingRecipes,
  getSkillScribingData: mockGetSkillScribingData,
  getScribingDataForSkill: mockGetScribingDataForSkill,
};

jest.mock('../algorithms/unified-scribing-service', () => {
  return {
    UnifiedScribingDetectionService: function () {
      return {
        detectScribingRecipes: mockDetectScribingRecipes,
        getSkillScribingData: mockGetSkillScribingData,
        getScribingDataForSkill: mockGetScribingDataForSkill,
      };
    },
  };
});

import { useScribingDetection, useSkillScribingData } from './useScribingDetection';

describe('useScribingDetection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('should return initial state', () => {
      // Test if the hook can be instantiated at all
      let hookResult;
      try {
        hookResult = renderHook(() => useScribingDetection());
      } catch (error) {
        console.error('Hook instantiation failed:', error);
        throw error;
      }

      const { result } = hookResult;
      expect(result.current.data).toBeNull();
      expect(result.current.scribedSkillData).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.refetch).toBe('function');
    });

    it('should not fetch when disabled', () => {
      renderHook(() => useScribingDetection({ enabled: false, fightId: 'test-fight' }));

      expect(mockService.detectScribingRecipes).not.toHaveBeenCalled();
    });

    it('should not fetch when no fightId provided', () => {
      renderHook(() => useScribingDetection({ enabled: true }));

      expect(mockService.detectScribingRecipes).not.toHaveBeenCalled();
    });
  });

  describe('Data fetching', () => {
    it('should fetch scribing data when enabled and fightId provided', async () => {
      const mockResult = {
        players: [],
        summary: {
          totalCombinations: 0,
          totalCasts: 0,
          uniqueGrimoires: 0,
          uniqueFocusScripts: 0,
          uniqueSignatureScripts: 0,
          uniqueAffixScripts: 0,
        },
      };

      mockService.detectScribingRecipes.mockResolvedValue(mockResult);

      const { result } = renderHook(() =>
        useScribingDetection({ enabled: true, fightId: 'test-fight' }),
      );

      // Manually trigger refetch to test service integration wrapped in act
      await act(async () => {
        await result.current.refetch();
      });

      // Debug: Check if there was an error
      if (result.current.error) {
        console.log('Hook error:', result.current.error);
      }

      expect(mockService.detectScribingRecipes).toHaveBeenCalledWith('test-fight');
      expect(result.current.data).toEqual(mockResult);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch errors', async () => {
      const errorMessage = 'Failed to fetch scribing data';
      mockService.detectScribingRecipes!.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() =>
        useScribingDetection({ enabled: true, fightId: 'test-fight' }),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBe(errorMessage);
    });

    it('should set loading state during fetch', async () => {
      let resolveFetch: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      mockService.detectScribingRecipes!.mockReturnValue(fetchPromise);

      const { result } = renderHook(() =>
        useScribingDetection({ enabled: true, fightId: 'test-fight' }),
      );

      // Initially should be loading
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBeNull();

      // Resolve the promise
      resolveFetch!({
        detectedRecipes: [],
        playerAnalysis: new Map(),
        confidence: 1.0,
        processingTime: 50,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Skill-specific data fetching', () => {
    it('should fetch skill scribing data when player and ability specified', async () => {
      const mockResult = {
        players: [{ playerId: 123, playerName: 'Test Player' }],
        summary: {
          totalCombinations: 1,
          totalCasts: 1,
          uniqueGrimoires: 1,
          uniqueFocusScripts: 1,
          uniqueSignatureScripts: 1,
          uniqueAffixScripts: 1,
        },
      };
      const mockSkillData = {
        grimoire: 'Trample',
        focus: 'Physical Damage',
        signature: 'Test Signature',
        affix: 'Test Affix',
        confidence: 0.95,
        wasCastInFight: true,
      };

      mockService.detectScribingRecipes!.mockResolvedValue(mockResult);
      mockService.getScribingDataForSkill!.mockResolvedValue(mockSkillData);

      const { result } = renderHook(() =>
        useScribingDetection({
          enabled: true,
          fightId: 'test-fight',
          playerId: 123,
          abilityId: 12345,
        }),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockService.detectScribingRecipes).toHaveBeenCalledWith('test-fight');
      expect(mockService.getScribingDataForSkill).toHaveBeenCalledWith('test-fight', 123, 12345);
      expect(result.current.scribedSkillData).not.toBeNull();
    });

    it('should handle skill data fetch errors', async () => {
      mockService.detectScribingRecipes!.mockResolvedValue({
        players: [{ playerId: 123, playerName: 'Test Player' }],
        summary: {
          totalCombinations: 1,
          totalCasts: 1,
          uniqueGrimoires: 1,
          uniqueFocusScripts: 1,
          uniqueSignatureScripts: 1,
          uniqueAffixScripts: 1,
        },
      });

      mockService.getScribingDataForSkill!.mockRejectedValue(new Error('Skill fetch failed'));

      const { result } = renderHook(() =>
        useScribingDetection({
          enabled: true,
          fightId: 'test-fight',
          playerId: 123,
          abilityId: 12345,
        }),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Skill fetch failed');
    });
  });

  describe('Manual refetch', () => {
    it('should refetch data when refetch is called', async () => {
      const mockResult = {
        players: [],
        summary: {
          totalCombinations: 0,
          totalCasts: 0,
          uniqueGrimoires: 0,
          uniqueFocusScripts: 0,
          uniqueSignatureScripts: 0,
          uniqueAffixScripts: 0,
        },
      };

      mockService.detectScribingRecipes!.mockResolvedValue(mockResult);

      const { result } = renderHook(() =>
        useScribingDetection({ enabled: true, fightId: 'test-fight' }),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear the mock calls
      jest.clearAllMocks();

      // Call refetch
      await result.current.refetch();

      expect(mockService.detectScribingRecipes).toHaveBeenCalledWith('test-fight');
    });

    it('should handle refetch errors', async () => {
      const mockResult = {
        players: [],
        summary: {
          totalCombinations: 0,
          totalCasts: 0,
          uniqueGrimoires: 0,
          uniqueFocusScripts: 0,
          uniqueSignatureScripts: 0,
          uniqueAffixScripts: 0,
        },
      };

      mockService
        .detectScribingRecipes!.mockResolvedValueOnce(mockResult)
        .mockRejectedValueOnce(new Error('Refetch failed'));

      const { result } = renderHook(() =>
        useScribingDetection({ enabled: true, fightId: 'test-fight' }),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Initial fetch should succeed
      expect(result.current.error).toBeNull();

      // Refetch should fail
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.error).toBe('Refetch failed');
      });
    });
  });

  describe('Options parameter handling', () => {
    it('should handle undefined options', () => {
      const { result } = renderHook(() => useScribingDetection());

      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(mockService.detectScribingRecipes).not.toHaveBeenCalled();
    });

    it('should handle empty options object', () => {
      const { result } = renderHook(() => useScribingDetection({}));

      expect(result.current.data).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(mockService.detectScribingRecipes).not.toHaveBeenCalled();
    });

    it('should respect enabled flag', async () => {
      mockService.detectScribingRecipes!.mockResolvedValue({
        players: [],
        summary: {
          totalCombinations: 0,
          totalCasts: 0,
          uniqueGrimoires: 0,
          uniqueFocusScripts: 0,
          uniqueSignatureScripts: 0,
          uniqueAffixScripts: 0,
        },
      });

      const { result, rerender } = renderHook(
        ({ enabled }) => useScribingDetection({ enabled, fightId: 'test-fight' }),
        { initialProps: { enabled: false } },
      );

      expect(mockService.detectScribingRecipes).not.toHaveBeenCalled();

      // Enable the hook
      rerender({ enabled: true });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockService.detectScribingRecipes).toHaveBeenCalledWith('test-fight');
    });
  });
});

describe('useSkillScribingData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useSkillScribingData());

      expect(result.current.scribedSkillData).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should not fetch when parameters are missing', () => {
      renderHook(() => useSkillScribingData('fight-id'));
      renderHook(() => useSkillScribingData('fight-id', 123));

      expect(mockService.detectScribingRecipes).not.toHaveBeenCalled();
    });

    it('should fetch when all parameters provided', async () => {
      const mockResult = {
        players: [{ playerId: 123, playerName: 'Test Player' }],
        summary: {
          totalCombinations: 1,
          totalCasts: 1,
          uniqueGrimoires: 1,
          uniqueFocusScripts: 1,
          uniqueSignatureScripts: 1,
          uniqueAffixScripts: 1,
        },
      };
      const mockSkillData = {
        grimoire: 'Trample',
        focus: 'Physical Damage',
        signature: 'Test Signature',
        affix: 'Test Affix',
        confidence: 0.95,
        wasCastInFight: true,
      };

      mockService.detectScribingRecipes!.mockResolvedValue(mockResult);
      mockService.getScribingDataForSkill!.mockResolvedValue(mockSkillData);

      const { result } = renderHook(() => useSkillScribingData('fight-id', 123, 12345));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockService.detectScribingRecipes).toHaveBeenCalledWith('fight-id');
      expect(mockService.getScribingDataForSkill).toHaveBeenCalledWith('fight-id', 123, 12345);
      expect(result.current.scribedSkillData).not.toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch errors', async () => {
      mockService.detectScribingRecipes!.mockResolvedValue({
        players: [{ playerId: 123, playerName: 'Test Player' }],
        summary: {
          totalCombinations: 1,
          totalCasts: 1,
          uniqueGrimoires: 1,
          uniqueFocusScripts: 1,
          uniqueSignatureScripts: 1,
          uniqueAffixScripts: 1,
        },
      });
      mockService.getScribingDataForSkill!.mockRejectedValue(new Error('Skill data fetch failed'));

      const { result } = renderHook(() => useSkillScribingData('fight-id', 123, 12345));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Skill data fetch failed');
    });

    it('should update when parameters change', async () => {
      const mockResult = {
        players: [{ playerId: 123, playerName: 'Test Player' }],
        summary: {
          totalCombinations: 1,
          totalCasts: 1,
          uniqueGrimoires: 1,
          uniqueFocusScripts: 1,
          uniqueSignatureScripts: 1,
          uniqueAffixScripts: 1,
        },
      };

      const mockSkillData1 = {
        grimoire: 'Trample',
        focus: 'Physical Damage',
        signature: 'Test Signature',
        affix: 'Test Affix',
        confidence: 0.95,
        wasCastInFight: true,
      };

      const mockSkillData2 = {
        grimoire: 'Elemental Explosion',
        focus: 'Fire Damage',
        signature: 'Test Signature 2',
        affix: 'Test Affix 2',
        confidence: 0.9,
        wasCastInFight: true,
      };

      mockService.detectScribingRecipes!.mockResolvedValue(mockResult);
      mockService
        .getScribingDataForSkill!.mockResolvedValueOnce(mockSkillData1)
        .mockResolvedValueOnce(mockSkillData2);

      const { result, rerender } = renderHook(
        ({ abilityId }) => useSkillScribingData('fight-id', 123, abilityId),
        { initialProps: { abilityId: 12345 } },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.scribedSkillData).not.toBeNull();

      // Change ability ID
      rerender({ abilityId: 54321 });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockService.getScribingDataForSkill).toHaveBeenCalledWith('fight-id', 123, 54321);
      expect(result.current.scribedSkillData).not.toBeNull();
    });
  });
});
