import '@testing-library/jest-dom';

import { GrimoireDetector, GrimoireDetection, GrimoireDetectionResult } from './grimoire-detector';
import { AbilityScribingMapping } from '../data/ability-scribing-mapping';
import { ParsedLogEvent } from '../parsers/eso-log-parser';

// Mock the abilityScribingMapper
const mockMapper = {
  getScribingComponent: jest.fn(),
  getGrimoireByAbilityId: jest.fn(),
} as any;

describe('GrimoireDetector - Comprehensive Coverage', () => {
  let detector: GrimoireDetector;

  beforeEach(() => {
    jest.clearAllMocks();
    detector = new GrimoireDetector(mockMapper);
  });

  // Helper function to create mock events
  const createMockEvent = (
    type: string,
    timestamp: number,
    sourceID: number,
    abilityGameID: number,
  ): ParsedLogEvent =>
    ({
      type,
      timestamp,
      sourceID,
      targetID: 999,
      abilityGameID,
      fight: 1,
      sourceName: `Player ${sourceID}`,
      targetName: 'Target',
      sourceIsFriendly: true,
      targetIsFriendly: false,
    }) as ParsedLogEvent;

  // Helper function to create mock scribing components
  const createMockGrimoireComponent = (
    abilityId: number,
    grimoireKey: string,
    name: string,
  ): AbilityScribingMapping => ({
    abilityId,
    type: 'grimoire',
    grimoireKey,
    componentKey: grimoireKey,
    name,
    category: 'assault',
    description: `${name} grimoire`,
  });

  const createMockTransformationComponent = (
    abilityId: number,
    grimoireKey: string,
    componentKey: string,
    name: string,
  ): AbilityScribingMapping => ({
    abilityId,
    type: 'transformation',
    grimoireKey,
    componentKey,
    name,
    category: 'focus',
    description: `${name} transformation`,
  });

  describe('detectGrimoiresFromEvents', () => {
    it('should process multiple events and return comprehensive result', async () => {
      const events = [
        createMockEvent('cast', 1000, 1, 12345),
        createMockEvent('cast', 2000, 1, 12346),
        createMockEvent('cast', 3000, 2, 12345),
        createMockEvent('damage', 4000, 1, 12345), // Should be filtered out
      ];

      // Mock responses for different ability IDs
      mockMapper.getScribingComponent
        .mockReturnValueOnce([createMockGrimoireComponent(12345, 'trample', 'Trample')])
        .mockReturnValueOnce([
          createMockTransformationComponent(12346, 'wield-soul', 'physical', 'Physical Soul'),
        ])
        .mockReturnValueOnce([createMockGrimoireComponent(12345, 'trample', 'Trample')]);

      const result = await detector.detectGrimoiresFromEvents(events);

      expect(result).toEqual({
        detections: expect.arrayContaining([
          expect.objectContaining({
            grimoireKey: 'trample',
            detectionType: 'base-cast',
            sourcePlayer: 1,
          }),
          expect.objectContaining({
            grimoireKey: 'wield-soul',
            detectionType: 'transformation-cast',
            sourcePlayer: 1,
          }),
          expect.objectContaining({
            grimoireKey: 'trample',
            detectionType: 'base-cast',
            sourcePlayer: 2,
          }),
        ]),
        totalCasts: 3, // Only cast events counted
        uniqueGrimoires: new Set(['trample', 'wield-soul']),
        playerGrimoires: new Map([
          [1, new Set(['trample', 'wield-soul'])],
          [2, new Set(['trample'])],
        ]),
        confidence: expect.any(Number),
        processingTime: expect.any(Number),
        errors: [],
        warnings: [],
      });

      expect(result.detections).toHaveLength(3);
      expect(result.uniqueGrimoires.size).toBe(2);
      expect(result.playerGrimoires.size).toBe(2);
    });

    it('should handle empty events array', async () => {
      const result = await detector.detectGrimoiresFromEvents([]);

      expect(result).toEqual({
        detections: [],
        totalCasts: 0,
        uniqueGrimoires: new Set(),
        playerGrimoires: new Map(),
        confidence: 0.5, // Base confidence
        processingTime: expect.any(Number),
        errors: [],
        warnings: [],
      });
    });

    it('should handle events with no scribing abilities', async () => {
      const events = [
        createMockEvent('cast', 1000, 1, 99999),
        createMockEvent('cast', 2000, 1, 99998),
      ];

      mockMapper.getScribingComponent.mockReturnValue([]).mockReturnValue([]);

      const result = await detector.detectGrimoiresFromEvents(events);

      expect(result.detections).toHaveLength(0);
      expect(result.totalCasts).toBe(2);
      expect(result.confidence).toBe(0.5); // Base confidence due to no detections
    });

    it('should calculate confidence based on detection rate', async () => {
      // Test different detection rates and corresponding confidence levels
      const events = [
        createMockEvent('cast', 1000, 1, 12345),
        createMockEvent('cast', 2000, 1, 99999), // Non-scribing
        createMockEvent('cast', 3000, 1, 99998), // Non-scribing
      ];

      mockMapper.getScribingComponent
        .mockReturnValueOnce([createMockGrimoireComponent(12345, 'trample', 'Trample')])
        .mockReturnValue([])
        .mockReturnValue([]);

      const result = await detector.detectGrimoiresFromEvents(events);

      // Detection rate: 1/3 = 0.33, should give confidence > 0.9
      expect(result.confidence).toBe(0.9);
    });

    it('should handle processing errors gracefully', async () => {
      const events = [
        createMockEvent('cast', 1000, 1, 12345),
        createMockEvent('cast', 2000, 1, 12346),
      ];

      mockMapper.getScribingComponent
        .mockReturnValueOnce([createMockGrimoireComponent(12345, 'trample', 'Trample')])
        .mockImplementationOnce(() => {
          throw new Error('Processing error');
        });

      const result = await detector.detectGrimoiresFromEvents(events);

      expect(result.detections).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Error processing event at 2000');
    });

    it('should filter out invalid events', async () => {
      const events = [
        createMockEvent('cast', 1000, 1, 12345),
        null as any, // Invalid event
        undefined as any, // Invalid event
        createMockEvent('cast', 2000, 1, 12346),
      ];

      mockMapper.getScribingComponent
        .mockReturnValue([createMockGrimoireComponent(12345, 'trample', 'Trample')])
        .mockReturnValue([createMockGrimoireComponent(12346, 'wield-soul', 'Wield Soul')]);

      const result = await detector.detectGrimoiresFromEvents(events);

      expect(result.totalCasts).toBe(2); // Only valid cast events counted
      expect(result.detections).toHaveLength(2);
    });
  });

  describe('detectGrimoiresForPlayer', () => {
    it('should filter events by player ID', async () => {
      const events = [
        createMockEvent('cast', 1000, 1, 12345),
        createMockEvent('cast', 2000, 2, 12346), // Different player
        createMockEvent('cast', 3000, 1, 12347),
      ];

      mockMapper.getScribingComponent
        .mockReturnValue([createMockGrimoireComponent(12345, 'trample', 'Trample')])
        .mockReturnValue([createMockGrimoireComponent(12347, 'wield-soul', 'Wield Soul')]);

      const result = await detector.detectGrimoiresForPlayer(events, 1);

      expect(result.detections).toHaveLength(2);
      expect(result.detections.every((d) => d.sourcePlayer === 1)).toBe(true);
      expect(result.totalCasts).toBe(2);
    });

    it('should return empty result when player has no events', async () => {
      const events = [
        createMockEvent('cast', 1000, 1, 12345),
        createMockEvent('cast', 2000, 2, 12346),
      ];

      const result = await detector.detectGrimoiresForPlayer(events, 999);

      expect(result.detections).toHaveLength(0);
      expect(result.totalCasts).toBe(0);
    });
  });

  describe('getGrimoireTimeline', () => {
    it('should sort detections by timestamp', () => {
      const detections: GrimoireDetection[] = [
        {
          grimoireKey: 'trample',
          grimoireName: 'Trample',
          grimoireId: 12345,
          detectedAbilityId: 12345,
          detectionType: 'base-cast',
          confidence: 0.95,
          timestamp: 3000,
          sourcePlayer: 1,
          event: createMockEvent('cast', 3000, 1, 12345),
        },
        {
          grimoireKey: 'wield-soul',
          grimoireName: 'Wield Soul',
          grimoireId: 12346,
          detectedAbilityId: 12346,
          detectionType: 'base-cast',
          confidence: 0.95,
          timestamp: 1000,
          sourcePlayer: 1,
          event: createMockEvent('cast', 1000, 1, 12346),
        },
        {
          grimoireKey: 'banner',
          grimoireName: 'Banner',
          grimoireId: 12347,
          detectedAbilityId: 12347,
          detectionType: 'base-cast',
          confidence: 0.95,
          timestamp: 2000,
          sourcePlayer: 1,
          event: createMockEvent('cast', 2000, 1, 12347),
        },
      ];

      const timeline = detector.getGrimoireTimeline(detections);

      expect(timeline).toHaveLength(3);
      expect(timeline[0].timestamp).toBe(1000);
      expect(timeline[1].timestamp).toBe(2000);
      expect(timeline[2].timestamp).toBe(3000);
    });

    it('should not modify original array', () => {
      const detections: GrimoireDetection[] = [
        {
          grimoireKey: 'trample',
          grimoireName: 'Trample',
          grimoireId: 12345,
          detectedAbilityId: 12345,
          detectionType: 'base-cast',
          confidence: 0.95,
          timestamp: 3000,
          sourcePlayer: 1,
          event: createMockEvent('cast', 3000, 1, 12345),
        },
        {
          grimoireKey: 'wield-soul',
          grimoireName: 'Wield Soul',
          grimoireId: 12346,
          detectedAbilityId: 12346,
          detectionType: 'base-cast',
          confidence: 0.95,
          timestamp: 1000,
          sourcePlayer: 1,
          event: createMockEvent('cast', 1000, 1, 12346),
        },
      ];

      const originalOrder = [...detections];
      const timeline = detector.getGrimoireTimeline(detections);

      expect(detections).toEqual(originalOrder); // Original unchanged
      expect(timeline).not.toBe(detections); // Different array
    });

    it('should handle empty detections array', () => {
      const timeline = detector.getGrimoireTimeline([]);
      expect(timeline).toEqual([]);
    });
  });

  describe('groupDetectionsByPlayer', () => {
    it('should group detections by player ID', () => {
      const detections: GrimoireDetection[] = [
        {
          grimoireKey: 'trample',
          grimoireName: 'Trample',
          grimoireId: 12345,
          detectedAbilityId: 12345,
          detectionType: 'base-cast',
          confidence: 0.95,
          timestamp: 1000,
          sourcePlayer: 1,
          event: createMockEvent('cast', 1000, 1, 12345),
        },
        {
          grimoireKey: 'wield-soul',
          grimoireName: 'Wield Soul',
          grimoireId: 12346,
          detectedAbilityId: 12346,
          detectionType: 'base-cast',
          confidence: 0.95,
          timestamp: 2000,
          sourcePlayer: 2,
          event: createMockEvent('cast', 2000, 2, 12346),
        },
        {
          grimoireKey: 'banner',
          grimoireName: 'Banner',
          grimoireId: 12347,
          detectedAbilityId: 12347,
          detectionType: 'base-cast',
          confidence: 0.95,
          timestamp: 3000,
          sourcePlayer: 1,
          event: createMockEvent('cast', 3000, 1, 12347),
        },
      ];

      const grouped = detector.groupDetectionsByPlayer(detections);

      expect(grouped.size).toBe(2);
      expect(grouped.get(1)).toHaveLength(2);
      expect(grouped.get(2)).toHaveLength(1);
      expect(grouped.get(1)![0].grimoireKey).toBe('trample');
      expect(grouped.get(1)![1].grimoireKey).toBe('banner');
      expect(grouped.get(2)![0].grimoireKey).toBe('wield-soul');
    });

    it('should handle empty detections array', () => {
      const grouped = detector.groupDetectionsByPlayer([]);
      expect(grouped.size).toBe(0);
    });

    it('should handle single player with multiple detections', () => {
      const detections: GrimoireDetection[] = [
        {
          grimoireKey: 'trample',
          grimoireName: 'Trample',
          grimoireId: 12345,
          detectedAbilityId: 12345,
          detectionType: 'base-cast',
          confidence: 0.95,
          timestamp: 1000,
          sourcePlayer: 1,
          event: createMockEvent('cast', 1000, 1, 12345),
        },
        {
          grimoireKey: 'wield-soul',
          grimoireName: 'Wield Soul',
          grimoireId: 12346,
          detectedAbilityId: 12346,
          detectionType: 'base-cast',
          confidence: 0.95,
          timestamp: 2000,
          sourcePlayer: 1,
          event: createMockEvent('cast', 2000, 1, 12346),
        },
      ];

      const grouped = detector.groupDetectionsByPlayer(detections);

      expect(grouped.size).toBe(1);
      expect(grouped.get(1)).toHaveLength(2);
    });
  });

  describe('findScribingRotations', () => {
    it('should find rotations within time window', () => {
      const detections: GrimoireDetection[] = [
        {
          grimoireKey: 'trample',
          grimoireName: 'Trample',
          grimoireId: 12345,
          detectedAbilityId: 12345,
          detectionType: 'base-cast',
          confidence: 0.95,
          timestamp: 1000,
          sourcePlayer: 1,
          event: createMockEvent('cast', 1000, 1, 12345),
        },
        {
          grimoireKey: 'wield-soul',
          grimoireName: 'Wield Soul',
          grimoireId: 12346,
          detectedAbilityId: 12346,
          detectionType: 'base-cast',
          confidence: 0.95,
          timestamp: 5000, // Within 10s window
          sourcePlayer: 1,
          event: createMockEvent('cast', 5000, 1, 12346),
        },
        {
          grimoireKey: 'banner',
          grimoireName: 'Banner',
          grimoireId: 12347,
          detectedAbilityId: 12347,
          detectionType: 'base-cast',
          confidence: 0.95,
          timestamp: 15000, // Outside 10s window, new rotation
          sourcePlayer: 1,
          event: createMockEvent('cast', 15000, 1, 12347),
        },
        {
          grimoireKey: 'trample',
          grimoireName: 'Trample',
          grimoireId: 12345,
          detectedAbilityId: 12345,
          detectionType: 'base-cast',
          confidence: 0.95,
          timestamp: 20000, // Within 10s of previous
          sourcePlayer: 1,
          event: createMockEvent('cast', 20000, 1, 12345),
        },
      ];

      const rotations = detector.findScribingRotations(detections, 1, 10000);

      expect(rotations).toHaveLength(1); // Only one rotation with all 4 detections
      expect(rotations[0]).toHaveLength(4); // All detections are within 10s of each other when considering the chain
      expect(rotations[0][0].grimoireKey).toBe('trample');
      expect(rotations[0][1].grimoireKey).toBe('wield-soul');
      expect(rotations[0][2].grimoireKey).toBe('banner');
      expect(rotations[0][3].grimoireKey).toBe('trample');
    });

    it('should filter by player ID', () => {
      const detections: GrimoireDetection[] = [
        {
          grimoireKey: 'trample',
          grimoireName: 'Trample',
          grimoireId: 12345,
          detectedAbilityId: 12345,
          detectionType: 'base-cast',
          confidence: 0.95,
          timestamp: 1000,
          sourcePlayer: 1,
          event: createMockEvent('cast', 1000, 1, 12345),
        },
        {
          grimoireKey: 'wield-soul',
          grimoireName: 'Wield Soul',
          grimoireId: 12346,
          detectedAbilityId: 12346,
          detectionType: 'base-cast',
          confidence: 0.95,
          timestamp: 2000,
          sourcePlayer: 2, // Different player
          event: createMockEvent('cast', 2000, 2, 12346),
        },
      ];

      const rotations = detector.findScribingRotations(detections, 1, 10000);

      expect(rotations).toHaveLength(0); // No rotation with multiple skills for player 1
    });

    it('should ignore single-skill rotations', () => {
      const detections: GrimoireDetection[] = [
        {
          grimoireKey: 'trample',
          grimoireName: 'Trample',
          grimoireId: 12345,
          detectedAbilityId: 12345,
          detectionType: 'base-cast',
          confidence: 0.95,
          timestamp: 1000,
          sourcePlayer: 1,
          event: createMockEvent('cast', 1000, 1, 12345),
        },
        {
          grimoireKey: 'wield-soul',
          grimoireName: 'Wield Soul',
          grimoireId: 12346,
          detectedAbilityId: 12346,
          detectionType: 'base-cast',
          confidence: 0.95,
          timestamp: 15000, // Outside window
          sourcePlayer: 1,
          event: createMockEvent('cast', 15000, 1, 12346),
        },
      ];

      const rotations = detector.findScribingRotations(detections, 1, 10000);

      expect(rotations).toHaveLength(0); // Each detection is a single-skill rotation, ignored
    });

    it('should handle empty detections array', () => {
      const rotations = detector.findScribingRotations([], 1, 10000);
      expect(rotations).toEqual([]);
    });

    it('should use custom time window', () => {
      const detections: GrimoireDetection[] = [
        {
          grimoireKey: 'trample',
          grimoireName: 'Trample',
          grimoireId: 12345,
          detectedAbilityId: 12345,
          detectionType: 'base-cast',
          confidence: 0.95,
          timestamp: 1000,
          sourcePlayer: 1,
          event: createMockEvent('cast', 1000, 1, 12345),
        },
        {
          grimoireKey: 'wield-soul',
          grimoireName: 'Wield Soul',
          grimoireId: 12346,
          detectedAbilityId: 12346,
          detectionType: 'base-cast',
          confidence: 0.95,
          timestamp: 4000, // Within 5s window
          sourcePlayer: 1,
          event: createMockEvent('cast', 4000, 1, 12346),
        },
        {
          grimoireKey: 'banner',
          grimoireName: 'Banner',
          grimoireId: 12347,
          detectedAbilityId: 12347,
          detectionType: 'base-cast',
          confidence: 0.95,
          timestamp: 10000, // Outside 5s window
          sourcePlayer: 1,
          event: createMockEvent('cast', 10000, 1, 12347),
        },
      ];

      const rotations = detector.findScribingRotations(detections, 1, 5000);

      expect(rotations).toHaveLength(1);
      expect(rotations[0]).toHaveLength(2);
    });
  });

  describe('enhanceDetectionsWithContext', () => {
    it('should add supporting events within context window', () => {
      const detections: GrimoireDetection[] = [
        {
          grimoireKey: 'trample',
          grimoireName: 'Trample',
          grimoireId: 12345,
          detectedAbilityId: 12345,
          detectionType: 'base-cast',
          confidence: 0.95,
          timestamp: 5000,
          sourcePlayer: 1,
          event: createMockEvent('cast', 5000, 1, 12345),
        },
      ];

      const allEvents = [
        createMockEvent('damage', 4000, 1, 99999), // Within 3s window
        createMockEvent('cast', 5000, 1, 12345), // The detection event itself
        createMockEvent('heal', 6000, 1, 99998), // Within 3s window
        createMockEvent('damage', 10000, 1, 99997), // Outside 3s window
        createMockEvent('cast', 4500, 2, 99996), // Different player
      ];

      const enhanced = detector.enhanceDetectionsWithContext(detections, allEvents, 3000);

      expect(enhanced).toHaveLength(1);
      expect(enhanced[0].supportingEvents).toBeDefined();
      expect(enhanced[0].supportingEvents).toHaveLength(2); // Only events within window and same player
      expect(enhanced[0].supportingEvents![0].type).toBe('damage');
      expect(enhanced[0].supportingEvents![1].type).toBe('heal');
    });

    it('should limit supporting events to prevent excessive data', () => {
      const detections: GrimoireDetection[] = [
        {
          grimoireKey: 'trample',
          grimoireName: 'Trample',
          grimoireId: 12345,
          detectedAbilityId: 12345,
          detectionType: 'base-cast',
          confidence: 0.95,
          timestamp: 5000,
          sourcePlayer: 1,
          event: createMockEvent('cast', 5000, 1, 12345),
        },
      ];

      // Create 25 events within context window
      const allEvents = Array.from({ length: 25 }, (_, i) =>
        createMockEvent('damage', 5000 + i * 100, 1, 99999 + i),
      );
      allEvents.push(createMockEvent('cast', 5000, 1, 12345)); // The detection event

      const enhanced = detector.enhanceDetectionsWithContext(detections, allEvents, 3000);

      expect(enhanced[0].supportingEvents).toHaveLength(20); // Limited to 20
    });

    it('should exclude the detection event itself from supporting events', () => {
      const detections: GrimoireDetection[] = [
        {
          grimoireKey: 'trample',
          grimoireName: 'Trample',
          grimoireId: 12345,
          detectedAbilityId: 12345,
          detectionType: 'base-cast',
          confidence: 0.95,
          timestamp: 5000,
          sourcePlayer: 1,
          event: createMockEvent('cast', 5000, 1, 12345),
        },
      ];

      const allEvents = [
        createMockEvent('cast', 5000, 1, 12345), // The detection event
        createMockEvent('damage', 5100, 1, 99999),
      ];

      const enhanced = detector.enhanceDetectionsWithContext(detections, allEvents, 3000);

      expect(enhanced[0].supportingEvents).toHaveLength(1);
      expect(enhanced[0].supportingEvents![0].type).toBe('damage');
    });

    it('should handle empty supporting events', () => {
      const detections: GrimoireDetection[] = [
        {
          grimoireKey: 'trample',
          grimoireName: 'Trample',
          grimoireId: 12345,
          detectedAbilityId: 12345,
          detectionType: 'base-cast',
          confidence: 0.95,
          timestamp: 5000,
          sourcePlayer: 1,
          event: createMockEvent('cast', 5000, 1, 12345),
        },
      ];

      const allEvents = [
        createMockEvent('cast', 5000, 1, 12345), // Only the detection event
      ];

      const enhanced = detector.enhanceDetectionsWithContext(detections, allEvents, 3000);

      expect(enhanced[0].supportingEvents).toHaveLength(0);
    });
  });

  describe('validateDetections', () => {
    const createTestDetection = (confidence: number, hasSupport = false): GrimoireDetection => ({
      grimoireKey: 'trample',
      grimoireName: 'Trample',
      grimoireId: 12345,
      detectedAbilityId: 12345,
      detectionType: 'base-cast',
      confidence,
      timestamp: 1000,
      sourcePlayer: 1,
      event: createMockEvent('cast', 1000, 1, 12345),
      supportingEvents: hasSupport ? [createMockEvent('damage', 1100, 1, 99999)] : undefined,
    });

    it('should classify detections by confidence levels', () => {
      const detections = [
        createTestDetection(0.95), // Valid
        createTestDetection(0.85), // Questionable
        createTestDetection(0.65), // Invalid (no support)
        createTestDetection(0.6, true), // Questionable (has support)
      ];

      const validation = detector.validateDetections(detections);

      expect(validation.valid).toHaveLength(1);
      expect(validation.questionable).toHaveLength(2);
      expect(validation.invalid).toHaveLength(1);
      expect(validation.validationErrors).toHaveLength(0);

      expect(validation.valid[0].confidence).toBe(0.95);
      expect(validation.questionable[0].confidence).toBe(0.85);
      expect(validation.questionable[1].confidence).toBe(0.6);
      expect(validation.invalid[0].confidence).toBe(0.65);
    });

    it('should handle validation errors gracefully', () => {
      const baseDetection = createTestDetection(0.95);

      // Create a detection that causes an error during validation
      const problematicDetection = new Proxy(baseDetection, {
        get(target, prop) {
          if (prop === 'confidence') {
            throw new Error('Property access error');
          }
          return target[prop as keyof GrimoireDetection];
        },
      });

      const detections = [problematicDetection];
      const validation = detector.validateDetections(detections);

      expect(validation.validationErrors).toHaveLength(1);
      expect(validation.invalid).toHaveLength(1);
      expect(validation.validationErrors[0]).toContain('Validation error for detection at');
      expect(validation.validationErrors[0]).toContain('Property access error');
    });

    it('should handle empty detections array', () => {
      const validation = detector.validateDetections([]);

      expect(validation.valid).toEqual([]);
      expect(validation.questionable).toEqual([]);
      expect(validation.invalid).toEqual([]);
      expect(validation.validationErrors).toEqual([]);
    });
  });

  describe('getDetectionStatistics', () => {
    it('should calculate comprehensive statistics', () => {
      const detectionResult: GrimoireDetectionResult = {
        detections: [
          {
            grimoireKey: 'trample',
            grimoireName: 'Trample',
            grimoireId: 12345,
            detectedAbilityId: 12345,
            detectionType: 'base-cast',
            confidence: 0.95,
            timestamp: 1000,
            sourcePlayer: 1,
            event: createMockEvent('cast', 1000, 1, 12345),
          },
          {
            grimoireKey: 'trample',
            grimoireName: 'Trample',
            grimoireId: 12345,
            detectedAbilityId: 12345,
            detectionType: 'transformation-cast',
            confidence: 0.85,
            timestamp: 2000,
            sourcePlayer: 2,
            event: createMockEvent('cast', 2000, 2, 12345),
          },
          {
            grimoireKey: 'wield-soul',
            grimoireName: 'Wield Soul',
            grimoireId: 12346,
            detectedAbilityId: 12346,
            detectionType: 'base-cast',
            confidence: 0.9,
            timestamp: 3000,
            sourcePlayer: 1,
            event: createMockEvent('cast', 3000, 1, 12346),
          },
        ],
        totalCasts: 10,
        uniqueGrimoires: new Set(['trample', 'wield-soul']),
        playerGrimoires: new Map([
          [1, new Set(['trample', 'wield-soul'])],
          [2, new Set(['trample'])],
        ]),
        confidence: 0.8,
        processingTime: 100,
        errors: [],
        warnings: [],
      };

      const stats = detector.getDetectionStatistics(detectionResult);

      expect(stats).toEqual({
        totalDetections: 3,
        uniqueGrimoires: 2,
        uniquePlayers: 2,
        averageConfidence: (0.95 + 0.85 + 0.9) / 3,
        detectionsByGrimoire: new Map([
          ['trample', 2],
          ['wield-soul', 1],
        ]),
        detectionsByPlayer: new Map([
          [1, 2],
          [2, 1],
        ]),
        detectionTypes: new Map([
          ['base-cast', 2],
          ['transformation-cast', 1],
        ]),
      });
    });

    it('should handle empty detections', () => {
      const detectionResult: GrimoireDetectionResult = {
        detections: [],
        totalCasts: 0,
        uniqueGrimoires: new Set(),
        playerGrimoires: new Map(),
        confidence: 0.5,
        processingTime: 10,
        errors: [],
        warnings: [],
      };

      const stats = detector.getDetectionStatistics(detectionResult);

      expect(stats).toEqual({
        totalDetections: 0,
        uniqueGrimoires: 0,
        uniquePlayers: 0,
        averageConfidence: 0,
        detectionsByGrimoire: new Map(),
        detectionsByPlayer: new Map(),
        detectionTypes: new Map(),
      });
    });
  });

  describe('Singleton instance', () => {
    it('should export singleton grimoireDetector', () => {
      const { grimoireDetector } = require('./grimoire-detector');
      expect(grimoireDetector).toBeInstanceOf(GrimoireDetector);
    });
  });
});
