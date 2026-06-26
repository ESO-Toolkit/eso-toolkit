/**
 * Curated, research-verified metadata overlay for the ESO Scribing simulator.
 *
 * The game-extracted `data/scribing-complete.json` is the authoritative source
 * for ability ids, name transformations and validated combinations, but it does
 * not carry human-readable skill-line / acquisition / effect text. This module
 * supplies that, keyed by the same slugs, and is merged into the typed entities
 * by the repository adapter.
 *
 * Accuracy: grimoire skill lines + icons are derived from each grimoire's
 * `ability_grimoire_*` base icon in the game data (authoritative). Acquisition,
 * base effects, and script effect text are sourced from UESP and the official
 * ESO release notes, cross-checked against in-game testing (verified June 2026).
 * Where a buff/debuff tier or value varies per grimoire, the text describes the
 * common case.
 *
 * Sources: https://en.uesp.net/wiki/Online:Scribing and the official ESO release notes.
 */

import type { SkillLine } from '../shared/types';

export interface GrimoireMeta {
  /** Skill line the grimoire is added to (from its base icon). */
  readonly skillLine: SkillLine;
  /** ESO Logs ability-icon filename (no extension). */
  readonly icon: string;
  /** How the grimoire is acquired in-game. */
  readonly acquisition: string;
  /** Concise summary of the base ability's behaviour (focus-dependent details aside). */
  readonly baseEffect: string;
  /** Target type of the base ability. */
  readonly targetType: string;
  /** Cast behaviour of the base ability. */
  readonly castType: string;
}

export interface ScriptMeta {
  /** Precise in-game effect text. */
  readonly effect: string;
  /** Unlock category. */
  readonly category?: string;
  /** Where/how the script is unlocked. */
  readonly acquisition?: string;
  /** Optional display-name override (e.g. a script renamed in a later update). */
  readonly displayName?: string;
}

/**
 * Per-grimoire metadata, keyed by the dataset slug. Skill line + icon verified
 * against game data; acquisition / base effect verified against UESP + in-game.
 */
