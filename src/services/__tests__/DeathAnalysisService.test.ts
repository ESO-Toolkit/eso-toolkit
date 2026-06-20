import { ReportActorFragment, ReportAbilityFragment } from '../../graphql/gql/graphql';
import { DeathEvent } from '../../types/combatlogEvents';
import { MechanicCategory } from '../../types/reportSummaryTypes';
import { DeathAnalysisInput, DeathAnalysisService } from '../DeathAnalysisService';

const makeDeath = (partial: Partial<DeathEvent>): DeathEvent =>
  ({
    timestamp: 1000,
    type: 'death',
    sourceID: 50, // hostile source by default
    sourceIsFriendly: false,
    targetID: 1, // a player by default
    targetInstance: 0,
    targetIsFriendly: true,
    abilityGameID: 9000,
    fight: 1,
    castTrackID: 0,
    sourceResources: {} as DeathEvent['sourceResources'],
    targetResources: {} as DeathEvent['targetResources'],
    amount: 0,
    ...partial,
  }) as DeathEvent;

const actors: Record<string, ReportActorFragment> = {
  1: { id: 1, name: 'Alice', type: 'Player' } as ReportActorFragment,
  2: { id: 2, name: 'Bob', type: 'Player' } as ReportActorFragment,
  50: { id: 50, name: 'Boss', type: 'NPC' } as ReportActorFragment,
};

const abilities: Record<string, ReportAbilityFragment> = {
  9000: { gameID: 9000, name: 'Meteor' } as unknown as ReportAbilityFragment,
  9001: { gameID: 9001, name: 'Cleave' } as unknown as ReportAbilityFragment,
  // 126633 (Elemental Ring) is in the canonical AOE_ABILITY_IDS set.
  126633: { gameID: 126633, name: 'Elemental Ring', type: '64' } as unknown as ReportAbilityFragment,
};

const input = (partial: Partial<DeathAnalysisInput>): DeathAnalysisInput => ({
  deathEvents: [],
  fightId: 1,
  fightName: 'Boss',
  fightStartTime: 0,
  fightEndTime: 60_000,
  actors,
  abilities,
  ...partial,
});

describe('DeathAnalysisService.analyzeReportDeaths', () => {
  it('counts only player (friendly-target) deaths', () => {
    const result = DeathAnalysisService.analyzeReportDeaths([
      input({
        deathEvents: [
          makeDeath({ targetID: 1 }), // player death — counts
          makeDeath({ targetID: 50, targetIsFriendly: false }), // an NPC dying — ignored
        ],
      }),
    ]);
    expect(result.totalDeaths).toBe(1);
  });

  it('excludes deaths dealt by a friendly source from the deadliest-ability table', () => {
    const result = DeathAnalysisService.analyzeReportDeaths([
      input({
        deathEvents: [
          makeDeath({ abilityGameID: 9000 }), // hostile kill — counts
          makeDeath({ abilityGameID: 9001, sourceIsFriendly: true }), // self/ally — excluded
        ],
      }),
    ]);
    // Both are player deaths…
    expect(result.totalDeaths).toBe(2);
    // …but only the hostile one is attributed to a mechanic, and its share is 100%.
    expect(result.mechanicDeaths).toHaveLength(1);
    expect(result.mechanicDeaths[0].mechanicId).toBe(9000);
    expect(result.mechanicDeaths[0].percentage).toBeCloseTo(100);
  });

  it('divides a player’s cause-of-death percentages by their hostile deaths', () => {
    const result = DeathAnalysisService.analyzeReportDeaths([
      input({
        deathEvents: [
          makeDeath({ targetID: 1, abilityGameID: 9000 }),
          makeDeath({ targetID: 1, abilityGameID: 9000 }),
          makeDeath({ targetID: 1, abilityGameID: 9001 }),
        ],
      }),
    ]);
    const alice = result.playerDeaths.find((p) => p.playerName === 'Alice');
    expect(alice?.totalDeaths).toBe(3);
    const meteor = alice?.topCausesOfDeath.find((c) => c.abilityId === 9000);
    expect(meteor?.deathCount).toBe(2);
    expect(meteor?.percentage).toBeCloseTo((2 / 3) * 100);
  });

  it('ignores deaths whose target is not a player actor', () => {
    const result = DeathAnalysisService.analyzeReportDeaths([
      input({
        deathEvents: [makeDeath({ targetID: 50, targetIsFriendly: true })], // NPC marked friendly
      }),
    ]);
    expect(result.playerDeaths).toHaveLength(0);
  });

  it('treats a zero-duration fight as success with deathRate 0 (no Infinity)', () => {
    const result = DeathAnalysisService.analyzeReportDeaths([
      input({ fightStartTime: 5000, fightEndTime: 5000, deathEvents: [makeDeath({})] }),
    ]);
    const fight = result.fightDeaths[0];
    expect(fight.deathRate).toBe(0);
    expect(fight.success).toBe(true);
    expect(Number.isFinite(fight.deathRate)).toBe(true);
  });

  it('averages killing-blow amount per mechanic', () => {
    const result = DeathAnalysisService.analyzeReportDeaths([
      input({
        deathEvents: [
          makeDeath({ abilityGameID: 9000, amount: 1000 }),
          makeDeath({ abilityGameID: 9000, amount: 3000 }),
        ],
      }),
    ]);
    expect(result.mechanicDeaths[0].averageKillingBlowDamage).toBe(2000);
  });

  it('uses the authoritative kill flag for success, not the death-rate heuristic', () => {
    // 1 death over 60s = 1/min, which the old heuristic (<2/min) called a success.
    // With kill:false it must read as a wipe.
    const wipe = DeathAnalysisService.analyzeReportDeaths([
      input({ kill: false, isBoss: true, deathEvents: [makeDeath({})] }),
    ]);
    expect(wipe.fightDeaths[0].success).toBe(false);
    expect(wipe.fightDeaths[0].isBoss).toBe(true);

    // A kill that happened to have deaths must still read as a kill.
    const kill = DeathAnalysisService.analyzeReportDeaths([
      input({
        kill: true,
        isBoss: true,
        fightStartTime: 0,
        fightEndTime: 10_000,
        deathEvents: [makeDeath({}), makeDeath({}), makeDeath({})],
      }),
    ]);
    expect(kill.fightDeaths[0].success).toBe(true);
  });

  it('categorizes a mechanic by ability id / damage-type flags, not its name', () => {
    const result = DeathAnalysisService.analyzeReportDeaths([
      input({ deathEvents: [makeDeath({ abilityGameID: 126633 })] }),
    ]);
    expect(result.mechanicDeaths[0].category).toBe(MechanicCategory.AREA_EFFECT);
  });

  it('reports a flawless run when there are no deaths', () => {
    const result = DeathAnalysisService.analyzeReportDeaths([input({ deathEvents: [] })]);
    expect(result.totalDeaths).toBe(0);
    expect(result.playerDeaths).toHaveLength(0);
    expect(result.mechanicDeaths).toHaveLength(0);
    expect(result.fightDeaths[0].success).toBe(true);
  });
});
