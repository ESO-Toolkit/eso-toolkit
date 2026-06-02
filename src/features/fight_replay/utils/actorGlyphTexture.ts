import * as THREE from 'three';

import { ActorPosition } from '../../../workers/calculations/CalculateActorPositions';

import { getReplayActorAccentColor } from './actorVisualState';

/**
 * Small canvas-baked glyph textures for the actor-marker A/B/C proto (variants B and C).
 *
 * A glyph identifies an actor's role/type at a glance on a camera-facing card (B) or a baked
 * cap plane (C). Textures are cached per (symbol|color) key and shared across actors, so a
 * 50-actor raid uploads a handful of small textures, not 50. The cache is process-global and
 * intentionally never disposed during a session — the key space is tiny (a few roles × a few
 * colors) and these outlive any single fight; disposing on unmount would thrash re-uploads when
 * flipping variants. This is a judging proto, not a ship surface.
 */

const GLYPH_TEXTURE_SIZE = 128;

export type GlyphSymbol = 'tank' | 'healer' | 'dps' | 'boss' | 'enemy' | 'npc' | 'pet' | 'dot';

/** Every glyph symbol, for pre-building the finite set of instanced glyph groups. */
export const GLYPH_SYMBOLS: readonly GlyphSymbol[] = [
  'tank',
  'healer',
  'dps',
  'boss',
  'enemy',
  'npc',
  'pet',
  'dot',
];

const textureCache = new Map<string, THREE.CanvasTexture>();

function symbolForActor(actor: ActorPosition | null | undefined): GlyphSymbol {
  if (!actor) return 'dot';
  if (actor.type === 'player') {
    if (actor.role === 'tank') return 'tank';
    if (actor.role === 'healer') return 'healer';
    if (actor.role === 'dps') return 'dps';
    return 'dot';
  }
  if (actor.type === 'boss') return 'boss';
  if (actor.type === 'enemy') return 'enemy';
  if (actor.type === 'friendly_npc') return 'npc';
  if (actor.type === 'pet') return 'pet';
  return 'dot';
}

function glyphCharacter(symbol: GlyphSymbol): string {
  switch (symbol) {
    case 'tank':
      return 'T';
    case 'healer':
      return '+';
    case 'dps':
      return '⚔';
    case 'boss':
      return '★';
    case 'enemy':
      return '✦';
    case 'npc':
      return '◆';
    case 'pet':
      return '●';
    default:
      return '•';
  }
}

function drawGlyph(symbol: GlyphSymbol, color: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = GLYPH_TEXTURE_SIZE;
  canvas.height = GLYPH_TEXTURE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // Degrade gracefully — an empty transparent texture rather than a throw inside render.
    return new THREE.CanvasTexture(canvas);
  }

  const center = GLYPH_TEXTURE_SIZE / 2;
  ctx.clearRect(0, 0, GLYPH_TEXTURE_SIZE, GLYPH_TEXTURE_SIZE);

  // Disc background so the glyph reads over any map texture.
  ctx.beginPath();
  ctx.arc(center, center, center - 6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(2, 6, 23, 0.82)';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Glyph.
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(GLYPH_TEXTURE_SIZE * 0.5)}px Inter, system-ui, Segoe UI, Arial, sans-serif`;
  ctx.fillText(glyphCharacter(symbol), center, center + 4);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 2;
  texture.needsUpdate = true;
  return texture;
}

/** Get a cached glyph texture for an actor's role/type, tinted by its accent color. */
export function getActorGlyphTexture(actor: ActorPosition | null | undefined): THREE.CanvasTexture {
  const symbol = symbolForActor(actor);
  const color = getReplayActorAccentColor(actor);
  const key = `${symbol}|${color}`;

  const cached = textureCache.get(key);
  if (cached) {
    return cached;
  }

  const texture = drawGlyph(symbol, color);
  textureCache.set(key, texture);
  return texture;
}

/** The glyph symbol for an actor (role/type), exposed for instanced glyph grouping. */
export function getActorGlyphSymbol(actor: ActorPosition | null | undefined): GlyphSymbol {
  return symbolForActor(actor);
}

/**
 * The "alive" accent color for a glyph symbol, used to bake one stable glyph texture per symbol
 * group in the instanced renderer. Dead state is conveyed by dimming (per-instance opacity), not
 * by re-tinting, so the group texture stays constant and the group never needs to be rebuilt.
 */
export function getGlyphSymbolColor(symbol: GlyphSymbol): string {
  switch (symbol) {
    case 'tank':
      return getReplayActorAccentColor({ type: 'player', role: 'tank', isDead: false });
    case 'healer':
      return getReplayActorAccentColor({ type: 'player', role: 'healer', isDead: false });
    case 'dps':
      return getReplayActorAccentColor({ type: 'player', role: 'dps', isDead: false });
    case 'boss':
      return getReplayActorAccentColor({ type: 'boss', isDead: false });
    case 'enemy':
      return getReplayActorAccentColor({ type: 'enemy', isDead: false });
    case 'npc':
      return getReplayActorAccentColor({ type: 'friendly_npc', isDead: false });
    case 'pet':
      return getReplayActorAccentColor({ type: 'pet', isDead: false });
    default:
      return getReplayActorAccentColor({ type: 'player', isDead: false });
  }
}

/** Get the stable glyph texture for a symbol group (alive color), used by the instanced renderer. */
export function getGlyphTextureForSymbol(symbol: GlyphSymbol): THREE.CanvasTexture {
  const color = getGlyphSymbolColor(symbol);
  const key = `${symbol}|${color}`;
  const cached = textureCache.get(key);
  if (cached) {
    return cached;
  }
  const texture = drawGlyph(symbol, color);
  textureCache.set(key, texture);
  return texture;
}
