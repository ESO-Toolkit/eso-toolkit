import { STATIC_BOSS_REPLAY_MODELS, resolveStaticBossReplayModel } from './replayBossModelRegistry';

describe('replayBossModelRegistry', () => {
  it('resolves Yandir for boss and enemy classifications', () => {
    expect(resolveStaticBossReplayModel({ type: 'boss', name: ' YANDIR   THE BUTCHER ' })).toBe(
      STATIC_BOSS_REPLAY_MODELS.yandirTheButcher,
    );
    expect(resolveStaticBossReplayModel({ type: 'enemy', name: 'Yandir the Butcher' })).toBe(
      STATIC_BOSS_REPLAY_MODELS.yandirTheButcher,
    );
  });

  it('rejects partial names and non-hostile actors', () => {
    expect(resolveStaticBossReplayModel({ type: 'boss', name: 'Yandir' })).toBeNull();
    expect(
      resolveStaticBossReplayModel({ type: 'friendly_npc', name: 'Yandir the Butcher' }),
    ).toBeNull();
    expect(resolveStaticBossReplayModel({ type: 'player', name: 'Yandir the Butcher' })).toBeNull();
  });

  it('records a model path and provenance file for every asset', () => {
    for (const asset of Object.values(STATIC_BOSS_REPLAY_MODELS)) {
      expect(asset.path).toMatch(/^models\/.+\.glb$/);
      expect(asset.provenanceFile).toMatch(/^public\/models\/.+\.md$/);
    }
  });
});
