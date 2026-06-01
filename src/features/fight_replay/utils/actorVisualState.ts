import { DARK_ROLE_COLORS } from '../../../utils/roleColors';
import { ActorPosition } from '../../../workers/calculations/CalculateActorPositions';

type ActorVisualInput = Pick<ActorPosition, 'type' | 'role' | 'isDead'> | null | undefined;

export const REPLAY_ACTOR_COLORS = {
  dps: DARK_ROLE_COLORS.dps,
  tank: DARK_ROLE_COLORS.tank,
  healer: DARK_ROLE_COLORS.healer,
  defaultPlayer: '#94a3b8',
  boss: '#c084fc',
  enemy: '#fb7185',
  friendlyNpc: '#34d399',
  pet: '#f59e0b',
  dead: '#64748b',
  core: '#f8fafc',
  shell: '#020617',
} as const;

const HEX_PAIR_LENGTH = 2;
const HEX_CHANNEL_MAX = 255;

function normalizeHex(hex: string): string {
  return hex.startsWith('#') ? hex.slice(1) : hex;
}

function toHexChannel(value: number): string {
  return Math.round(Math.max(0, Math.min(HEX_CHANNEL_MAX, value)))
    .toString(16)
    .padStart(HEX_PAIR_LENGTH, '0');
}

function blendHex(from: string, to: string, amount: number): string {
  const normalizedFrom = normalizeHex(from);
  const normalizedTo = normalizeHex(to);
  const clampedAmount = Math.max(0, Math.min(1, amount));

  const fromRgb = [0, 2, 4].map((offset) =>
    Number.parseInt(normalizedFrom.slice(offset, offset + HEX_PAIR_LENGTH), 16),
  );
  const toRgb = [0, 2, 4].map((offset) =>
    Number.parseInt(normalizedTo.slice(offset, offset + HEX_PAIR_LENGTH), 16),
  );

  return `#${fromRgb
    .map((channel, index) => toHexChannel(channel + (toRgb[index] - channel) * clampedAmount))
    .join('')}`;
}

export function getReplayActorAccentColor(actor: ActorVisualInput): string {
  if (!actor) {
    return REPLAY_ACTOR_COLORS.defaultPlayer;
  }

  if (actor.isDead) {
    return REPLAY_ACTOR_COLORS.dead;
  }

  if (actor.type === 'player') {
    if (actor.role === 'tank') {
      return REPLAY_ACTOR_COLORS.tank;
    }
    if (actor.role === 'healer') {
      return REPLAY_ACTOR_COLORS.healer;
    }
    if (actor.role === 'dps') {
      return REPLAY_ACTOR_COLORS.dps;
    }
    return REPLAY_ACTOR_COLORS.defaultPlayer;
  }

  if (actor.type === 'boss') {
    return REPLAY_ACTOR_COLORS.boss;
  }
  if (actor.type === 'enemy') {
    return REPLAY_ACTOR_COLORS.enemy;
  }
  if (actor.type === 'friendly_npc') {
    return REPLAY_ACTOR_COLORS.friendlyNpc;
  }
  if (actor.type === 'pet') {
    return REPLAY_ACTOR_COLORS.pet;
  }

  return REPLAY_ACTOR_COLORS.defaultPlayer;
}

export function getReplayActorCoreColor(actor: ActorVisualInput): string {
  const accent = getReplayActorAccentColor(actor);
  return actor?.isDead
    ? blendHex(accent, REPLAY_ACTOR_COLORS.shell, 0.38)
    : blendHex(accent, '#ffffff', 0.18);
}

export function getReplayActorShellColor(actor: ActorVisualInput): string {
  const accent = getReplayActorAccentColor(actor);
  return actor?.isDead
    ? blendHex(accent, REPLAY_ACTOR_COLORS.shell, 0.72)
    : blendHex(accent, REPLAY_ACTOR_COLORS.shell, 0.48);
}

export function getReplayActorHaloColor(actor: ActorVisualInput): string {
  const accent = getReplayActorAccentColor(actor);
  return actor?.isDead ? blendHex(accent, REPLAY_ACTOR_COLORS.shell, 0.5) : accent;
}

export function getReplayActorLabelColor(actor: ActorVisualInput): string {
  return actor?.isDead ? '#cbd5e1' : getReplayActorCoreColor(actor);
}