export const GRIMOIRE_META: Readonly<Record<string, GrimoireMeta>> = {
  'wield-soul': {
    skillLine: 'Soul Magic',
    icon: 'ability_grimoire_soulmagic1',
    acquisition:
      'Free — granted by the first Scribing quest, "The Second Era of Scribing" (starts at any Mages Guild via Adept Irnard Rirnil). Earned per character.',
    baseEffect:
      'Launch a concentrated blast of soul magic at a target — a ranged main spammable (~28m).',
    targetType: 'Enemy (ranged single target)',
    castType: 'Instant',
  },
  'soul-burst': {
    skillLine: 'Soul Magic',
    icon: 'ability_grimoire_soulmagic2',
    acquisition:
      'Free from the final Scribing quest "The Wing of the Crow", or 10,000 gold from Chronicler Firandil once any character on the account has finished it.',
    baseEffect:
      'Unleash a point-blank burst of soul magic around you that can buff, debuff, shield, immobilize or stun depending on its scripts.',
    targetType: 'Area around the caster (PBAoE)',
    castType: 'Instant',
  },
  'elemental-explosion': {
    skillLine: 'Destruction Staff',
    icon: 'ability_grimoire_staffdestro',
    acquisition:
      'Buy from Chronicler Firandil in The Scholarium (50,000 gold first, 10,000 after) after reaching Rank 25 in the Destruction Staff skill line.',
    baseEffect:
      'Channel your staff to fling a bolt of volatile magic that detonates in an elemental explosion at the target location.',
    targetType: 'Ground-targeted area',
    castType: 'Cast time',
  },
  'traveling-knife': {
    skillLine: 'Dual Wield',
    icon: 'ability_grimoire_dualwield',
    acquisition:
      'Buy from Chronicler Firandil in The Scholarium (50,000 gold first, 10,000 after) after reaching Rank 25 in the Dual Wield skill line.',
    baseEffect:
      'Throw an enchanted dagger that strikes an enemy and returns to you, hitting additional enemies in its path.',
    targetType: 'Enemy (returning projectile, line)',
    castType: 'Instant',
  },
  smash: {
    skillLine: 'Two Handed',
    icon: 'ability_grimoire_2handed',
    acquisition:
      'Buy from Chronicler Firandil in The Scholarium (50,000 gold first, 10,000 after) after reaching Rank 25 in the Two Handed skill line.',
    baseEffect: 'Drag your weapon along the ground to smash a cone of enemies in front of you.',
    targetType: 'Cone in front of the caster',
    castType: 'Instant',
  },
  vault: {
    skillLine: 'Bow',
    icon: 'ability_grimoire_bow',
    acquisition:
      'Buy from Chronicler Firandil in The Scholarium (50,000 gold first, 10,000 after) after reaching Rank 25 in the Bow skill line.',
    baseEffect:
      'Fire a burst at your feet while flipping backwards ~15m — a mobility skill with a self-centred damage burst.',
    targetType: 'Area at the caster, plus a backward leap',
    castType: 'Instant',
  },
  'shield-throw': {
    skillLine: 'One Hand and Shield',
    icon: 'ability_grimoire_1handed',
    acquisition:
      'Buy from Chronicler Firandil in The Scholarium (50,000 gold first, 10,000 after) after reaching Rank 25 in the One Hand and Shield skill line.',
    baseEffect: 'Hurl your shield at an enemy; it strikes them and returns to you.',
    targetType: 'Enemy (returning projectile)',
    castType: 'Instant',
  },
  'menders-bond': {
    skillLine: 'Restoration Staff',
    icon: 'ability_grimoire_staffresto',
    acquisition:
      'Buy from Chronicler Firandil in The Scholarium (50,000 gold first, 10,000 after) after reaching Rank 25 in the Restoration Staff skill line.',
    baseEffect:
      'Manifest a life link between you and an ally, a healing/support tether that persists.',
    targetType: 'Ally (tether)',
    castType: 'Instant',
  },
  torchbearer: {
    skillLine: 'Fighters Guild',
    icon: 'ability_grimoire_fightersguild',
    acquisition:
      'Buy from Chronicler Firandil in The Scholarium (50,000 gold first, 10,000 after) after reaching Rank 5 in the Fighters Guild skill line.',
    baseEffect: 'Conjure an imbued torch and sweep the area in front of you three times.',
    targetType: 'Cone in front of the caster (3 hits)',
    castType: 'Channeled',
  },
  'ulfsilds-contingency': {
    skillLine: 'Mages Guild',
    icon: 'ability_grimoire_magesguild',
    acquisition:
      'Buy from Chronicler Firandil in The Scholarium (50,000 gold first, 10,000 after) after reaching Rank 5 in the Mages Guild skill line.',
    baseEffect:
      'Prime yourself with Ulfsild’s runes; your next resource-costing ability triggers a burst of magic around you. Dissipates after ~22s if untriggered.',
    targetType: 'Self (primed), then a burst around you on trigger',
    castType: 'Instant (proc on next cast)',
  },
  trample: {
    skillLine: 'Assault',
    icon: 'ability_grimoire_assault',
    acquisition:
      'Buy from Chronicler Firandil in The Scholarium (50,000 gold first, 10,000 after) after reaching Rank 5 in the Alliance War Assault skill line. Requires an active mount; not an Ultimate.',
    baseEffect:
      'Whistle your mount forth to charge ahead, trampling all enemies in a ~5m-wide line from your position.',
    targetType: 'Line in front of the caster',
    castType: 'Cast time (~1.5s)',
  },
  'banner-bearer': {
    skillLine: 'Support',
    icon: 'ability_grimoire_support',
    acquisition:
      'Buy from Chronicler Firandil in The Scholarium. Requires Rank 5 in BOTH Alliance War Assault and Support and the "Alliance War Skill Apprentice" achievement — which, uniquely, must be earned on each character before that character can buy it.',
    baseEffect:
      'Plant a banner that inspires you and nearby group members, projecting an area effect around it.',
    targetType: 'Ground-placed banner with an area effect',
    castType: 'Instant',
  },
};

