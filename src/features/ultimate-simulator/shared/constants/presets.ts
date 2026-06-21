/**
 * Archetype PRESETS — what a typical build of each (context × role) actually runs.
 *
 * The Solo/Group/PvP context and the DPS/Healer/Tank role used to be inert: every
 * context- and role-specific catalog source is `defaultEnabled: false`, so all
 * nine (context × role) combinations produced an identical headline number. These
 * presets fix that — picking a context + role seeds a realistic set of enabled
 * sources at realistic uptimes, so the result is meaningful out of the box and
 * visibly changes as you switch.
 *
 * Nothing here invents new numbers. A preset only *selects* which catalog sources
 * a typical build of that archetype runs and at what uptime — every per-source
 * rate and its provenance still live in `catalog.ts`. The uptime overrides stay
 * within the ranges those sourced catalog notes already justify (e.g. Minor
 * Heroism from a 45s-cooldown Essence of Heroism potion ≈ 33% uptime, not the
 * catalog's optimistic 90% set-maintained default).
 *
 * Design (verified by an adversarial ESO-theorycraft review):
 *  - A preset touches ONLY the source layer (which sources are enabled + their
 *    uptime). It never sets Decisive, fight length, the chosen ultimate, starting
 *    ultimate, or the Pillager's wearer cost — those are the user's scenario.
 *  - `enableClassProc` turns on the current class's primary ultimate-generation
 *    passive (resolved per-class below); Sorcerer and Warden have none.
 *  - Minor and Major Heroism never appear together (they are the same buff at two
 *    tiers — Major overrides Minor, they do not stack).
 *  - Every `enabledSourceIds` entry is gated-valid for its archetype (a source
 *    whose `availableIn`/`roles` excludes the archetype would be silently dropped
 *    by `compileSources`; the preset data-integrity test guards against that).
 */

import type { CombatContext, CombatRole, EsoClass } from '../types/catalog';

import { ULTIMATE_SOURCE_CATALOG } from './catalog';

/**
 * A typical-build preset for one (context × role) archetype.
 *
 * `enabledSourceIds` lists the archetype-specific sources to enable *on top of*
 * the always-on base income and (when `enableClassProc`) the class proc.
 */
export interface ArchetypePreset {
  /** Stable id, `${context}-${role}` (e.g. 'groupPve-dps'). */
  readonly id: string;
  readonly context: CombatContext;
  readonly role: CombatRole;
  /** Enable the current class's primary ult-gen passive (Sorc/Warden: no-op). */
  readonly enableClassProc: boolean;
  /** Light/heavy-attack (base income) uptime for this archetype. */
  readonly baseUptime: number;
  /** Archetype-specific source ids to enable (besides base + class proc). */
  readonly enabledSourceIds: readonly string[];
  /** Per-source uptime overrides; sources omitted keep their catalog default. */
  readonly uptimeOverrides: Readonly<Record<string, number>>;
  /** One-line, player-facing description of the build this models. */
  readonly summary: string;
  /** 2–4 short caveats explaining what the numbers assume. */
  readonly assumptions: readonly string[];
}

/**
 * The current class's primary ultimate-GENERATION passive id (the one a typical
 * build of that class runs). Sorcerer (Power Stone is a cost *reduction*) and
 * Warden (no native ult-gen passive in U50) resolve to null — they intentionally
 * read as structurally lower, which the explainer copy calls out.
 */
export const CLASS_PRIMARY_PROC_ID: Record<EsoClass, string | null> = {
  arcanist: 'arcanist-implacable-outcome',
  dragonknight: 'dragonknight-mountains-blessing',
  necromancer: 'necromancer-corpse-consumption',
  nightblade: 'nightblade-catalyst',
  sorcerer: null,
  templar: 'templar-prism',
  warden: null,
};

export const classPrimaryProcId = (esoClass: EsoClass): string | null =>
  CLASS_PRIMARY_PROC_ID[esoClass];

/**
 * The 9-archetype matrix. Indexed `[context][role]`. Each enables the realistic
 * set of sources for that archetype, grounded in the catalog's sourced rates.
 */
