/**
 * Visual identity + glass-surface helpers for the Scribing Simulator.
 *
 * The simulator's signature is its three-rune slot system: every scribed skill
 * is composed of a Focus, a Signature and an Affix script, each with its own
 * fixed accent colour. Those three colours thread through the whole page — the
 * slot pickers, the result breakdown and the inscription-progress indicator —
 * so the UI always reads as "three runes composing one skill".
 *
 * Surfaces extend the site's premium cyan-glass card language (gradient fill +
 * hairline border + soft shadow + backdrop blur). Blur is stripped automatically
 * on low-tier devices via the global `html[data-perf='low']` rule, and every
 * surface stays legible without it, so these helpers are safe to use anywhere.
 */

import { alpha, type Theme } from '@mui/material';
import type { SystemStyleObject } from '@mui/system';

import type { ScribingSlot } from '../../application/scribingEngine';

// ---------------------------------------------------------------------------
// Slot triad — the page's signature colour system
// ---------------------------------------------------------------------------

/** In-game slot order: Focus → Signature → Affix. */
export const SLOT_ORDER: readonly ScribingSlot[] = ['focus', 'signature', 'affix'] as const;

/** Fixed accent per slot: amber Focus, cyan Signature, emerald Affix. */
export const SLOT_COLORS: Record<ScribingSlot, string> = {
  focus: '#f59e0b',
  signature: '#38bdf8',
  affix: '#34d399',
};

export const SLOT_LABELS: Record<ScribingSlot, string> = {
  focus: 'Focus',
  signature: 'Signature',
  affix: 'Affix',
};

/** One-line description of what each slot contributes to the skill. */
export const SLOT_ROLE: Record<ScribingSlot, string> = {
  focus: 'Sets the main effect, name & cost',
  signature: 'Adds a unique secondary mechanic',
  affix: 'Bolts on an ESO buff or debuff',
};

// ---------------------------------------------------------------------------
// Skill-line accents (a grimoire's home line)
// ---------------------------------------------------------------------------

const SKILL_LINE_COLORS: Readonly<Record<string, string>> = {
  'Soul Magic': '#a855f7',
  'Destruction Staff': '#f97316',
  'Restoration Staff': '#22c55e',
  'Two Handed': '#f59e0b',
  'One Hand and Shield': '#3b82f6',
  'Dual Wield': '#ef4444',
  Bow: '#14b8a6',
  'Mages Guild': '#8b5cf6',
  'Fighters Guild': '#b45309',
  Assault: '#dc2626',
  Support: '#eab308',
};

export function skillLineColor(line?: string): string {
  return (line && SKILL_LINE_COLORS[line]) || '#38bdf8';
}

// ---------------------------------------------------------------------------
// Resource identity (ESO convention: Magicka blue, Stamina green, Health red)
// ---------------------------------------------------------------------------

export const RESOURCE_META: Readonly<Record<string, { label: string; color: string }>> = {
  magicka: { label: 'Magicka', color: '#3b82f6' },
  stamina: { label: 'Stamina', color: '#22c55e' },
  health: { label: 'Health', color: '#ef4444' },
  hybrid: { label: 'Highest resource', color: '#a855f7' },
};

export function resourceMeta(resource: string): { label: string; color: string } {
  return RESOURCE_META[resource] ?? { label: resource, color: '#38bdf8' };
}

// ---------------------------------------------------------------------------
// Glass surfaces
// ---------------------------------------------------------------------------

/**
 * The primary glass panel surface — a frosted, gradient-filled card that matches
 * the site's premium cards. Pass an `accent` to tint the border/glow.
 */
export const glassPanelSx = (
  theme: Theme,
  opts: { accent?: string; radius?: number } = {},
): SystemStyleObject<Theme> => {
  const dark = theme.palette.mode === 'dark';
  const accent = opts.accent;
  const radius = opts.radius ?? 20;
  return {
    position: 'relative',
    borderRadius: `${radius}px`,
    border: '1px solid',
    borderColor: accent
      ? alpha(accent, dark ? 0.3 : 0.28)
      : dark
        ? alpha('#ffffff', 0.08)
        : alpha('#0f172a', 0.08),
    background: dark
      ? `linear-gradient(180deg, ${alpha('#101a2e', 0.74)} 0%, ${alpha('#05080f', 0.74)} 100%)`
      : `linear-gradient(180deg, ${alpha('#eef4fb', 0.85)} 0%, ${alpha('#ffffff', 0.96)} 100%)`,
    backdropFilter: 'blur(16px) saturate(1.4)',
    WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
    boxShadow: dark
      ? `0 18px 50px ${alpha('#000000', 0.4)}, inset 0 1px 0 ${alpha('#ffffff', 0.05)}`
      : `0 12px 36px ${alpha('#0f172a', 0.1)}, inset 0 1px 0 ${alpha('#ffffff', 0.9)}`,
  };
};

/** A glossy pill chip (hero stats, meta) on the glass surface. */
export const statChipSx = (theme: Theme, accent?: string): SystemStyleObject<Theme> => {
  const dark = theme.palette.mode === 'dark';
  const c = accent ?? theme.palette.primary.main;
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.75,
    px: 1.25,
    py: 0.6,
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    lineHeight: 1,
    color: dark ? alpha('#ffffff', 0.86) : alpha('#0f172a', 0.78),
    border: '1px solid',
    borderColor: alpha(c, dark ? 0.32 : 0.28),
    background: dark
      ? `linear-gradient(180deg, ${alpha(c, 0.14)} 0%, ${alpha(c, 0.04)} 100%)`
      : `linear-gradient(180deg, ${alpha(c, 0.1)} 0%, ${alpha('#ffffff', 0.6)} 100%)`,
    boxShadow: dark
      ? `inset 0 1px 0 ${alpha('#ffffff', 0.08)}`
      : `inset 0 1px 0 ${alpha('#ffffff', 0.8)}`,
  };
};