/**
 * Focus script effect text. Focus scripts set a scribed skill's name, resource
 * cost and primary function. Damage focuses change the skill's damage type;
 * utility focuses change what the skill does. Effect text verified against UESP
 * and in-game testing.
 */
const FOCUS_DROP =
  'Focus script drop after the Sigil of the Luminary Gryphon (daily delve / Mages Guild quests, PvP Rewards for the Worthy), or buy from Chronicler Firandil / Filer Ool.';

export const FOCUS_META: Readonly<Record<string, ScriptMeta>> = {
  'physical-damage': {
    effect: 'The skill deals Physical Damage as its primary effect.',
    category: 'Damage',
    acquisition:
      'Free from a Mages Guild hall (Auridon, Vulkhel Guard) after the Sigil of the Luminary Dragon; also drops and is sold by the vendors.',
  },
  'flame-damage': {
    effect: 'The skill deals Flame Damage as its primary effect.',
    category: 'Damage',
    acquisition: FOCUS_DROP,
  },
  'frost-damage': {
    effect:
      'The skill deals Frost Damage as its primary effect (can apply Chilled / Minor Brittle).',
    category: 'Damage',
    acquisition: FOCUS_DROP,
  },
  'shock-damage': {
    effect: 'The skill deals Shock Damage as its primary effect.',
    category: 'Damage',
    acquisition: FOCUS_DROP,
  },
  'magic-damage': {
    effect: 'The skill deals Magic Damage as its primary effect.',
    category: 'Damage',
    acquisition:
      'Free starter script from the intro quest "The Second Era of Scribing"; also drops and is sold by the vendors.',
  },
  'poison-damage': {
    effect: 'The skill deals Poison Damage as its primary effect.',
    category: 'Damage',
    acquisition: FOCUS_DROP,
  },
  'disease-damage': {
    effect: 'The skill deals Disease Damage as its primary effect.',
    category: 'Damage',
    acquisition: FOCUS_DROP,
  },
  'bleed-damage': {
    effect: 'The skill deals Bleed Damage as its primary effect.',
    category: 'Damage',
    acquisition: FOCUS_DROP,
  },
  trauma: {
    effect: 'Afflicts enemies hit with Healing Absorption for ~3s (they cannot be healed).',
    category: 'Debuff',
    acquisition: FOCUS_DROP,
  },
  'multi-target': {
    effect: 'The skill strikes multiple enemies — adding extra hits or bounces to nearby targets.',
    category: 'Area',
    acquisition: FOCUS_DROP,
  },
  taunt: {
    effect:
      'Deals damage and taunts the enemy for 15s, forcing them to attack you — a tanking focus.',
    category: 'Control',
    acquisition: FOCUS_DROP,
  },
  knockback: {
    effect: 'Deals damage and knocks enemies back (~8–10m), often with a brief stun.',
    category: 'Control',
    acquisition: FOCUS_DROP,
  },
  pull: {
    effect:
      'Deals damage and pulls the enemy to you (some pulls also taunt and cannot be reflected).',
    category: 'Control',
    acquisition: FOCUS_DROP,
  },
  immobilize: {
    effect:
      'Deals damage and immobilizes (roots) enemies for ~3s; on support grimoires it instead cleanses/grants snare & root immunity.',
    category: 'Control',
    acquisition: FOCUS_DROP,
  },
  stun: {
    effect: 'Stuns enemies (some grimoires apply fear or immobilize instead).',
    category: 'Control',
    acquisition:
      'Free from a Mages Guild hall (Glenumbra, Daggerfall) after the Sigil of the Luminary Dragon; also drops and is sold by the vendors.',
  },
  dispel: {
    effect:
      'Removes enemy effects — up to several area abilities, or a damage shield from enemy players.',
    category: 'Utility',
    acquisition: FOCUS_DROP,
  },
  healing: {
    effect:
      'Heals you and/or your allies as its primary effect; beneficial Signature/Affix scripts then apply to allies too.',
    category: 'Support',
    acquisition:
      'Free from the Scribing quest "The Wing of the Indrik"; also drops and is sold by the vendors.',
  },
  'restore-resources': {
    effect:
      'Restores Magicka and Stamina to you/allies (or reduces ability cost on Banner Bearer).',
    category: 'Support',
    acquisition: FOCUS_DROP,
  },
  'damage-shield': {
    effect: 'Grants you or an ally a damage shield that absorbs incoming damage for ~6s.',
    category: 'Support',
    acquisition:
      'Free from a Mages Guild hall (Stonefalls, Davon’s Watch) after the Sigil of the Luminary Dragon; also drops and is sold by the vendors.',
  },
  'generate-ultimate': {
    effect: 'Generates or transfers Ultimate to you/allies as its primary effect.',
    category: 'Support',
    acquisition: FOCUS_DROP,
  },
  mitigation: {
    effect:
      'Reduces the damage you take (or transfers a linked ally’s damage to you on Mender’s Bond).',
    category: 'Support',
    acquisition: FOCUS_DROP,
  },
};

