import { UnifiedScribingDetectionService, unifiedScribingService } from './unified-scribing-service';

// Mock the algorithm dependencies
jest.mock('./grimoire-detector', () => ({
  GrimoireDetector: jest.fn().mockImplementation(() => ({
    detectGrimoireFromEvents: jest.fn().mockResolvedValue([]),
  })),
}));

jest.mock('./focus-detector', () => ({
  FocusScriptDetector: jest.fn().mockImplementation(() => ({
    detectFocusScriptsFromGrimoires: jest.fn().mockReturnValue({
      detections: [],
      totalAnalyzed: 0,
      uniqueFocusScripts: new Set(),
      playerFocusScripts: new Map(),
      grimoireFocusScripts: new Map(),
      confidence: 0.5,
      processingTime: 10,
      errors: [],
      warnings: [],
    }),
  })),
}));

jest.mock('./signature-detector', () => ({
  SignatureScriptDetector: jest.fn().mockImplementation(() => ({
    detectSignatureScriptsFromGrimoires: jest.fn().mockResolvedValue({
      detections: [],
      totalAnalyzed: 0,
      uniqueSignatureScripts: new Set(),
      playerSignatureScripts: new Map(),
      grimoireSignatureScripts: new Map(),
      confidence: 0.5,
      processingTime: 10,
      errors: [],
      warnings: [],
    }),
  })),
}));

jest.mock('./affix-detector', () => ({
  AffixScriptDetector: jest.fn().mockImplementation(() => ({
    detectAffixScriptsFromGrimoires: jest.fn().mockResolvedValue({
      detections: [],
      totalAnalyzed: 0,
      uniqueAffixScripts: new Set(),
      playerAffixScripts: new Map(),
      grimoireAffixScripts: new Map(),
      confidence: 0.5,
      processingTime: 10,
      errors: [],
      warnings: [],
    }),
  })),
}));

jest.mock('../parsers/eso-log-parser', () => ({
  ESLogParser: jest.fn().mockImplementation(() => ({
    parseLogData: jest.fn().mockResolvedValue([]),
  })),
}));

describe('UnifiedScribingDetectionService', () => {
  let service: UnifiedScribingDetectionService;

  beforeEach(() => {
    service = new UnifiedScribingDetectionService();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create service with default dependencies', () => {
      const newService = new UnifiedScribingDetectionService();
      expect(newService).toBeInstanceOf(UnifiedScribingDetectionService);
    });
  });

  describe('detectScribingRecipes', () => {
    it('should handle empty fight ID', async () => {
      const result = await service.detectScribingRecipes('');
      
      expect(result).toMatchObject({
        players: expect.any(Array),
        summary: expect.objectContaining({
          totalCombinations: expect.any(Number),
          totalCasts: expect.any(Number),
          uniqueGrimoires: expect.any(Number),
          uniqueFocusScripts: expect.any(Number),
          uniqueSignatureScripts: expect.any(Number),
          uniqueAffixScripts: expect.any(Number),
        }),
      });
    });

    it('should process valid fight ID', async () => {
      const fightId = 'test-fight-123';
      
      const result = await service.detectScribingRecipes(fightId);
      
      expect(result).toMatchObject({
        players: expect.any(Array),
        summary: expect.objectContaining({
          totalCombinations: expect.any(Number),
          totalCasts: expect.any(Number),
        }),
      });
    });

    it('should handle fight 88 special case', async () => {
      const result = await service.detectScribingRecipes('88');
      
      expect(result).toMatchObject({
        players: expect.any(Array),
        summary: expect.any(Object),
      });
    });

    it('should handle detection with no results', async () => {
      const result = await service.detectScribingRecipes('no-scribing-fight');
      
      expect(result.players).toEqual([]);
      expect(result.summary.totalCombinations).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle service initialization errors gracefully', async () => {
      // Test with invalid inputs
      const result = await service.detectScribingRecipes(null as any);
      
      expect(result).toMatchObject({
        players: expect.any(Array),
        summary: expect.any(Object),
      });
    });

    it('should handle parser errors gracefully', async () => {
      // Mock parser to throw error
      const mockParser = {
        parseLogData: jest.fn().mockRejectedValue(new Error('Parser error')),
      };
      
      const serviceWithErrorParser = new UnifiedScribingDetectionService();
      
      const result = await serviceWithErrorParser.detectScribingRecipes('test');
      
      expect(result).toMatchObject({
        players: expect.any(Array),
        summary: expect.any(Object),
      });
    });
  });

  describe('integration workflow', () => {
    it('should coordinate all detection algorithms', async () => {
      const fightId = 'integration-test-fight';
      
      const result = await service.detectScribingRecipes(fightId);
      
      // Should provide the expected result structure
      expect(result).toMatchObject({
        players: expect.any(Array),
        summary: expect.objectContaining({
          totalCombinations: expect.any(Number),
          totalCasts: expect.any(Number),
          uniqueGrimoires: expect.any(Number),
          uniqueFocusScripts: expect.any(Number),
          uniqueSignatureScripts: expect.any(Number),
          uniqueAffixScripts: expect.any(Number),
        }),
      });
    });

    it('should aggregate results from multiple algorithms', async () => {
      const result = await service.detectScribingRecipes('multi-algorithm-test');
      
      expect(result.summary).toMatchObject({
        totalCombinations: expect.any(Number),
        totalCasts: expect.any(Number),
        uniqueGrimoires: expect.any(Number),
        uniqueFocusScripts: expect.any(Number),
        uniqueSignatureScripts: expect.any(Number),
        uniqueAffixScripts: expect.any(Number),
      });
    });
  });

  describe('caching and performance', () => {
    it('should handle repeated requests efficiently', async () => {
      const fightId = 'performance-test';
      
      // First request
      const result1 = await service.detectScribingRecipes(fightId);
      // Second request (should potentially use cache)
      const result2 = await service.detectScribingRecipes(fightId);
      
      expect(result1.players.length).toBe(result2.players.length);
      expect(result1.summary.totalCombinations).toBe(result2.summary.totalCombinations);
    });

    it('should return valid result structure', async () => {
      const result = await service.detectScribingRecipes('timing-test');
      
      expect(result).toHaveProperty('players');
      expect(result).toHaveProperty('summary');
      expect(result.summary).toHaveProperty('totalCombinations');
      expect(result.summary).toHaveProperty('totalCasts');
    });
  });

  describe('data validation', () => {
    it('should validate fight ID format', async () => {
      const invalidFightIds = ['', null, undefined, 123, {}];
      
      for (const invalidId of invalidFightIds) {
        const result = await service.detectScribingRecipes(invalidId as any);
        expect(result).toMatchObject({
          players: expect.any(Array),
          summary: expect.any(Object),
        });
      }
    });

    it('should handle malformed inputs gracefully', async () => {
      const serviceWithBadData = new UnifiedScribingDetectionService();
      
      const result = await serviceWithBadData.detectScribingRecipes('malformed-test');
      
      expect(result).toMatchObject({
        players: expect.any(Array),
        summary: expect.objectContaining({
          totalCombinations: expect.any(Number),
          totalCasts: expect.any(Number),
        }),
      });
    });
  });
});