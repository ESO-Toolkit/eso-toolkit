/**
 * Tests for playerTypes
 * Comprehensive test coverage for player-related types and interfaces
 */

import { BasePlayerInfo, ExtendedPlayerInfo } from './playerTypes';

describe('playerTypes', () => {
  describe('BasePlayerInfo interface', () => {
    it('should be assignable with required properties', () => {
      const basePlayerInfo: BasePlayerInfo = {
        name: 'TestPlayer',
        displayName: 'Test Player',
        id: 12345,
        combatantInfo: {
          talents: [],
          gear: [],
        },
      };

      expect(basePlayerInfo.name).toBe('TestPlayer');
      expect(basePlayerInfo.displayName).toBe('Test Player');
      expect(basePlayerInfo.id).toBe(12345);
      expect(basePlayerInfo.combatantInfo).toBeDefined();
    });

    it('should work with minimal data', () => {
      const minimalPlayer: BasePlayerInfo = {
        name: '',
        displayName: '',
        id: 0,
        combatantInfo: {},
      };

      expect(minimalPlayer).toBeDefined();
      expect(typeof minimalPlayer.name).toBe('string');
      expect(typeof minimalPlayer.displayName).toBe('string');
      expect(typeof minimalPlayer.id).toBe('number');
      expect(typeof minimalPlayer.combatantInfo).toBe('object');
    });

    it('should accept string or number for id', () => {
      const playerWithStringId: BasePlayerInfo = {
        name: 'StringIdPlayer',
        displayName: 'String ID Player',
        id: 'player-123',
        combatantInfo: {},
      };

      const playerWithNumberId: BasePlayerInfo = {
        name: 'NumberIdPlayer',
        displayName: 'Number ID Player',
        id: 12345,
        combatantInfo: {},
      };

      expect(typeof playerWithStringId.id).toBe('string');
      expect(typeof playerWithNumberId.id).toBe('number');
    });

    it('should handle optional talents and gear in combatantInfo', () => {
      const playerWithOptionalProps: BasePlayerInfo = {
        name: 'OptionalPlayer',
        displayName: 'Optional Player',
        id: 999,
        combatantInfo: {
          talents: undefined,
          gear: undefined,
        },
      };

      expect(playerWithOptionalProps.combatantInfo.talents).toBeUndefined();
      expect(playerWithOptionalProps.combatantInfo.gear).toBeUndefined();
    });
  });

  describe('ExtendedPlayerInfo interface', () => {
    it('should extend BasePlayerInfo with additional properties', () => {
      const extendedPlayerInfo: ExtendedPlayerInfo = {
        // BasePlayerInfo properties
        name: 'TestPlayer',
        displayName: 'Test Player',
        id: 12345,
        combatantInfo: {
          talents: [],
          gear: [],
        },
        // Extended properties
        level: 50,
        class: 'Sorcerer',
        alliance: 'Aldmeri Dominion',
      };

      // Should have all base properties
      expect(extendedPlayerInfo.name).toBe('TestPlayer');
      expect(extendedPlayerInfo.displayName).toBe('Test Player');
      expect(extendedPlayerInfo.id).toBe(12345);
      expect(extendedPlayerInfo.combatantInfo).toBeDefined();

      // Should have extended properties
      expect(extendedPlayerInfo.level).toBe(50);
      expect(extendedPlayerInfo.class).toBe('Sorcerer');
      expect(extendedPlayerInfo.alliance).toBe('Aldmeri Dominion');
    });

    it('should be assignable to BasePlayerInfo', () => {
      const extendedPlayer: ExtendedPlayerInfo = {
        name: 'TestPlayer',
        displayName: 'Test Player',
        id: 12345,
        combatantInfo: {},
        level: 50,
        class: 'Templar',
        alliance: 'Daggerfall Covenant',
      };

      // Should be assignable to base type
      const basePlayer: BasePlayerInfo = extendedPlayer;
      expect(basePlayer.name).toBe('TestPlayer');
      expect(basePlayer.id).toBe(12345);
    });

    it('should handle various types of additional properties', () => {
      const partialExtended: ExtendedPlayerInfo = {
        name: 'TestPlayer',
        displayName: 'Test Player',
        id: 12345,
        combatantInfo: {},
        level: 25,
        class: 'Nightblade',
        alliance: 'Ebonheart Pact',
        isActive: true,
        lastSeen: null,
        metadata: { role: 'dps', experience: 'veteran' },
      };

      expect(partialExtended.level).toBe(25);
      expect(partialExtended.class).toBe('Nightblade');
      expect(partialExtended.alliance).toBe('Ebonheart Pact');
      expect(partialExtended.isActive).toBe(true);
      expect(partialExtended.lastSeen).toBeNull();
      expect(partialExtended.metadata).toEqual({ role: 'dps', experience: 'veteran' });
    });
  });

  describe('type compatibility', () => {
    it('should maintain type safety with property access', () => {
      const player: ExtendedPlayerInfo = {
        name: 'TypeSafePlayer',
        displayName: 'Type Safe Player',
        id: 99999,
        combatantInfo: {
          talents: [],
          gear: [],
        },
        level: 160,
        class: 'Dragonknight',
        alliance: 'Aldmeri Dominion',
      };

      // Type-safe property access
      const playerName: string = player.name;
      const playerId: string | number = player.id;
      const playerLevel = player.level; // Can be any type due to index signature
      const playerClass = player.class; // Can be any type due to index signature

      expect(typeof playerName).toBe('string');
      expect(typeof playerId).toBe('number');
      expect(playerLevel).toBe(160);
      expect(playerClass).toBe('Dragonknight');
    });

    it('should work with arrays of players', () => {
      const players: BasePlayerInfo[] = [
        {
          name: 'Player1',
          displayName: 'Player One',
          id: 1,
          combatantInfo: {},
        },
        {
          name: 'Player2',
          displayName: 'Player Two',
          id: 2,
          combatantInfo: {},
        },
      ];

      expect(players).toHaveLength(2);
      expect(players[0].name).toBe('Player1');
      expect(players[1].name).toBe('Player2');
    });

    it('should work with arrays of extended players', () => {
      const extendedPlayers: ExtendedPlayerInfo[] = [
        {
          name: 'Player1',
          displayName: 'Player One',
          id: 1,
          combatantInfo: {},
          level: 50,
          class: 'Sorcerer',
          alliance: 'Aldmeri Dominion',
        },
        {
          name: 'Player2',
          displayName: 'Player Two',
          id: 2,
          combatantInfo: {},
          level: 45,
          class: 'Templar',
          alliance: 'Daggerfall Covenant',
        },
      ];

      expect(extendedPlayers).toHaveLength(2);
      expect(extendedPlayers[0].level).toBe(50);
      expect(extendedPlayers[1].level).toBe(45);
    });
  });

  describe('edge cases', () => {
    it('should handle empty strings and zero values', () => {
      const edgeCasePlayer: BasePlayerInfo = {
        name: '',
        displayName: '',
        id: 0,
        combatantInfo: {},
      };

      expect(edgeCasePlayer.name).toBe('');
      expect(edgeCasePlayer.displayName).toBe('');
      expect(edgeCasePlayer.id).toBe(0);
      expect(edgeCasePlayer.combatantInfo).toEqual({});
    });

    it('should handle large ID values', () => {
      const largeIdPlayer: BasePlayerInfo = {
        name: 'LargeIdPlayer',
        displayName: 'Large ID Player',
        id: Number.MAX_SAFE_INTEGER,
        combatantInfo: {},
      };

      expect(largeIdPlayer.id).toBe(Number.MAX_SAFE_INTEGER);
      expect(Number.isSafeInteger(largeIdPlayer.id as number)).toBe(true);
    });

    it('should handle special characters in names', () => {
      const specialCharPlayer: BasePlayerInfo = {
        name: 'Player-With_Special.Chars@123',
        displayName: 'Player With Special Characters!',
        id: 12345,
        combatantInfo: {},
      };

      expect(specialCharPlayer.name).toBe('Player-With_Special.Chars@123');
      expect(specialCharPlayer.displayName).toBe('Player With Special Characters!');
    });

    it('should handle undefined and null values in extended properties', () => {
      const extendedWithNulls: ExtendedPlayerInfo = {
        name: 'NullPlayer',
        displayName: 'Null Player',
        id: 'null-test',
        combatantInfo: {},
        someProperty: null,
        anotherProperty: undefined,
        booleanProperty: false,
      };

      expect(extendedWithNulls.someProperty).toBeNull();
      expect(extendedWithNulls.anotherProperty).toBeUndefined();
      expect(extendedWithNulls.booleanProperty).toBe(false);
    });
  });
});