/**
 * Signature script effect text + acquisition. Signature scripts add a unique
 * secondary mechanic. Verified against UESP + in-game testing (values scale per
 * grimoire; the common case is described).
 */
export const SIGNATURE_META: Readonly<Record<string, ScriptMeta>> = {
  'lingering-torment': {
    effect: 'Adds a damage-over-time: deals Physical Damage over ~20s to enemies hit.',
    category: 'Signature',
    acquisition: 'Free starter script from the intro quest "The Second Era of Scribing".',
  },
  'sages-remedy': {
    effect: 'Adds a heal-over-time to allies affected by the skill.',
    category: 'Signature',
    acquisition: 'Free reward from the Scribing quest "The Wing of the Indrik".',
  },
  'hunters-snare': {
    effect:
      'Snares enemies hit, reducing Movement Speed — the amount and duration scale per grimoire (e.g. 40% for 5s on Vault).',
    category: 'Signature',
    acquisition:
      'Free from a Mages Guild hall (Mournhold, Deshaan) after the Sigil of the Luminary Dragon.',
  },
  'druids-resurgence': {
    effect: 'Restores resources or boosts recovery on use (scales per grimoire).',
    category: 'Signature',
    acquisition:
      'Free from a Mages Guild hall (Wayrest, Stormhaven) after the Sigil of the Luminary Dragon.',
  },
  'warriors-opportunity': {
    effect: 'Enemies hit take 8% more Martial damage for 5s.',
    category: 'Signature',
    acquisition:
      'Free from the Mages Guild hall in Elden Root, Grahtwood (Sigil of the Luminary Dragon).',
  },
  'knights-valor': {
    effect:
      'Improves your block/bash (e.g. +8% Block amount and -8% Block cost, or a bashing strike).',
    category: 'Signature',
    acquisition:
      'Random drop from daily quest coffers (World Boss / Cyrodiil / Fighters Guild) or the Firandil rotation.',
  },
  'leeching-thirst': {
    effect: 'Heals you for 26% of the damage the skill does (life steal).',
    category: 'Signature',
    acquisition:
      'Random drop from daily quest coffers (World Boss / Cyrodiil / Fighters Guild) or the Firandil rotation.',
  },
  'immobilizing-strike': {
    effect: 'Immobilizes (roots) enemies hit for 3s.',
    category: 'Signature',
    acquisition:
      'Random drop from daily quest coffers (World Boss / Cyrodiil / Fighters Guild) or the Firandil rotation.',
  },
  'assassins-misery': {
    effect: 'Increases your chance to apply status effects on enemies by 100% for 10s.',
    category: 'Signature',
    acquisition:
      'Random drop from daily quest coffers (World Boss / Cyrodiil / Fighters Guild) or the Firandil rotation.',
  },
  'anchorites-cruelty': {
    effect:
      'Consumes a Soul Gem to deal a % of the enemy’s Max Health as Oblivion Damage over time (more vs targets under 50%).',
    category: 'Signature',
    acquisition:
      'Random drop from daily quest coffers (World Boss / Cyrodiil / Fighters Guild) or the Firandil rotation.',
  },
  'anchorites-potency': {
    effect: 'Consumes a Soul Gem in combat to generate Ultimate (up to once every 5s).',
    category: 'Signature',
    acquisition:
      'Random drop from daily quest coffers (World Boss / Cyrodiil / Fighters Guild) or the Firandil rotation.',
  },
  'warmages-defense': {
    effect: 'Grants you a damage shield that absorbs damage for 6s.',
    category: 'Signature',
    acquisition:
      'Random drop from daily quest coffers (World Boss / Cyrodiil / Fighters Guild) or the Firandil rotation.',
  },
  'thiefs-swiftness': {
    effect: 'Improves your mobility (e.g. Minor Expedition, reduced Sprint cost, or pass-through).',
    category: 'Signature',
    acquisition:
      'Random drop from daily quest coffers (World Boss / Cyrodiil / Fighters Guild) or the Firandil rotation.',
  },
  'crusaders-defiance': {
    effect:
      'Resists or removes crowd-control effects (e.g. -30% snare effectiveness, or CC immunity for an ally).',
    category: 'Signature',
    acquisition:
      'Random drop from daily quest coffers (World Boss / Cyrodiil / Fighters Guild) or the Firandil rotation.',
  },
  'fencers-parry': {
    effect: 'Deflects the next direct-damage attack against you within 3s (once every 3s).',
    category: 'Signature',
    acquisition:
      'Random drop from daily quest coffers (World Boss / Cyrodiil / Fighters Guild) or the Firandil rotation.',
  },
  'gladiators-tenacity': {
    effect: 'Reduces your damage taken for a short time (scales per grimoire).',
    category: 'Signature',
    acquisition:
      'Random drop from daily quest coffers (World Boss / Cyrodiil / Fighters Guild) or the Firandil rotation.',
  },
  'wayfarers-mastery': {
    effect:
      'Lets the skill trigger relevant skill-line passives (e.g. makes enemies susceptible to Ruffian for 6s).',
    category: 'Signature',
    acquisition:
      'Random drop from daily quest coffers (World Boss / Cyrodiil / Fighters Guild) or the Firandil rotation.',
  },
  'cavaliers-charge': {
    effect: 'Increases the skill’s damage as it persists (e.g. +20% per 0.5s as it travels).',
    category: 'Signature',
    acquisition:
      'Random drop from daily quest coffers (World Boss / Cyrodiil / Fighters Guild) or the Firandil rotation.',
  },
  'growing-impact': {
    effect:
      'On Ulfsild’s Contingency, leaves a rune for 9.6s that applies your Affix script in an area.',
    category: 'Signature',
    acquisition:
      'Random drop from daily quest coffers (World Boss / Cyrodiil / Fighters Guild) or the Firandil rotation.',
  },
  'class-mastery': {
    displayName: 'Class Flourish',
    effect:
      'Adds a class-specific enhancement that differs for each of the seven classes (renamed from "Class Mastery" in Update 50).',
    category: 'Signature (class)',
    acquisition:
      'Collect 50 Class Script Scraps from end-game content (Trials, Dungeons, Infinite Archive, Arenas, PvP, Master Writs) for the "A Signature with Class" achievement.',
  },
};

