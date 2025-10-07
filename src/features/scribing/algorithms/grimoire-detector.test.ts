import '@testing-library/jest-dom';

import { GrimoireDetector, GrimoireDetection } from './grimoire-detector';
import { AbilityScribingMapping } from '../data/ability-scribing-mapping';
import { ParsedLogEvent } from '../parsers/eso-log-parser';

// Mock the abilityScribingMapper
const mockMapper = {
  getScribingComponent: jest.fn(),
  getGrimoireByAbilityId: jest.fn(),
} as any;

// Sample mock data
const mockGrimoireMapping: AbilityScribingMapping = {
  abilityId: 12345,
  type: 'grimoire',
  grimoireKey: 'trample',
  componentKey: 'trample',
  name: 'Trample',
  category: 'assault',
  description: 'Base trample grimoire',
};

const mockTransformationMapping: AbilityScribingMapping = {
  abilityId: 12346,
  type: 'transformation',
  grimoireKey: 'trample', 
  componentKey: 'physical-damage',
  name: 'Physical Trample',
  category: 'focus',
  description: 'Physical damage transformation',
};

describe('GrimoireDetector', () => {
  let detector: GrimoireDetector;

  beforeEach(() => {
    jest.clearAllMocks();
    detector = new GrimoireDetector(mockMapper);
  });

  describe('Constructor', () => {
    it('should create instance with default mapper', () => {
      const defaultDetector = new GrimoireDetector();
      expect(defaultDetector).toBeInstanceOf(GrimoireDetector);
    });

    it('should create instance with custom mapper', () => {
      const customDetector = new GrimoireDetector(mockMapper);
      expect(customDetector).toBeInstanceOf(GrimoireDetector);
    });
  });

  describe('detectGrimoireFromEvent', () => {
    const mockCastEvent: ParsedLogEvent = {
      type: 'cast',
      timestamp: 1000,
      sourceID: 1,
      targetID: 2,
      abilityGameID: 12345,
      fight: 1,
    } as ParsedLogEvent;

    const mockNonCastEvent: ParsedLogEvent = {
      type: 'damage',
      timestamp: 1000,
      sourceID: 1,
      targetID: 2,
      abilityGameID: 12345,
      fight: 1,
    } as ParsedLogEvent;

    it('should return null for non-cast events', async () => {
      const result = await detector.detectGrimoireFromEvent(mockNonCastEvent);
      expect(result).toBeNull();
      expect(mockMapper.getScribingComponent).not.toHaveBeenCalled();
    });

    it('should return null when no scribing components found', async () => {
      mockMapper.getScribingComponent.mockReturnValue([]);

      const result = await detector.detectGrimoireFromEvent(mockCastEvent);
      expect(result).toBeNull();
      expect(mockMapper.getScribingComponent).toHaveBeenCalledWith(12345);
    });

    it('should return null when getScribingComponent returns null', async () => {
      mockMapper.getScribingComponent.mockReturnValue([]);

      const result = await detector.detectGrimoireFromEvent(mockCastEvent);
      expect(result).toBeNull();
    });

    it('should detect grimoire from cast event', async () => {
      const mockScribingComponents: AbilityScribingMapping[] = [
        {
          abilityId: 12345,
          type: 'grimoire',
          grimoireKey: 'trample',
          componentKey: 'trample',
          name: 'Trample',
          category: 'assault',
        },
      ];

      mockMapper.getScribingComponent.mockReturnValue(mockScribingComponents);

      const result = await detector.detectGrimoireFromEvent(mockCastEvent);

      expect(result).not.toBeNull();
      expect(result).toEqual({
        grimoireKey: 'trample',
        grimoireName: 'Trample',
        grimoireId: 12345,
        detectedAbilityId: 12345,
        detectionType: 'base-cast',
        confidence: 0.95,
        timestamp: 1000,
        sourcePlayer: 1,
        event: mockCastEvent,
      });
    });

    it('should detect transformation from cast event', async () => {
      const mockScribingComponents: AbilityScribingMapping[] = [
        {
          abilityId: 12345,
          type: 'transformation',
          grimoireKey: 'trample',
          componentKey: 'physical-damage',
          name: 'Physical Damage',
          category: 'focus',
        },
      ];

      mockMapper.getScribingComponent.mockResolvedValue(mockScribingComponents);

      const result = await detector.detectGrimoireFromEvent(mockCastEvent);

      expect(result).not.toBeNull();
      expect(result?.grimoireKey).toBe('trample');
      expect(result?.grimoireName).toBe('Physical Damage');
      expect(result?.detectionType).toBe('transformation-cast');
      expect(result?.focusScriptType).toBe('physical-damage');
      expect(result?.confidence).toBe(0.90);
    });

    it('should handle multiple components and prioritize grimoire type', async () => {
      const mockScribingComponents: AbilityScribingMapping[] = [
        {
          abilityId: 12345,
          type: 'transformation',
          grimoireKey: 'trample',
          componentKey: 'physical-damage',
          name: 'Physical Damage',
        },
        {
          abilityId: 12345,
          type: 'grimoire',
          grimoireKey: 'trample',
          componentKey: 'trample',
          name: 'Trample',
        },
      ];

      mockMapper.getScribingComponent.mockReturnValue(mockScribingComponents);

      const result = await detector.detectGrimoireFromEvent(mockCastEvent);

      expect(result).not.toBeNull();
      expect(result?.detectionType).toBe('transformation-cast'); // First match returned
      expect(result?.confidence).toBe(0.90);
    });

    it('should handle mapper errors gracefully', async () => {
      mockMapper.getScribingComponent.mockImplementation(() => {
        throw new Error('Mapper error');
      });

      await expect(detector.detectGrimoireFromEvent(mockCastEvent)).rejects.toThrow('Mapper error');
    });

    it('should handle invalid event data', async () => {
      const invalidEvent = {} as ParsedLogEvent;
      
      const result = await detector.detectGrimoireFromEvent(invalidEvent);
      expect(result).toBeNull();
    });

  });

  describe('Error handling and edge cases', () => {
    it('should handle mapper errors gracefully', async () => {
      const testCastEvent: ParsedLogEvent = {
        type: 'cast',
        timestamp: 1000,
        sourceID: 1,
        targetID: 2,
        abilityGameID: 12345,
        fight: 1,
      } as ParsedLogEvent;

      mockMapper.getScribingComponent.mockImplementation(() => {
        throw new Error('Mapper error');
      });

      await expect(detector.detectGrimoireFromEvent(testCastEvent)).rejects.toThrow('Mapper error');
    });

    it('should handle invalid event data', async () => {
      const invalidEvent = {} as ParsedLogEvent;
      
      const result = await detector.detectGrimoireFromEvent(invalidEvent);
      expect(result).toBeNull();
    });
  });

  describe('GrimoireDetection interface validation', () => {
    it('should have correct structure for grimoire detection', async () => {
      const mockScribingComponents: AbilityScribingMapping[] = [
        {
          abilityId: 12345,
          type: 'grimoire',
          grimoireKey: 'trample',
          componentKey: 'trample',
          name: 'Trample',
        },
      ];

      mockMapper.getScribingComponent.mockResolvedValue(mockScribingComponents);

      const mockCastEvent: ParsedLogEvent = {
        type: 'cast',
        timestamp: 1000,
        sourceID: 1,
        targetID: 2,
        abilityGameID: 12345,
        fight: 1,
      } as ParsedLogEvent;

      const result = await detector.detectGrimoireFromEvent(mockCastEvent) as GrimoireDetection;

      expect(result).toHaveProperty('grimoireKey');
      expect(result).toHaveProperty('grimoireName');
      expect(result).toHaveProperty('detectedAbilityId');
      expect(result).toHaveProperty('detectionType');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('sourcePlayer');
      expect(result).toHaveProperty('event');

      expect(typeof result.grimoireKey).toBe('string');
      expect(typeof result.grimoireName).toBe('string');
      expect(typeof result.detectedAbilityId).toBe('number');
      expect(typeof result.detectionType).toBe('string');
      expect(typeof result.confidence).toBe('number');
      expect(typeof result.timestamp).toBe('number');
      expect(typeof result.sourcePlayer).toBe('number');
      expect(typeof result.event).toBe('object');
    });
  });
});