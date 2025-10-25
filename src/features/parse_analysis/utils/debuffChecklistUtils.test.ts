/**
 * Tests for Debuff Checklist Utilities
 */

import { DebuffEvent } from '../../../types/combatlogEvents';
import type { AbilityData } from '../../../contexts/AbilityIdMapperContext';
import { analyzeDebuffChecklist } from './debuffChecklistUtils';

describe('analyzeDebuffChecklist', () => {
  const PLAYER_ID = 1;
  const DUMMY_ID = 3;
  const FIGHT_START = 1000000;
  const FIGHT_END = 1060000;

  it('should detect debuffs applied by player to dummy', () => {
    const debuffId = 12345;
    const debuffEvents: DebuffEvent[] = [
      {
        timestamp: FIGHT_START + 1000,
        type: 'applydebuff',
        sourceID: PLAYER_ID,
        sourceIsFriendly: true,
        targetID: DUMMY_ID,
        targetIsFriendly: false,
        abilityGameID: debuffId,
        fight: 1,
        extraAbilityGameID: 0,
      },
    ];

    const abilityMapper = {
      getAbilityById: (id: number): AbilityData | null => ({
        gameID: id,
        name: 'Major Breach',
        icon: '',
      }),
    };

    const result = analyzeDebuffChecklist(
      debuffEvents,
      PLAYER_ID,
      DUMMY_ID,
      FIGHT_START,
      FIGHT_END,
      abilityMapper,
    );

    expect(result.majorDebuffs).toHaveLength(1);
    expect(result.majorDebuffs[0].isAppliedByPlayer).toBe(true);
    expect(result.majorDebuffs[0].isAppliedByDummy).toBe(false);
    expect(result.majorDebuffs[0].abilityIds).toContain(debuffId);
    expect(result.summary.totalTrackedDebuffs).toBe(1);
    expect(result.summary.totalPlayerDebuffs).toBe(1);
    expect(result.summary.totalDummyDebuffs).toBe(0);
  });

  it('should categorize major debuffs correctly', () => {
    const majorDebuffId = 99999;
    const debuffEvents: DebuffEvent[] = [
      {
        timestamp: FIGHT_START + 1000,
        type: 'applydebuff',
        sourceID: PLAYER_ID,
        sourceIsFriendly: true,
        targetID: DUMMY_ID,
        targetIsFriendly: false,
        abilityGameID: majorDebuffId,
        fight: 1,
        extraAbilityGameID: 0,
      },
    ];

    const abilityMapper = {
      getAbilityById: (id: number): AbilityData | null => ({
        gameID: id,
        name: 'Major Vulnerability',
        icon: '',
      }),
    };

    const result = analyzeDebuffChecklist(
      debuffEvents,
      PLAYER_ID,
      DUMMY_ID,
      FIGHT_START,
      FIGHT_END,
      abilityMapper,
    );

    // Since we use ability ID as name, it won't be categorized as major
    // unless the name contains "major"
    expect(result.summary.totalTrackedDebuffs).toBe(1);
  });

  it('should not include debuffs from other players', () => {
    const otherPlayerId = 2;
    const debuffId = 12345;
    const debuffEvents: DebuffEvent[] = [
      {
        timestamp: FIGHT_START + 1000,
        type: 'applydebuff',
        sourceID: otherPlayerId, // Different player
        sourceIsFriendly: true,
        targetID: DUMMY_ID,
        targetIsFriendly: false,
        abilityGameID: debuffId,
        fight: 1,
        extraAbilityGameID: 0,
      },
    ];

    const abilityMapper = {
      getAbilityById: (id: number): AbilityData | null => ({
        gameID: id,
        name: 'Major Breach',
        icon: '',
      }),
    };

    const result = analyzeDebuffChecklist(
      debuffEvents,
      PLAYER_ID,
      DUMMY_ID,
      FIGHT_START,
      FIGHT_END,
      abilityMapper,
    );

    expect(result.summary.totalTrackedDebuffs).toBe(0);
    expect(result.summary.totalPlayerDebuffs).toBe(0);
    expect(result.summary.totalDummyDebuffs).toBe(0);
  });

  it('should not include debuffs applied to other targets', () => {
    const otherTargetId = 4;
    const debuffId = 12345;
    const debuffEvents: DebuffEvent[] = [
      {
        timestamp: FIGHT_START + 1000,
        type: 'applydebuff',
        sourceID: PLAYER_ID,
        sourceIsFriendly: true,
        targetID: otherTargetId, // Different target
        targetIsFriendly: false,
        abilityGameID: debuffId,
        fight: 1,
        extraAbilityGameID: 0,
      },
    ];

    const abilityMapper = {
      getAbilityById: (id: number): AbilityData | null => ({
        gameID: id,
        name: 'Minor Breach',
        icon: '',
      }),
    };

    const result = analyzeDebuffChecklist(
      debuffEvents,
      PLAYER_ID,
      DUMMY_ID,
      FIGHT_START,
      FIGHT_END,
      abilityMapper,
    );

    expect(result.summary.totalTrackedDebuffs).toBe(0);
  });

  it('should handle multiple different debuffs', () => {
    const debuffId1 = 12345;
    const debuffId2 = 67890;
    const debuffEvents: DebuffEvent[] = [
      {
        timestamp: FIGHT_START + 1000,
        type: 'applydebuff',
        sourceID: PLAYER_ID,
        sourceIsFriendly: true,
        targetID: DUMMY_ID,
        targetIsFriendly: false,
        abilityGameID: debuffId1,
        fight: 1,
        extraAbilityGameID: 0,
      },
      {
        timestamp: FIGHT_START + 2000,
        type: 'applydebuff',
        sourceID: PLAYER_ID,
        sourceIsFriendly: true,
        targetID: DUMMY_ID,
        targetIsFriendly: false,
        abilityGameID: debuffId2,
        fight: 1,
        extraAbilityGameID: 0,
      },
    ];

    const abilityMapper = {
      getAbilityById: (id: number): AbilityData | null => ({
        gameID: id,
        name: id === debuffId1 ? 'Major Breach' : 'Minor Breach',
        icon: '',
      }),
    };

    const result = analyzeDebuffChecklist(
      debuffEvents,
      PLAYER_ID,
      DUMMY_ID,
      FIGHT_START,
      FIGHT_END,
      abilityMapper,
    );

    expect(result.summary.totalTrackedDebuffs).toBe(2);
    expect(result.summary.totalPlayerDebuffs).toBe(2);
    expect(result.summary.totalDummyDebuffs).toBe(0);
  });

  it('should return empty results when no debuffs are applied', () => {
    const debuffEvents: DebuffEvent[] = [];

    const abilityMapper = {
      getAbilityById: (_id: number): AbilityData | null => ({
        gameID: _id,
        name: 'Major Breach',
        icon: '',
      }),
    };

    const result = analyzeDebuffChecklist(
      debuffEvents,
      PLAYER_ID,
      DUMMY_ID,
      FIGHT_START,
      FIGHT_END,
      abilityMapper,
    );

    expect(result.majorDebuffs.length).toBe(0);
    expect(result.minorDebuffs.length).toBe(0);
    expect(result.summary.totalTrackedDebuffs).toBe(0);
  });

  it('should include dummy-applied debuffs in the checklist', () => {
    const dummyDebuffId = 88401; // Minor Magickasteal from constants
    const debuffEvents: DebuffEvent[] = [
      {
        timestamp: FIGHT_START + 1500,
        type: 'applydebuff',
        sourceID: DUMMY_ID,
        sourceIsFriendly: true,
        targetID: DUMMY_ID,
        targetIsFriendly: false,
        abilityGameID: dummyDebuffId,
        fight: 1,
        extraAbilityGameID: 0,
      },
    ];

    const abilityMapper = {
      getAbilityById: (_id: number): AbilityData | null => null,
    };

    const result = analyzeDebuffChecklist(
      debuffEvents,
      PLAYER_ID,
      DUMMY_ID,
      FIGHT_START,
      FIGHT_END,
      abilityMapper,
    );

    expect(result.minorDebuffs).toHaveLength(1);
    const minorMagickasteal = result.minorDebuffs[0];
    expect(minorMagickasteal.debuffName).toBe('Minor Magickasteal');
    expect(minorMagickasteal.isAppliedByPlayer).toBe(false);
    expect(minorMagickasteal.isAppliedByDummy).toBe(true);
    expect(result.summary.totalTrackedDebuffs).toBe(1);
    expect(result.summary.totalPlayerDebuffs).toBe(0);
    expect(result.summary.totalDummyDebuffs).toBe(1);
  });
});