/**
 * Affix script effect text + acquisition. Affix scripts bolt an existing ESO
 * buff or debuff onto a scribed skill. Most grant the Minor version; a few
 * grimoires upgrade specific scripts to Major. Verified against UESP + in-game.
 */
export const AFFIX_META: Readonly<Record<string, ScriptMeta>> = {
  breach: {
    effect:
      'Applies Minor Breach to enemies (-2974 Physical & Spell Resistance); Major (-5948) on some grimoires.',
    category: 'Debuff',
    acquisition: 'Free starter script from the intro quest "The Second Era of Scribing".',
  },
  resolve: {
    effect: 'Grants Minor Resolve (+2974 Physical & Spell Resistance) to you/allies.',
    category: 'Buff',
    acquisition: 'Free from the Scribing quest "The Wing of the Indrik" (with Off Balance).',
  },
  'off-balance': {
    effect: 'Sets enemies Off Balance, leaving them vulnerable to Heavy Attack stuns.',
    category: 'Status',
    acquisition: 'Free from the Scribing quest "The Wing of the Indrik" (with Resolve).',
  },
  maim: {
    effect: 'Applies Minor Maim to enemies (-5% damage done); Major (-10%) on some grimoires.',
    category: 'Debuff',
    acquisition: 'Free from the Riften Mages Guild after the Sigil of the Luminary Dragon.',
  },
  vitality: {
    effect: 'Grants Minor Vitality (+6% healing received) to you/allies.',
    category: 'Buff',
    acquisition:
      'Free outside the Rawl’kha Mages Guild (Reaper’s March) after the Sigil of the Luminary Dragon.',
  },
  vulnerability: {
    effect: 'Applies Minor Vulnerability to enemies (+5% damage taken).',
    category: 'Debuff',
    acquisition:
      'Free at the Evermore Mages Guild (Bangkorai) after the Sigil of the Luminary Dragon.',
  },
  berserk: {
    effect: 'Grants Minor Berserk (+5% damage done) to you/allies.',
    category: 'Buff',
    acquisition:
      'Drop after the Sigil of the Luminary Netch (incursion / Imperial City / Undaunted dailies) or Firandil.',
  },
  'brutality-and-sorcery': {
    effect: 'Grants Minor Brutality and Minor Sorcery (+Weapon & Spell Damage) to you/allies.',
    category: 'Buff',
    acquisition:
      'Drop after the Sigil of the Luminary Netch, or buy from Firandil / Filer Ool / Tel Var merchant.',
  },
  'savagery-and-prophecy': {
    effect: 'Grants Minor Savagery and Minor Prophecy (+Weapon & Spell Critical) to you/allies.',
    category: 'Buff',
    acquisition:
      'Drop after the Sigil of the Luminary Netch, or buy from Firandil / Filer Ool / Tel Var merchant.',
  },
  'intellect-and-endurance': {
    effect:
      'Grants Minor Intellect and Minor Endurance (+Magicka & Stamina Recovery) to you/allies.',
    category: 'Buff',
    acquisition:
      'Drop after the Sigil of the Luminary Netch, or buy from Firandil / Filer Ool / Tel Var merchant.',
  },
  courage: {
    effect: 'Grants Minor Courage (+Weapon & Spell Damage) to you/allies.',
    category: 'Buff',
    acquisition:
      'Drop after the Sigil of the Luminary Netch, or buy from Firandil / Filer Ool / Tel Var merchant.',
  },
  expedition: {
    effect:
      'Grants Minor Expedition (+15% Movement Speed) to you/allies; Major (+30%) on some grimoires.',
    category: 'Buff',
    acquisition:
      'Drop after the Sigil of the Luminary Netch, or buy from Firandil / Filer Ool / Tel Var merchant.',
  },
  protection: {
    effect:
      'Grants Minor Protection (-5% damage taken) to you/allies; Major on some grimoires (e.g. Trample).',
    category: 'Buff',
    acquisition:
      'Drop after the Sigil of the Luminary Netch, or buy from Firandil / Filer Ool / Tel Var merchant.',
  },
  evasion: {
    effect: 'Grants Minor Evasion (-damage taken from area attacks) to you/allies.',
    category: 'Buff',
    acquisition:
      'Drop after the Sigil of the Luminary Netch, or buy from Firandil / Filer Ool / Tel Var merchant.',
  },
  force: {
    effect: 'Grants Minor Force (+10% Critical Damage) to you/allies.',
    category: 'Buff',
    acquisition:
      'Drop after the Sigil of the Luminary Netch, or buy from Firandil / Filer Ool / Tel Var merchant.',
  },
  heroism: {
    effect: 'Grants Minor Heroism (generate 1 Ultimate every 1.5s in combat) to you/allies.',
    category: 'Buff',
    acquisition:
      'Drop after the Sigil of the Luminary Netch, or buy from Firandil / Filer Ool / Tel Var merchant.',
  },
  empower: {
    effect: 'Grants Empower (+70% Heavy Attack damage against monsters) to you.',
    category: 'Buff',
    acquisition:
      'Drop after the Sigil of the Luminary Netch, or buy from Firandil / Filer Ool / Tel Var merchant.',
  },
  cowardice: {
    effect: 'Applies Minor Cowardice to enemies (-Weapon & Spell Damage).',
    category: 'Debuff',
    acquisition:
      'Drop after the Sigil of the Luminary Netch, or buy from Firandil / Filer Ool / Tel Var merchant.',
  },
  defile: {
    effect: 'Applies Minor Defile to enemies (-healing received & Health Recovery).',
    category: 'Debuff',
    acquisition:
      'Drop after the Sigil of the Luminary Netch, or buy from Firandil / Filer Ool / Tel Var merchant.',
  },
  enervation: {
    effect: 'Applies Minor Enervation to enemies (-Critical Damage).',
    category: 'Debuff',
    acquisition:
      'Drop after the Sigil of the Luminary Netch, or buy from Firandil / Filer Ool / Tel Var merchant.',
  },
  mangle: {
    effect: 'Applies Minor Mangle to enemies (-Maximum Health).',
    category: 'Debuff',
    acquisition:
      'Drop after the Sigil of the Luminary Netch, or buy from Firandil / Filer Ool / Tel Var merchant.',
  },
  uncertainty: {
    effect: 'Applies Minor Uncertainty to enemies (-Weapon & Spell Critical).',
    category: 'Debuff',
    acquisition:
      'Drop after the Sigil of the Luminary Netch, or buy from Firandil / Filer Ool / Tel Var merchant.',
  },
  lifesteal: {
    effect: 'Applies Minor Lifesteal to enemies (allies who damage them are healed).',
    category: 'Debuff',
    acquisition:
      'Drop after the Sigil of the Luminary Netch, or buy from Firandil / Filer Ool / Tel Var merchant.',
  },
  magickasteal: {
    effect: 'Applies Minor Magickasteal to enemies (allies who damage them restore Magicka).',
    category: 'Debuff',
    acquisition:
      'Drop after the Sigil of the Luminary Netch, or buy from Firandil / Filer Ool / Tel Var merchant.',
  },
  brittle: {
    effect: 'Applies Minor Brittle to enemies (+10% Critical Damage taken).',
    category: 'Debuff',
    acquisition:
      'Drop after the Sigil of the Luminary Netch, or buy from Firandil / Filer Ool / Tel Var merchant.',
  },
  interrupt: {
    effect: 'Interrupts the enemy and sets them Off Balance, bashing them out of casts.',
    category: 'Status',
    acquisition:
      'Drop after the Sigil of the Luminary Netch, or buy from Firandil / Filer Ool / Tel Var merchant.',
  },
};

