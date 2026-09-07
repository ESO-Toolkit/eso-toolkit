import { TRIALS } from '../features/loadout-manager/data/trialConfigs';
import { ZONE_NAMES } from '../types/zoneScaleData';

import { CONTENT_ZONES, getContentZone, getDungeonBossCount, isTrialZone } from './esoContentZones';

/** Every dungeon the loadout-manager activity configs know about. */
const DUNGEON_NAMES = TRIALS.filter((activity) => activity.type === 'dungeon').map(
  (activity) => activity.name,
);

const dungeonZones = Object.values(CONTENT_ZONES).filter((zone) => zone.type === 'dungeon');

describe('CONTENT_ZONES trials', () => {
  it('keeps a row for every trial in ZONE_NAMES', () => {
    for (const [id, name] of Object.entries(ZONE_NAMES)) {
      const zone = getContentZone(Number(id));
      expect(zone).toMatchObject({ zoneId: Number(id), name, type: 'trial' });
    }
  });

  it('reports trials as trials', () => {
    expect(isTrialZone(1196)).toBe(true); // Kyne's Aegis
    expect(isTrialZone(636)).toBe(true); // Hel Ra Citadel
  });
});

describe('CONTENT_ZONES dungeons', () => {
  it('enumerates all 58 group dungeons', () => {
    expect(DUNGEON_NAMES).toHaveLength(58);
    expect(dungeonZones).toHaveLength(58);
  });

  it('uses names that match the curated dungeon rosters exactly', () => {
    // The join to `expectedBossCount` is a plain lowercased-name lookup, so any
    // drift here silently drops the boss count rather than failing loudly.
    expect(dungeonZones.map((zone) => zone.name).sort()).toEqual([...DUNGEON_NAMES].sort());
  });

  it('gives every dungeon a distinct in-game zone id that no trial claims', () => {
    const ids = dungeonZones.map((zone) => zone.zoneId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(ZONE_NAMES[id]).toBeUndefined();
    }
  });

  it('carries the curated boss count for every dungeon', () => {
    for (const zone of dungeonZones) {
      expect(zone.expectedBossCount).toBe(getDungeonBossCount(zone.name));
      expect(zone.expectedBossCount).toBeGreaterThan(0);
    }
  });

  it('resolves observed zone ids to the right dungeon', () => {
    // Spot checks across the whole release range, each read from a real
    // `fight.gameZone` in the zone-10 report sample.
    expect(getContentZone(11)).toMatchObject({ name: 'Vaults of Madness', type: 'dungeon' });
    expect(getContentZone(283)).toMatchObject({ name: 'Fungal Grotto I', type: 'dungeon' });
    expect(getContentZone(930)).toMatchObject({ name: 'Darkshade Caverns II', type: 'dungeon' });
    expect(getContentZone(1153)).toMatchObject({ name: 'Unhallowed Grave', type: 'dungeon' });
    expect(getContentZone(1552)).toMatchObject({ name: 'Black Gem Foundry', type: 'dungeon' });
  });

  it('does not report dungeons as trials', () => {
    for (const zone of dungeonZones) {
      expect(isTrialZone(zone.zoneId)).toBe(false);
    }
  });
});

describe('getContentZone', () => {
  it('returns undefined for unknown, null and undefined ids', () => {
    expect(getContentZone(999_999)).toBeUndefined();
    expect(getContentZone(null)).toBeUndefined();
    expect(getContentZone(undefined)).toBeUndefined();
  });
});

describe('getDungeonBossCount', () => {
  it('matches case-insensitively and tolerates missing names', () => {
    expect(getDungeonBossCount('unhallowed grave')).toBe(getDungeonBossCount('Unhallowed Grave'));
    expect(getDungeonBossCount('Not A Dungeon')).toBeUndefined();
    expect(getDungeonBossCount(null)).toBeUndefined();
  });
});