export const ARCHETYPE_PRESETS: Record<CombatContext, Record<CombatRole, ArchetypePreset>> = {
  soloPve: {
    dps: {
      id: 'soloPve-dps',
      context: 'soloPve',
      role: 'dps',
      enableClassProc: true,
      baseUptime: 0.97,
      enabledSourceIds: ['minor-heroism'],
      uptimeOverrides: { 'minor-heroism': 0.33 },
      summary:
        'Self-sufficient parse: near-full weaving, your class proc, Heroism from potions only.',
      assumptions: [
        'No group buffs available solo — only self-sourced income.',
        'Minor Heroism from Essence of Heroism potions (~33% uptime over the 45s potion cooldown).',
        'Class ult-gen proc assumes its trigger is in your rotation; Sorcerer & Warden have none.',
        'A solo DK can hold Major Heroism via Basalt-Blooded Warrior — toggle Major (it overrides Minor) if you run it.',
      ],
    },
    healer: {
      id: 'soloPve-healer',
      context: 'soloPve',
      role: 'healer',
      enableClassProc: true,
      baseUptime: 0.9,
      enabledSourceIds: ['minor-heroism'],
      uptimeOverrides: { 'minor-heroism': 0.33 },
      summary:
        'Solo self-healer weaving between heals, with Heroism from potions and your class proc.',
      assumptions: [
        'No group buffs solo — you self-DPS and weave between heals (slightly lower LA uptime than a pure parse).',
        'Minor Heroism from Essence of Heroism potions (~33% uptime).',
        'Class proc assumes its trigger is slotted; Sorcerer & Warden have none.',
      ],
    },
    tank: {
      id: 'soloPve-tank',
      context: 'soloPve',
      role: 'tank',
      enableClassProc: true,
      baseUptime: 0.8,
      enabledSourceIds: ['bloodspawn', 'minor-heroism'],
      uptimeOverrides: { bloodspawn: 0.6, 'minor-heroism': 0.33 },
      summary:
        'Self-tank: Bloodspawn procs from incoming hits, plus Heroism potions and your class proc.',
      assumptions: [
        "Bloodspawn uptime assumes you're actively soaking damage (~0.7 ult/s when constantly hit).",
        'Block-heavy play lowers light-attack uptime versus a DPS parse.',
        'Minor Heroism from potions only; class proc assumes its trigger is slotted (Sorcerer & Warden have none).',
      ],
    },
  },
  groupPve: {
    dps: {
      id: 'groupPve-dps',
      context: 'groupPve',
      role: 'dps',
      enableClassProc: true,
      baseUptime: 0.97,
      enabledSourceIds: ['minor-heroism', 'arkasis-genius-external'],
      uptimeOverrides: { 'minor-heroism': 0.6 },
      summary:
        'Optimized raid parse: full weaving, set/support Minor Heroism, and Arkasis ult batteries from a support.',
      assumptions: [
        'Minor Heroism is the realistic class-agnostic group buff (Heroism set, scribing, or battery) — swap to Major if a Warden scrip / Drake’s Rush support provides it.',
        "Assumes a support wears Arkasis's Genius and pots on cooldown (~1 ult/s, the strongest group-exclusive income).",
        'Class ult-gen proc assumes its rotation trigger is present; Sorcerer & Warden have none.',
        "Kraglen's Howl synergy is optional — toggle it on for add-heavy pulls (near-zero on clean single-target).",
      ],
    },
    healer: {
      id: 'groupPve-healer',
      context: 'groupPve',
      role: 'healer',
      enableClassProc: true,
      baseUptime: 0.85,
      enabledSourceIds: ['major-heroism', 'arkasis-genius-external'],
      uptimeOverrides: { 'major-heroism': 0.55 },
      summary: 'Support healer: holds Major Heroism for the group and receives Arkasis batteries.',
      assumptions: [
        'Major Heroism assumes a Warden / scribed source maintaining it; if not, switch to Minor and lower its uptime.',
        "You're usually the Pillager's Profit WEARER (you grant it, you don't receive it) — so it's not in this default; a second support's Arkasis is the realistic incoming source.",
        'Lower light-attack uptime than DPS — time spent purging, shielding and casting heals.',
        'Class proc assumes its trigger is slotted; Sorcerer & Warden have none.',
      ],
    },
    tank: {
      id: 'groupPve-tank',
      context: 'groupPve',
      role: 'tank',
      enableClassProc: true,
      baseUptime: 0.8,
      enabledSourceIds: [
        'major-heroism',
        'bloodspawn',
        'pillagers-profit-external',
        'arkasis-genius-external',
      ],
      uptimeOverrides: { 'major-heroism': 0.5, bloodspawn: 0.6 },
      summary:
        'Raid tank: Bloodspawn from incoming hits, Major Heroism, and group ult batteries (Pillager’s + Arkasis).',
      assumptions: [
        "Bloodspawn (tank-only) assumes you're actively soaking damage (~0.7 ult/s).",
        'Major Heroism from DK Basalt-Blooded or a support buff (~50%); drop to Minor if your build can’t hold it.',
        "Pillager's Profit: set the WEARER's (healer's) ult cost below — a ~250 ult ≈ 0.55 ult/s.",
        'Assumes a support wears Arkasis and pots on cooldown; block-heavy play lowers light-attack uptime.',
      ],
    },
  },
  pvp: {
    dps: {
      id: 'pvp-dps',
      context: 'pvp',
      role: 'dps',
      enableClassProc: true,
      baseUptime: 0.6,
      enabledSourceIds: ['minor-heroism', 'colovian-highlands-general-external'],
      uptimeOverrides: { 'minor-heroism': 0.4 },
      summary:
        'PvP pressure build: intermittent weaving, Minor Heroism from sets/potions, ult from allied kills.',
      assumptions: [
        'PvP light-attack uptime is low — lots of blocking, breaking free, dodge-rolling and repositioning.',
        'Minor Heroism more reliably slotted in PvP (sets/potions, ~40%); swap to Major only in organized groups.',
        'Colovian Highlands General is bursty (allied player kills) — averages ~0.2 ult/s, spikes in active fights.',
        'Class proc assumes its trigger is slotted; Sorcerer & Warden have none.',
      ],
    },
    healer: {
      id: 'pvp-healer',
      context: 'pvp',
      role: 'healer',
      enableClassProc: true,
      baseUptime: 0.5,
      enabledSourceIds: ['minor-heroism', 'arkays-charity-external'],
      uptimeOverrides: { 'minor-heroism': 0.4 },
      summary:
        'PvP support healer: low weaving uptime, Minor Heroism, and ult from being cleansed by allies.',
      assumptions: [
        'Very low light-attack uptime — busy purging, shielding and holding line-of-sight.',
        'Minor Heroism from sets/potions (~40%).',
        "Arkay's Charity is situational (only when an ally cleanses a debuff off you) — modeled at 25%, near-zero with no debuffs.",
        'Class proc assumes its trigger is slotted; Sorcerer & Warden have none.',
      ],
    },
    tank: {
      id: 'pvp-tank',
      context: 'pvp',
      role: 'tank',
      enableClassProc: true,
      baseUptime: 0.55,
      enabledSourceIds: ['bloodspawn', 'minor-heroism', 'colovian-highlands-general-external'],
      uptimeOverrides: { bloodspawn: 0.5, 'minor-heroism': 0.4 },
      summary:
        'PvP brawler: Bloodspawn from constant incoming hits, Minor Heroism, and ult from allied kills.',
      assumptions: [
        'Heavy block uptime suppresses light attacks — low weaving uptime.',
        'Bloodspawn (tank-only) thrives on a brawler taking constant damage (~50%).',
        'Minor Heroism from sets/potions (~40%); Colovian Highlands General is bursty from allied kills.',
        'Class proc assumes its trigger is slotted; Sorcerer & Warden have none.',
      ],
    },
  },
};