/**
 * Focus transforms present in the game-extracted dataset that research refuted
 * as not existing in the live game (the dataset pre-seeded an expected name but
 * it never matched an ability — `matchCount: 0`). Keyed by grimoire slug → focus
 * slugs to drop. Verified against UESP + in-game per-focus availability (June 2026).
 *
 * Only verified-wrong entries belong here: most `matchCount: 0` transforms are
 * real focuses simply unobserved in the sample logs (e.g. "Fiery Soul").
 */
export const VERIFIED_FOCUS_EXCLUSIONS: Readonly<Record<string, readonly string[]>> = {
  // No Healing focus exists for Shield Throw (1H&S) in the live game; the
  // dataset's "Remedying Throw" has no ability id and is a seeding error.
  'shield-throw': ['healing'],
};

/** High-level facts about the Scribing system, shown in the simulator UI. */
export const SCRIBING_SYSTEM = {
  intro:
    'Scribing lets you customise special skills called Grimoires. Each grimoire has three script slots — a Focus, a Signature and an Affix — and the scripts you slot define the skill’s name, function, resource and effects.',
  slots:
    'Focus sets the main effect, name, resource and cost. Signature adds a unique secondary mechanic. Affix bolts on an existing ESO buff or debuff.',
  scribingCost: 'Scribing a skill costs 3 Luminous Ink at the Scribing Altar in The Scholarium.',
  combinations: 'There are over 12,000 possible grimoire + script combinations.',
  source: 'Verified against UESP and in-game testing (June 2026).',
} as const;
