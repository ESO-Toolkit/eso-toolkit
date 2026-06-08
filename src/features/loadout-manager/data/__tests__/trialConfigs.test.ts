import {
  TRIALS,
  getTrialById,
  getActivityKindLabel,
  getGroupedTrials,
  getTotalSetupCount,
  generateSetupStructure,
} from '../trialConfigs';

describe('trialConfigs', () => {
  it('has globally unique ids', () => {
    const ids = TRIALS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every activity at least one boss', () => {
    for (const trial of TRIALS) {
      expect(trial.bosses.length).toBeGreaterThan(0);
      for (const boss of trial.bosses) {
        expect(boss.name.trim().length).toBeGreaterThan(0);
        expect(boss.trashPacksBefore).toBeGreaterThanOrEqual(0);
      }
    }
  });

  describe('dungeons', () => {
    const dungeons = TRIALS.filter((t) => t.type === 'dungeon');

    it('includes a substantial set of group dungeons', () => {
      // Base-game (24 instances) + DLC (34) group dungeons.
      expect(dungeons.length).toBeGreaterThanOrEqual(50);
    });

    it.each([
      ['FG1', 'Fungal Grotto I', "Kra'gh the Dreugh King"],
      ['ICP', 'Imperial City Prison', 'Lord Warden Dusk'],
      ['CA', 'Coral Aerie', 'Varallion'],
      ['LS', 'Lep Seclusa', 'Orpheon the Tactician'],
      ['BGF', 'Black Gem Foundry', 'High Soulbinder Vykand'],
    ])('%s (%s) ends on its verified final boss', (id, name, finalBoss) => {
      const dungeon = getTrialById(id);
      expect(dungeon?.name).toBe(name);
      expect(dungeon?.type).toBe('dungeon');
      expect(dungeon?.bosses.at(-1)?.name).toBe(finalBoss);
    });

    it('does not reuse trial-only boss names (regression for prior mis-attribution)', () => {
      const dungeonBossNames = dungeons.flatMap((d) => d.bosses.map((b) => b.name));
      // These belong to trials (Ossein Cage / Cloudrest / Kyne's Aegis), never dungeons.
      expect(dungeonBossNames).not.toContain('Overfiend Kazpian');
      expect(dungeonBossNames).not.toContain("Z'Maja");
      expect(dungeonBossNames).not.toContain('Lord Falgravn');
    });
  });

  describe('getActivityKindLabel', () => {
    it('maps each type to a human-readable label', () => {
      expect(getActivityKindLabel('trial')).toBe('Trial');
      expect(getActivityKindLabel('dungeon')).toBe('Dungeon');
      expect(getActivityKindLabel('arena')).toBe('Arena');
      expect(getActivityKindLabel('substitute')).toBe('Substitute');
      expect(getActivityKindLabel('general')).toBe('General');
    });
  });

  describe('getGroupedTrials', () => {
    const groups = getGroupedTrials();

    it('returns non-empty groups in the configured order', () => {
      expect(groups.map((g) => g.type)).toEqual([
        'general',
        'trial',
        'dungeon',
        'arena',
        'substitute',
      ]);
    });

    it('places every activity in exactly one group', () => {
      const grouped = groups.flatMap((g) => g.trials);
      expect(grouped.length).toBe(TRIALS.length);
    });

    it('sorts the dungeon group alphabetically by name', () => {
      const dungeonGroup = groups.find((g) => g.type === 'dungeon');
      const names = dungeonGroup?.trials.map((t) => t.name) ?? [];
      const sorted = [...names].sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(sorted);
    });
  });

  describe('setup helpers work for dungeons', () => {
    it('counts boss-only and boss+trash setups', () => {
      const fg1 = getTrialById('FG1');
      const bossCount = fg1?.bosses.length ?? 0;
      expect(getTotalSetupCount('FG1', false)).toBe(bossCount);
      expect(getTotalSetupCount('FG1', true)).toBeGreaterThan(bossCount);
    });

    it('generates a setup structure ending on the final boss', () => {
      const structure = generateSetupStructure('ICP', false);
      expect(structure.at(-1)).toEqual({ type: 'boss', name: 'Lord Warden Dusk' });
    });
  });
});
