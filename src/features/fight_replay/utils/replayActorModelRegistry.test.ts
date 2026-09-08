import {
  NPC_MODEL_PREVIEW_PARAM,
  REPLAY_ACTOR_MODEL_ASSETS,
  parseNpcModelPreviewMode,
  resolveReplayActorModel,
} from './replayActorModelRegistry';

describe('replayActorModelRegistry', () => {
  it('uses the licensed humanoid for players in every mode', () => {
    expect(resolveReplayActorModel({ type: 'player' }, 'off')?.id).toBe('cool-stickman-flipbook');
    expect(resolveReplayActorModel({ type: 'player' }, 'prototype')?.id).toBe(
      'cool-stickman-flipbook',
    );
  });

  it('keeps hostile NPCs on capsules unless prototype mode is explicitly enabled', () => {
    expect(resolveReplayActorModel({ type: 'enemy' }, 'off')).toBeNull();
    expect(resolveReplayActorModel({ type: 'boss' }, 'off')).toBeNull();
    expect(resolveReplayActorModel({ type: 'enemy' }, 'prototype')?.renderer).toBe(
      'instanced-pose-flipbook',
    );
    expect(resolveReplayActorModel({ type: 'boss' }, 'prototype')?.renderer).toBe(
      'instanced-pose-flipbook',
    );
  });

  it('keeps friendly NPCs and pets on the fallback in prototype mode', () => {
    expect(resolveReplayActorModel({ type: 'friendly_npc' }, 'prototype')).toBeNull();
    expect(resolveReplayActorModel({ type: 'pet' }, 'prototype')).toBeNull();
  });

  it('only accepts the documented exact opt-in query value', () => {
    expect(NPC_MODEL_PREVIEW_PARAM).toBe('npcModels');
    expect(parseNpcModelPreviewMode('prototype')).toBe('prototype');
    expect(parseNpcModelPreviewMode(null)).toBe('off');
    expect(parseNpcModelPreviewMode('true')).toBe('off');
    expect(parseNpcModelPreviewMode('Prototype')).toBe('off');
  });

  it('records provenance for every shipped model asset', () => {
    for (const asset of Object.values(REPLAY_ACTOR_MODEL_ASSETS)) {
      expect(asset.path).toMatch(/^models\/.+\.glb$/);
      expect(asset.license.spdx).toBeTruthy();
      expect(asset.license.author).toBeTruthy();
      expect(asset.license.sourceUrl).toMatch(/^https:\/\//);
      expect(asset.license.attributionFile).toMatch(/^public\/models\/LICENSE-/);
    }
  });
});
