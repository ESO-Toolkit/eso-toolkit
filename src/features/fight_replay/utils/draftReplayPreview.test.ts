import {
  DRAFT_REPLAY_ACTOR_ID,
  DRAFT_REPLAY_DURATION_MS,
  buildDraftReplayFight,
  buildDraftReplayLookup,
} from './draftReplayPreview';

describe('buildDraftReplayLookup', () => {
  it('creates regular samples including both ends of the preview loop', () => {
    const lookup = buildDraftReplayLookup({ name: 'Wolf', kind: 'lesser' });

    expect(lookup.sortedTimestamps).toHaveLength(301);
    expect(Object.keys(lookup.positionsByTimestamp)).toHaveLength(301);
    expect(lookup.sortedTimestamps).toEqual(Array.from({ length: 301 }, (_, index) => index * 100));
    expect(lookup).toMatchObject({
      fightDuration: DRAFT_REPLAY_DURATION_MS,
      fightStartTime: 0,
      sampleInterval: 100,
      hasRegularIntervals: true,
    });
    expect(lookup.positionsByTimestamp[DRAFT_REPLAY_DURATION_MS]).toEqual(
      lookup.positionsByTimestamp[0],
    );
  });

  it.each([
    ['boss', 'boss'],
    ['lesser', 'enemy'],
  ] as const)(
    'represents a %s draft with its hostile class and three reference roles',
    (kind, type) => {
      const lookup = buildDraftReplayLookup({ name: 'Selected Draft', kind });
      const actors = lookup.positionsByTimestamp[0];

      expect(actors[DRAFT_REPLAY_ACTOR_ID]).toMatchObject({
        id: DRAFT_REPLAY_ACTOR_ID,
        name: 'Selected Draft',
        type,
      });
      expect(lookup.actorIds).toHaveLength(4);
      expect(new Set(lookup.actorIds).size).toBe(4);
      expect(Object.values(actors).filter((actor) => actor.type === 'player')).toEqual([
        expect.objectContaining({ name: 'Preview Tank', role: 'tank' }),
        expect.objectContaining({ name: 'Preview Healer', role: 'healer' }),
        expect.objectContaining({ name: 'Preview Damage', role: 'dps' }),
      ]);
    },
  );

  it('moves within the preview area with stable actor IDs and finite grounded poses', () => {
    const lookup = buildDraftReplayLookup({ name: 'Count Ryelaz', kind: 'boss' });

    for (const frame of Object.values(lookup.positionsByTimestamp)) {
      expect(Object.values(frame).map((actor) => actor.id)).toEqual(lookup.actorIds);
      const hostile = frame[DRAFT_REPLAY_ACTOR_ID];
      expect(hostile.position[0]).toBeGreaterThanOrEqual(48);
      expect(hostile.position[0]).toBeLessThanOrEqual(52);
      expect(hostile.position[2]).toBeGreaterThanOrEqual(48);
      expect(hostile.position[2]).toBeLessThanOrEqual(52);
      for (const actor of Object.values(frame)) {
        expect(actor.position[1]).toBe(0);
        expect(actor.position.every(Number.isFinite)).toBe(true);
        expect(Number.isFinite(actor.rotation)).toBe(true);
        expect(actor.isDead).toBe(false);
      }
    }
    expect(lookup.positionsByTimestamp[7500][DRAFT_REPLAY_ACTOR_ID].position).not.toEqual(
      lookup.positionsByTimestamp[0][DRAFT_REPLAY_ACTOR_ID].position,
    );
  });
});

describe('buildDraftReplayFight', () => {
  it('labels the synthetic fight and supplies matching bounds and timeline metadata', () => {
    expect(buildDraftReplayFight('Wolf')).toEqual({
      id: -1,
      name: 'Wolf - simulated draft preview',
      encounterID: 0,
      startTime: 0,
      endTime: DRAFT_REPLAY_DURATION_MS,
      boundingBox: { minX: 1000, maxX: 9000, minY: 1000, maxY: 9000 },
    });
  });
});
