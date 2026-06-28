import type { FightFragment, ReportActorFragment } from '@/graphql/gql/graphql';
import type { CombatantInfoEvent } from '@/types/combatlogEvents';

import type { RootState } from '../storeWithHistory';
import { resolveCacheKey } from '../utils/keyedCacheState';

import { selectActivePlayersById, selectPlayersByIdForContext } from './playerDataSelectors';
import type { PlayerDataEntry, PlayerDetailsWithRole } from './playerDataSlice';

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

const player = (overrides: Partial<PlayerDetailsWithRole>): PlayerDetailsWithRole => ({
  anonymous: false,
  combatantInfo: {
    gear: [],
    stats: [],
    talents: [],
  },
  displayName: '',
  guid: 1,
  healthstoneUse: 0,
  icon: '',
  id: 1,
  maxItemLevel: undefined,
  minItemLevel: undefined,
  name: 'Player One',
  potionUse: 0,
  role: 'dps',
  server: '',
  specs: [],
  type: 'Unknown',
  ...overrides,
});

const playerDataEntry = (
  playersById: Record<string | number, PlayerDetailsWithRole>,
): PlayerDataEntry => ({
  playersById,
  status: 'succeeded',
  error: null,
  cacheMetadata: {
    lastFetchedTimestamp: 123,
    playerCount: Object.keys(playersById).length,
  },
  currentRequest: null,
});

const createState = ({
  playersById = {},
}: {
  playersById?: Record<string | number, PlayerDetailsWithRole>;
} = {}): RootState => {
  const reportKey = resolveCacheKey({ reportCode: 'A' }).key;
  const fightKey = resolveCacheKey({ reportCode: 'A', fightId: 12 }).key;
  const gear = [{ id: 10, setName: 'Fallback Set' }] as CombatantInfoEvent['gear'];
  const fight = {
    id: 12,
    startTime: 1000,
    endTime: 2000,
    friendlyPlayers: [1, 2, 96],
    enemyNPCs: [],
  } as unknown as FightFragment;

  return {
    events: {
      combatantInfo: {
        entries: {
          [fightKey]: {
            events: [combatantInfo(1, 100, []), combatantInfo(1, 200, gear)],
            status: 'succeeded',
            error: null,
            cacheMetadata: {
              lastFetchedTimestamp: 123,
              eventCount: 2,
              restrictToFightWindow: true,
            },
            currentRequest: null,
          },
        },
        accessOrder: [fightKey],
      },
    },
    masterData: {
      entries: {
        [reportKey]: {
          actorsById: {
            1: actor({
              id: 1,
              name: "Grappa'Ko'Laid",
              displayName: "@Spike'jo",
              subType: 'Nightblade',
            }),
            2: actor({ id: 2, name: 'Archive NPC', type: 'NPC', subType: 'NPC' }),
            96: actor({
              id: 96,
              name: 'Angair Doomfang',
              displayName: '@blueblaze103',
              subType: 'Necromancer',
            }),
          },
          abilitiesById: {},
          status: 'succeeded',
          error: null,
          cacheMetadata: {
            lastFetchedTimestamp: 123,
            actorCount: 3,
            abilityCount: 0,
          },
          currentRequest: null,
        },
      },
      accessOrder: [reportKey],
    },
    playerData: {
      entries: {
        [fightKey]: playerDataEntry(playersById),
      },
      accessOrder: [fightKey],
    },
    report: {
      entries: {
        [reportKey]: {
          data: null,
          status: 'succeeded',
          error: null,
          fightsById: {
            12: fight,
          },
          fightIds: [12],
          cacheMetadata: {
            lastFetchedTimestamp: 123,
          },
          currentRequest: null,
        },
      },
      accessOrder: [reportKey],
      activeContext: {
        reportId: 'A',
        fightId: 12,
      },
      reportId: 'A',
      data: null,
      loading: false,
      error: null,
      cacheMetadata: {
        lastFetchedReportId: 'A',
        lastFetchedTimestamp: 123,
      },
      fightIndexByReport: {
        A: [12],
      },
    },
  } as unknown as RootState;
};

describe('playerDataSelectors fallback players', () => {
  it('builds fallback players when player details are empty', () => {
    const players = selectPlayersByIdForContext(createState(), {
      reportCode: 'A',
      fightId: 12,
    });

    expect(Object.keys(players)).toEqual(['1', '96']);
    expect(players[1]).toMatchObject({
      id: 1,
      name: "Grappa'Ko'Laid",
      displayName: "@Spike'jo",
      type: 'Nightblade',
      role: 'dps',
    });
    expect(players[1].combatantInfo.gear).toEqual([{ id: 10, setName: 'Fallback Set' }]);
    expect(players[96]).toMatchObject({
      id: 96,
      name: 'Angair Doomfang',
      displayName: '@blueblaze103',
      type: 'Necromancer',
    });
    expect(players[2]).toBeUndefined();
  });

  it('applies the same fallback to active player selectors', () => {
    const players = selectActivePlayersById(createState());

    expect(players[1]?.name).toBe("Grappa'Ko'Laid");
    expect(players[96]?.displayName).toBe('@blueblaze103');
  });

  it('keeps real player details when the API provides them', () => {
    const realPlayers = {
      1: player({
        id: 1,
        name: 'API Player',
        role: 'tank',
      }),
    };

    const players = selectPlayersByIdForContext(createState({ playersById: realPlayers }), {
      reportCode: 'A',
      fightId: 12,
    });

    expect(players).toBe(realPlayers);
    expect(players[1]).toMatchObject({
      name: 'API Player',
      role: 'tank',
    });
  });
});
