import { ReportAbilityFragment } from '../graphql/generated';
import { selectAbilitiesById } from '../store/master_data/masterDataSelectors';
import store from '../store/storeWithHistory';
import { abilityIdMapper, AbilityData } from './abilityIdMapper';
import { DataLoadError, ValidationError } from './NestedError';

// Mock worker factories to avoid import.meta issues
jest.mock('../workers/workerFactories', () => ({
  createSharedWorker: jest.fn(() => ({
    calculateActorPositions: jest.fn(),
    calculateBuffUptimes: jest.fn(),
    calculateDamageDealt: jest.fn(),
    calculateDebuffUptimes: jest.fn(),
    calculateDeathRecap: jest.fn(),
    calculateHealingDone: jest.fn(),
    calculateResourceChanges: jest.fn(),
    terminate: jest.fn(),
  })),
}));

// Mock dependencies
jest.mock('../store/storeWithHistory');
jest.mock('../store/master_data/masterDataSelectors');

const mockStore = store as jest.Mocked<typeof store>;
const mockSelectAbilitiesById = selectAbilitiesById as jest.MockedFunction<
  typeof selectAbilitiesById
>;

describe('AbilityIdMapper', () => {
  const mockAbilities: Record<string, ReportAbilityFragment> = {
    '1001': {
      gameID: 1001,
      name: 'Test Ability',
      icon: 'test_icon',
      type: 'Active',
      __typename: 'ReportAbility',
    },
    '1002': {
      gameID: 1002,
      name: 'Another Ability',
      icon: 'another_icon',
      type: 'Passive',
      __typename: 'ReportAbility',
    },
    '1003': {
      gameID: 1003,
      name: 'Special Ability',
      icon: 'special_icon',
      type: 'Ultimate',
      __typename: 'ReportAbility',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the mapper's internal state
    (abilityIdMapper as any).isLoaded = false;
    (abilityIdMapper as any).loadingPromise = null;
    (abilityIdMapper as any).nameToIdMap.clear();
    (abilityIdMapper as any).idToDataMap.clear();

    // Setup default mock behavior
    mockStore.getState.mockReturnValue({} as any);
    mockSelectAbilitiesById.mockReturnValue(mockAbilities);
  });

  describe('Data Loading', () => {
    it('should load abilities data successfully', async () => {
      const result = await abilityIdMapper.preload();
      expect(result).toBeUndefined();
      expect(abilityIdMapper.isDataLoaded()).toBe(true);
    });

    it('should throw DataLoadError when no abilities found in master data', async () => {
      mockSelectAbilitiesById.mockReturnValue({});

      await expect(abilityIdMapper.preload()).rejects.toThrow(DataLoadError);
    });

    it('should handle loading promise correctly for concurrent requests', async () => {
      const promise1 = abilityIdMapper.preload();
      const promise2 = abilityIdMapper.preload();

      await Promise.all([promise1, promise2]);

      expect(abilityIdMapper.isDataLoaded()).toBe(true);
      expect(mockSelectAbilitiesById).toHaveBeenCalledTimes(1);
    });

    it('should skip abilities with missing name or gameID', async () => {
      const incompleteAbilities = {
        '1001': mockAbilities['1001'],
        '1002': {
          ...mockAbilities['1002'],
          name: null,
        },
        '1003': {
          ...mockAbilities['1003'],
          gameID: 0,
        },
      };

      mockSelectAbilitiesById.mockReturnValue(incompleteAbilities);

      await abilityIdMapper.preload();

      expect(abilityIdMapper.getAbilityById(1001)).toBeTruthy();
      expect(abilityIdMapper.getAbilityById(1002)).toBeNull();
      expect(abilityIdMapper.getAbilityById(1003)).toBeNull();
    });
  });

  describe('Synchronous Methods (Data Not Loaded)', () => {
    it('should return null when data not loaded - getAbilityByName', () => {
      const result = abilityIdMapper.getAbilityByName('Test Ability');
      expect(result).toBeNull();
    });

    it('should return null when data not loaded - getAbilityById', () => {
      const result = abilityIdMapper.getAbilityById(1001);
      expect(result).toBeNull();
    });

    it('should return null when data not loaded - getAbilityId', () => {
      const result = abilityIdMapper.getAbilityId('Test Ability');
      expect(result).toBeNull();
    });

    it('should return null when data not loaded - getIconUrl', () => {
      const result = abilityIdMapper.getIconUrl(1001);
      expect(result).toBeNull();
    });

    it('should return null when data not loaded - getIconUrlByName', () => {
      const result = abilityIdMapper.getIconUrlByName('Test Ability');
      expect(result).toBeNull();
    });

    it('should return empty array when data not loaded - searchAbilities', () => {
      const result = abilityIdMapper.searchAbilities('Test');
      expect(result).toEqual([]);
    });
  });

  describe('Synchronous Methods (Data Loaded)', () => {
    beforeEach(async () => {
      await abilityIdMapper.preload();
    });

    describe('getAbilityByName', () => {
      it('should return ability data for exact name match', () => {
        const result = abilityIdMapper.getAbilityByName('Test Ability');
        expect(result).toEqual({
          gameID: 1001,
          name: 'Test Ability',
          icon: 'test_icon',
          type: 'Active',
          __typename: 'ReportAbility',
        });
      });

      it('should handle case-insensitive name matching', () => {
        const result = abilityIdMapper.getAbilityByName('TEST ABILITY');
        expect(result).toEqual({
          gameID: 1001,
          name: 'Test Ability',
          icon: 'test_icon',
          type: 'Active',
          __typename: 'ReportAbility',
        });
      });

      it('should return null for non-existent ability', () => {
        const result = abilityIdMapper.getAbilityByName('Non-existent Ability');
        expect(result).toBeNull();
      });
    });

    describe('getAbilityById', () => {
      it('should return ability data for valid ID', () => {
        const result = abilityIdMapper.getAbilityById(1001);
        expect(result).toEqual({
          gameID: 1001,
          name: 'Test Ability',
          icon: 'test_icon',
          type: 'Active',
          __typename: 'ReportAbility',
        });
      });

      it('should return null for non-existent ID', () => {
        const result = abilityIdMapper.getAbilityById(9999);
        expect(result).toBeNull();
      });

      it('should return null for invalid ID types', () => {
        expect(abilityIdMapper.getAbilityById(0)).toBeNull();
        expect(abilityIdMapper.getAbilityById(-1)).toBeNull();
        expect(abilityIdMapper.getAbilityById(1.5)).toBeNull();
      });
    });

    describe('getAbilityId', () => {
      it('should return ability ID for valid name', () => {
        const result = abilityIdMapper.getAbilityId('Test Ability');
        expect(result).toBe(1001);
      });

      it('should return null for non-existent name', () => {
        const result = abilityIdMapper.getAbilityId('Non-existent Ability');
        expect(result).toBeNull();
      });
    });

    describe('getIconUrl', () => {
      it('should return correct icon URL for valid ID', () => {
        const result = abilityIdMapper.getIconUrl(1001);
        expect(result).toBe('https://assets.rpglogs.com/img/eso/abilities/test_icon.png');
      });

      it('should return null for missing icon', async () => {
        const abilitiesWithMissingIcon = {
          '1001': {
            ...mockAbilities['1001'],
            icon: 'icon_missing',
          },
        };

        mockSelectAbilitiesById.mockReturnValue(abilitiesWithMissingIcon);

        // Reset and reload
        (abilityIdMapper as any).isLoaded = false;
        (abilityIdMapper as any).loadingPromise = null;
        (abilityIdMapper as any).nameToIdMap.clear();
        (abilityIdMapper as any).idToDataMap.clear();
        await abilityIdMapper.preload();

        const result = abilityIdMapper.getIconUrl(1001);
        expect(result).toBeNull();
      });

      it('should return null for non-existent ID', () => {
        const result = abilityIdMapper.getIconUrl(9999);
        expect(result).toBeNull();
      });
    });

    describe('getIconUrlByName', () => {
      it('should return correct icon URL for valid name', () => {
        const result = abilityIdMapper.getIconUrlByName('Test Ability');
        expect(result).toBe('https://assets.rpglogs.com/img/eso/abilities/test_icon.png');
      });

      it('should return null for non-existent name', () => {
        const result = abilityIdMapper.getIconUrlByName('Non-existent Ability');
        expect(result).toBeNull();
      });
    });

    describe('searchAbilities', () => {
      it('should return abilities matching partial name', () => {
        const result = abilityIdMapper.searchAbilities('ability');
        expect(result).toHaveLength(3);
        expect(result.map((a) => a.name)).toEqual([
          'Another Ability',
          'Special Ability',
          'Test Ability',
        ]);
      });

      it('should limit results based on limit parameter', () => {
        const result = abilityIdMapper.searchAbilities('ability', 2);
        expect(result).toHaveLength(2);
      });

      it('should return empty array for invalid search terms', () => {
        expect(abilityIdMapper.searchAbilities('')).toEqual([]);
        expect(abilityIdMapper.searchAbilities('   ')).toEqual([]);
      });

      it('should handle invalid limit values', () => {
        const result = abilityIdMapper.searchAbilities('ability', -1);
        expect(result).toHaveLength(3); // Should use default limit
      });

      it('should return empty array for no matches', () => {
        const result = abilityIdMapper.searchAbilities('nonexistent');
        expect(result).toEqual([]);
      });
    });
  });

  describe('Asynchronous Methods', () => {
    describe('getAbilityByNameAsync', () => {
      it('should return ability data for valid name', async () => {
        const result = await abilityIdMapper.getAbilityByNameAsync('Test Ability');
        expect(result).toEqual({
          gameID: 1001,
          name: 'Test Ability',
          icon: 'test_icon',
          type: 'Active',
          __typename: 'ReportAbility',
        });
      });

      it('should return null for non-existent name', async () => {
        const result = await abilityIdMapper.getAbilityByNameAsync('Non-existent Ability');
        expect(result).toBeNull();
      });
    });

    describe('getAbilityByIdAsync', () => {
      it('should return ability data for valid ID', async () => {
        const result = await abilityIdMapper.getAbilityByIdAsync(1001);
        expect(result).toEqual({
          gameID: 1001,
          name: 'Test Ability',
          icon: 'test_icon',
          type: 'Active',
          __typename: 'ReportAbility',
        });
      });

      it('should return null for non-existent ID', async () => {
        const result = await abilityIdMapper.getAbilityByIdAsync(9999);
        expect(result).toBeNull();
      });

      it('should throw ValidationError for invalid ID', async () => {
        await expect(abilityIdMapper.getAbilityByIdAsync(0)).rejects.toThrow(ValidationError);
        await expect(abilityIdMapper.getAbilityByIdAsync(-1)).rejects.toThrow(ValidationError);
        await expect(abilityIdMapper.getAbilityByIdAsync(1.5)).rejects.toThrow(ValidationError);
      });
    });

    describe('getIconUrlAsync', () => {
      it('should return correct icon URL for valid ID', async () => {
        const result = await abilityIdMapper.getIconUrlAsync(1001);
        expect(result).toBe('https://assets.rpglogs.com/img/eso/abilities/test_icon.png');
      });

      it('should return null for non-existent ID', async () => {
        const result = await abilityIdMapper.getIconUrlAsync(9999);
        expect(result).toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle store.getState errors', async () => {
      mockStore.getState.mockImplementation(() => {
        throw new Error('Store access error');
      });

      await expect(abilityIdMapper.preload()).rejects.toThrow(DataLoadError);
    });

    it('should handle selector errors', async () => {
      mockSelectAbilitiesById.mockImplementation(() => {
        throw new Error('Selector error');
      });

      await expect(abilityIdMapper.preload()).rejects.toThrow(DataLoadError);
    });
  });

  describe('Edge Cases', () => {
    it('should handle abilities with null or undefined properties', async () => {
      const edgeCaseAbilities = {
        '1001': {
          gameID: 1001,
          name: 'Valid Ability',
          icon: null,
          type: undefined,
          __typename: 'ReportAbility' as const,
        },
      };

      mockSelectAbilitiesById.mockReturnValue(edgeCaseAbilities);

      await abilityIdMapper.preload();

      const result = abilityIdMapper.getAbilityById(1001);
      expect(result).toEqual({
        gameID: 1001,
        name: 'Valid Ability',
        icon: '',
        type: undefined,
        __typename: 'ReportAbility',
      });
    });

    it('should handle abilities with special characters in names', async () => {
      const specialAbilities = {
        '1001': {
          gameID: 1001,
          name: 'Ability with "Quotes" & Symbols!',
          icon: 'special_icon',
          type: 'Active',
          __typename: 'ReportAbility' as const,
        },
      };

      mockSelectAbilitiesById.mockReturnValue(specialAbilities);

      await abilityIdMapper.preload();

      const result = abilityIdMapper.getAbilityByName('Ability with "Quotes" & Symbols!');
      expect(result).toBeTruthy();
      expect(result?.gameID).toBe(1001);
    });
  });

  describe('Console Logging', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'info').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log success statistics after loading', async () => {
      await abilityIdMapper.preload();

      // Logger passes message as first arg, data object as second arg, and error (undefined) as third arg
      const calls = consoleSpy.mock.calls;
      const successCall = calls.find((call) =>
        call[0]?.includes('Successfully processed abilities from master data'),
      );
      expect(successCall).toBeDefined();
      expect(successCall?.[0]).toContain('[AbilityIdMapper]');
      expect(successCall?.[0]).toContain('[INFO]');
    });
  });
});