/** The preset for a given archetype. */
export const getArchetypePreset = (context: CombatContext, role: CombatRole): ArchetypePreset =>
  ARCHETYPE_PRESETS[context][role];

/** Flat list of all presets (for data-integrity tests + iteration). */
export const ALL_ARCHETYPE_PRESETS: readonly ArchetypePreset[] = Object.values(
  ARCHETYPE_PRESETS,
).flatMap((byRole) => Object.values(byRole));

/**
 * Resolve a preset into concrete engine override maps for a given class.
 *
 * Returns an `enabledOverrides` that sets an explicit boolean for EVERY catalog
 * generation source (so applying a preset is deterministic — no stale source is
 * left enabled from a previous archetype) plus a `uptimeOverrides` carrying the
 * base-income uptime and the preset's per-source uptimes. Cost-reduction toggles
 * are intentionally NOT included here — a preset never changes a class's ultimate
 * cost reduction; the hook preserves those separately.
 */
export function resolvePresetOverrides(
  preset: ArchetypePreset,
  esoClass: EsoClass,
): { enabledOverrides: Record<string, boolean>; uptimeOverrides: Record<string, number> } {
  const enabledIds = new Set<string>(['base-light-attack', ...preset.enabledSourceIds]);
  if (preset.enableClassProc) {
    const proc = classPrimaryProcId(esoClass);
    if (proc) enabledIds.add(proc);
  }

  const enabledOverrides: Record<string, boolean> = {};
  for (const source of ULTIMATE_SOURCE_CATALOG) {
    enabledOverrides[source.id] = enabledIds.has(source.id);
  }

  const uptimeOverrides: Record<string, number> = {
    'base-light-attack': preset.baseUptime,
    ...preset.uptimeOverrides,
  };

  return { enabledOverrides, uptimeOverrides };
}
