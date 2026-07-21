import {
  computePlayerPanelAnalysis,
  PLAYER_PANEL_ANALYSIS_SYNC_THRESHOLD,
  type PlayerPanelAnalysisInput,
} from './playerPanelAnalysis';

/**
 * Tests the COMBINER: per-player keying, the max-resource scan (window filter,
 * source/target maxima), aura wiring, and the fight-window echo. The wrapped
 * analyses (analyzeBarSwaps, analyzePlayerClassFromEvents, detectBuildIssues)
 * each carry their own behavioral suites.
 */

const FIGHT_START = 1000;
const FIGHT_END = 9000;

function makeInput(overrides: Partial<PlayerPanelAnalysisInput> = {}): PlayerPanelAnalysisInput {
  return {
    fightStartTime: FIGHT_START,
    fightEndTime: FIGHT_END,
    players: [
      { id: 1, role: 'dps', gear: [] },
      { id: 2, role: 'healer', gear: [] },
    ],
    castEvents: [],
    damageEvents: [],
    healingEvents: [],
    resourceEvents: [],
    combatantInfoEvents: [],
    friendlyBuffEvents: [],
    debuffEvents: [],
    abilitiesById: {},
    friendlyBuffLookup: { buffIntervals: {} },
    ...overrides,
  };
}

describe('computePlayerPanelAnalysis', () => {
  it('echoes the fight window and keys every map by player id', () => {
    const result = computePlayerPanelAnalysis(makeInput());

    expect(result.fightStartTime).toBe(FIGHT_START);
    expect(result.fightEndTime).toBe(FIGHT_END);
    for (const map of [
      result.publicClassAnalysisByPlayer,
      result.barSwapByPlayer,
      result.maxResourcesByPlayer,
      result.buildIssuesByPlayer,
    ]) {
      expect(Object.keys(map).sort()).toEqual(['1', '2']);
    }
  });

  it('tracks per-player resource maxima from source AND target snapshots', () => {
    const result = computePlayerPanelAnalysis(
      makeInput({
        resourceEvents: [
          {
            type: 'resourcechange',
            timestamp: 2000,
            sourceID: 1,
            sourceResources: { maxHitPoints: 20000, maxStamina: 30000, maxMagicka: 12000 },
          },
          {
            type: 'resourcechange',
            timestamp: 3000,
            targetID: 1,
            targetResources: { maxHitPoints: 22000, maxStamina: 29000 },
          },
        ],
        damageEvents: [
          {
            type: 'damage',
            timestamp: 4000,
            sourceID: 2,
            sourceResources: { maxHitPoints: 25000, maxMagicka: 40000 },
          },
        ],
      }),
    );

    expect(result.maxResourcesByPlayer['1']).toEqual({
      health: 22000,
      stamina: 30000,
      magicka: 12000,
    });
    expect(result.maxResourcesByPlayer['2']).toEqual({
      health: 25000,
      stamina: 0,
      magicka: 40000,
    });
  });

  it('ignores resource snapshots outside the fight window', () => {
    const result = computePlayerPanelAnalysis(
      makeInput({
        resourceEvents: [
          {
            type: 'resourcechange',
            timestamp: FIGHT_START - 1,
            sourceID: 1,
            sourceResources: { maxHitPoints: 99999 },
          },
          {
            type: 'resourcechange',
            timestamp: FIGHT_END + 1,
            sourceID: 1,
            sourceResources: { maxHitPoints: 88888 },
          },
        ],
      }),
    );

    expect(result.maxResourcesByPlayer['1'].health).toBe(0);
  });

  it('ignores snapshots for actors that are not tracked players', () => {
    const result = computePlayerPanelAnalysis(
      makeInput({
        resourceEvents: [
          {
            type: 'resourcechange',
            timestamp: 2000,
            sourceID: 999,
            sourceResources: { maxHitPoints: 12345 },
          },
        ],
      }),
    );

    expect(result.maxResourcesByPlayer['999']).toBeUndefined();
  });

  it('skips class analysis when abilities data is absent, keeping other maps', () => {
    const result = computePlayerPanelAnalysis(
      makeInput({
        abilitiesById: undefined as unknown as PlayerPanelAnalysisInput['abilitiesById'],
      }),
    );

    expect(result.publicClassAnalysisByPlayer).toEqual({});
    expect(Object.keys(result.barSwapByPlayer)).toHaveLength(2);
    expect(Object.keys(result.buildIssuesByPlayer)).toHaveLength(2);
  });

  it('sync threshold is a sane positive bound', () => {
    expect(PLAYER_PANEL_ANALYSIS_SYNC_THRESHOLD).toBeGreaterThan(1000);
    expect(PLAYER_PANEL_ANALYSIS_SYNC_THRESHOLD).toBeLessThan(1_000_000);
  });
});
