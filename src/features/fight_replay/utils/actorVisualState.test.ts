import {
  REPLAY_ACTOR_COLORS,
  getReplayActorAccentColor,
  getReplayActorCoreColor,
  getReplayActorLabelColor,
  getReplayActorShellColor,
} from './actorVisualState';

describe('actorVisualState', () => {
  it('uses role colors for living players', () => {
    expect(getReplayActorAccentColor({ type: 'player', role: 'tank', isDead: false })).toBe(
      REPLAY_ACTOR_COLORS.tank,
    );
    expect(getReplayActorAccentColor({ type: 'player', role: 'healer', isDead: false })).toBe(
      REPLAY_ACTOR_COLORS.healer,
    );
    expect(getReplayActorAccentColor({ type: 'player', role: 'dps', isDead: false })).toBe(
      REPLAY_ACTOR_COLORS.dps,
    );
  });

  it('uses semantic colors for non-player actors', () => {
    expect(getReplayActorAccentColor({ type: 'boss', isDead: false })).toBe(
      REPLAY_ACTOR_COLORS.boss,
    );
    expect(getReplayActorAccentColor({ type: 'enemy', isDead: false })).toBe(
      REPLAY_ACTOR_COLORS.enemy,
    );
    expect(getReplayActorAccentColor({ type: 'friendly_npc', isDead: false })).toBe(
      REPLAY_ACTOR_COLORS.friendlyNpc,
    );
    expect(getReplayActorAccentColor({ type: 'pet', isDead: false })).toBe(REPLAY_ACTOR_COLORS.pet);
  });

  it('mutes dead actors consistently', () => {
    const actor = { type: 'player' as const, role: 'dps' as const, isDead: true };

    expect(getReplayActorAccentColor(actor)).toBe(REPLAY_ACTOR_COLORS.dead);
    expect(getReplayActorCoreColor(actor)).toMatch(/^#[0-9a-f]{6}$/);
    expect(getReplayActorShellColor(actor)).toMatch(/^#[0-9a-f]{6}$/);
    expect(getReplayActorLabelColor(actor)).toBe('#cbd5e1');
  });
});
