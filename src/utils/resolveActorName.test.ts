/**
 * Tests for resolveActorName utility
 * Tests actor name resolution with various fallback scenarios
 */

import { resolveActorName } from './resolveActorName';
import { ReportActor, ReportActorFragment } from '../graphql/gql/graphql';

// Create mock actors for testing
const createMockActor = (
  displayName?: string,
  name?: string,
): Partial<ReportActor | ReportActorFragment> => ({
  displayName,
  name,
});

describe('resolveActorName', () => {
  describe('actor with valid data', () => {
    it('should return displayName when available and not "nil"', () => {
      const actor = createMockActor('PlayerDisplayName', 'PlayerName');
      const result = resolveActorName(actor as ReportActor);
      expect(result).toBe('PlayerDisplayName');
    });

    it('should return name when displayName is undefined', () => {
      const actor = createMockActor(undefined, 'PlayerName');
      const result = resolveActorName(actor as ReportActor);
      expect(result).toBe('PlayerName');
    });

    it('should return name when displayName is "nil"', () => {
      const actor = createMockActor('nil', 'PlayerName');
      const result = resolveActorName(actor as ReportActor);
      expect(result).toBe('PlayerName');
    });

    it('should prefer displayName over name when both are available', () => {
      const actor = createMockActor('PlayerDisplayName', 'PlayerName');
      const result = resolveActorName(actor as ReportActor);
      expect(result).toBe('PlayerDisplayName');
    });
  });

  describe('fallback scenarios', () => {
    it('should use fallbackName when actor has no valid names', () => {
      const actor = createMockActor('nil', undefined);
      const result = resolveActorName(actor as ReportActor, 123, 'FallbackName');
      expect(result).toBe('FallbackName');
    });

    it('should use fallbackId as string when no names or fallbackName available', () => {
      const actor = createMockActor('nil', undefined);
      const result = resolveActorName(actor as ReportActor, 123);
      expect(result).toBe('123');
    });

    it('should convert numeric fallbackId to string', () => {
      const actor = createMockActor(undefined, undefined);
      const result = resolveActorName(actor as ReportActor, 456);
      expect(result).toBe('456');
    });

    it('should use string fallbackId as-is', () => {
      const actor = createMockActor(undefined, undefined);
      const result = resolveActorName(actor as ReportActor, 'string-id');
      expect(result).toBe('string-id');
    });

    it('should return "Unknown" when all fallbacks are unavailable', () => {
      const actor = createMockActor(undefined, undefined);
      const result = resolveActorName(actor as ReportActor);
      expect(result).toBe('Unknown');
    });

    it('should handle null fallbackId', () => {
      const actor = createMockActor(undefined, undefined);
      const result = resolveActorName(actor as ReportActor, null, 'FallbackName');
      expect(result).toBe('FallbackName');
    });

    it('should handle null fallbackName', () => {
      const actor = createMockActor(undefined, undefined);
      const result = resolveActorName(actor as ReportActor, 123, null);
      expect(result).toBe('123');
    });
  });

  describe('undefined/null actor handling', () => {
    it('should use fallbackName when actor is undefined', () => {
      const result = resolveActorName(undefined, 123, 'FallbackName');
      expect(result).toBe('FallbackName');
    });

    it('should use fallbackId when actor is undefined and no fallbackName', () => {
      const result = resolveActorName(undefined, 123);
      expect(result).toBe('123');
    });

    it('should return "Unknown" when actor is undefined and no fallbacks', () => {
      const result = resolveActorName(undefined);
      expect(result).toBe('Unknown');
    });

    it('should handle all parameters as undefined/null', () => {
      const result = resolveActorName(undefined, null, null);
      expect(result).toBe('Unknown');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string displayName', () => {
      const actor = createMockActor('', 'PlayerName');
      const result = resolveActorName(actor as ReportActor);
      expect(result).toBe(''); // Empty string is truthy, so it gets returned
    });

    it('should handle empty string name', () => {
      const actor = createMockActor('PlayerDisplayName', '');
      const result = resolveActorName(actor as ReportActor);
      expect(result).toBe('PlayerDisplayName');
    });

    it('should handle both names as empty strings', () => {
      const actor = createMockActor('', '');
      const result = resolveActorName(actor as ReportActor, 123, 'FallbackName');
      expect(result).toBe(''); // Empty string displayName is truthy, so it gets returned
    });

    it('should handle zero as fallbackId', () => {
      const actor = createMockActor(undefined, undefined);
      const result = resolveActorName(actor as ReportActor, 0);
      expect(result).toBe('0');
    });

    it('should handle empty string as fallbackId', () => {
      const actor = createMockActor(undefined, undefined);
      const result = resolveActorName(actor as ReportActor, '', 'FallbackName');
      expect(result).toBe('FallbackName');
    });

    it('should handle empty string as fallbackName', () => {
      const actor = createMockActor(undefined, undefined);
      const result = resolveActorName(actor as ReportActor, 123, '');
      expect(result).toBe(''); // Empty string fallbackName is truthy, so it gets returned
    });
  });

  describe('priority order', () => {
    it('should prioritize displayName > name > fallbackName > fallbackId > "Unknown"', () => {
      // Test each step of the priority chain
      const allProvided = createMockActor('DisplayName', 'Name');
      expect(resolveActorName(allProvided as ReportActor, 123, 'Fallback')).toBe('DisplayName');

      const nameOnly = createMockActor('nil', 'Name');
      expect(resolveActorName(nameOnly as ReportActor, 123, 'Fallback')).toBe('Name');

      const fallbackNameOnly = createMockActor('nil', undefined);
      expect(resolveActorName(fallbackNameOnly as ReportActor, 123, 'Fallback')).toBe('Fallback');

      const fallbackIdOnly = createMockActor('nil', undefined);
      expect(resolveActorName(fallbackIdOnly as ReportActor, 123)).toBe('123');

      const noneProvided = createMockActor('nil', undefined);
      expect(resolveActorName(noneProvided as ReportActor)).toBe('Unknown');
    });
  });
});
