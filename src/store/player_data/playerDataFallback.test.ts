import { DetectedRole, type PlayerRoleResult } from '@/features/role_detection';
import type { ReportActorFragment } from '@/graphql/gql/graphql';
import type { CombatantInfoEvent } from '@/types/combatlogEvents';

import { buildFallbackPlayersFromMasterData } from './playerDataFallback';

const actor = (overrides: Partial<ReportActorFragment>): ReportActorFragment => ({
  __typename: 'ReportActor',
  anonymous: false,
  displayName: null,
  gameID: null,
  icon: null,
  id: 1,
  name: 'Player One',
  petOwner: null,
  server: 'NA Megaserver',
  subType: 'Nightblade',
  type: 'Player',
  ...overrides,
});

const combatantInfo = (
  sourceID: number,
  timestamp: number,
  gear: CombatantInfoEvent['gear'] = [],
): CombatantInfoEvent => ({
  timestamp,
  type: 'combatantinfo',
  fight: 12,
  sourceID,
  gear,
  auras: [],
});

const role = (playerId: number, detectedRole: DetectedRole): PlayerRoleResult =>
  ({
    playerId,
    playerName: `Player ${playerId}`,
    role: detectedRole,
    confidence: 100,
    signals: {},
  }) as PlayerRoleResult;

describe('buildFallbackPlayersFromMasterData', () => {
  it('creates player details from friendly master-data actors', () => {
    const gear = [{ id: 10, setName: 'Test Set' }] as CombatantInfoEvent['gear'];
    const players = buildFallbackPlayersFromMasterData({
      friendlyPlayerIds: [1, 2, 96],
      actorsById: {
        1: actor({
          id: 1,
          name: "Grappa'Ko'Laid",
          displayName: "@Spike'jo",
          subType: 'Nightblade',
          gameID: 123,
        }),
        2: actor({ id: 2, name: 'Archive NPC', type: 'NPC', subType: 'NPC' }),
        96: actor({
          id: 96,
          name: 'Angair Doomfang',
          displayName: '@blueblaze103',
          subType: 'Necromancer',
        }),
      },
      combatantInfoEvents: [
        combatantInfo(1, 100, []),
        combatantInfo(1, 200, gear),
        combatantInfo(96, 150, []),
      ],
      rolesByPlayerId: {
        96: role(96, DetectedRole.GroupHealer),
      },
    });

    expect(Object.keys(players)).toEqual(['1', '96']);
    expect(players[1]).toMatchObject({
      id: 1,
      name: "Grappa'Ko'Laid",
      displayName: "@Spike'jo",
      type: 'Nightblade',
      role: 'dps',
    });
    expect(players[1].combatantInfo.gear).toEqual([
      { id: 10, setName: 'Test Set', slot: 0, name: 'Test Set' },
    ]);
    expect(players[96]).toMatchObject({
      id: 96,
      name: 'Angair Doomfang',
      displayName: '@blueblaze103',
      type: 'Necromancer',
      role: 'healer',
    });
    expect(players[2]).toBeUndefined();
  });

  it('uses combatant-info source ids when fight friendly ids are unavailable', () => {
    const players = buildFallbackPlayersFromMasterData({
      actorsById: {
        1: actor({ id: 1, name: 'Fallback Player', displayName: 'nil' }),
      },
      combatantInfoEvents: [combatantInfo(1, 100)],
    });

    expect(players[1]).toMatchObject({
      id: 1,
      name: 'Fallback Player',
      displayName: '',
      role: 'dps',
    });
  });

  it('normalizes combatant-info gear from event payloads', () => {
    const gear = [
      { id: 157729, setID: 475 },
      { id: 0, setID: 0 },
      { id: 223189, setID: 845, slot: 5 },
    ] as CombatantInfoEvent['gear'];

    const players = buildFallbackPlayersFromMasterData({
      actorsById: {
        1: actor({ id: 1, name: 'Fallback Player' }),
      },
      combatantInfoEvents: [combatantInfo(1, 100, gear)],
    });

    expect(players[1].combatantInfo.gear).toEqual([
      {
        id: 157729,
        setID: 475,
        slot: 0,
        setName: 'Aegis Caller',
        name: 'Aegis Caller',
      },
      {
        id: 0,
        setID: 0,
        slot: 1,
        setName: undefined,
        name: undefined,
      },
      {
        id: 223189,
        setID: 845,
        slot: 5,
        setName: "Huntsman's Warmask",
        name: "Huntsman's Warmask",
      },
    ]);
  });
});
