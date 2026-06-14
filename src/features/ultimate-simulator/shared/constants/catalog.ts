/**
 * Ultimate-source CATALOG — the research-sourced data layer.
 *
 * Every entry carries a `provenance` URL and `confidence`. Numbers are from
 * Update 50 / June 2026 research (see .scratch/ult-research-2026.md), sourced
 * primarily from UESP, ESO-Hub, ESO-Skillbook and reputable theorycrafters.
 *
 * Mechanics summary the catalog encodes:
 *  - There is NO passive ultimate regen. Base income is the light/heavy-attack
 *    hidden buff: 3 ult/sec while weaving in combat (9s buff, refreshed per LA).
 *  - Minor Heroism = 1 ult / 1.5s (0.667/s); Major Heroism = 3 ult / 1.5s (2.0/s).
 *  - Class ult-GENERATION passives are sparse: Arcanist Implacable Outcome
 *    (+4 ult / Crux consume / 8s ICD) and Necromancer Corpse Consumption
 *    (+10 ult / corpse / 16s ICD) are the notable ones; most classes have none.
 *  - Decisive rolls +1 per ult-gain instance on income the wearer generates;
 *    externally-granted ult (a healer's Pillager's Profit) does not roll it.
 *  - Sets like Saxhleel Champion / War Machine CONSUME ultimate (Major Force /
 *    Major Slayer payoff) — they are deliberately NOT in this catalog, because a
 *    generation calculator must not present them as income.
 */

import type {
  CatalogCostReduction,
  CatalogSource,
  UltimateAbility,
} from '../types/catalog';

const UESP_ULTIMATE = 'https://en.uesp.net/wiki/Online:Ultimate';
const UESP_DECISIVE = 'https://en.uesp.net/wiki/Online:Decisive';
const ESOHUB_MINOR_HEROISM = 'https://eso-hub.com/en/buffs-debuffs/minor-heroism';
const ESOHUB_MAJOR_HEROISM = 'https://eso-hub.com/en/buffs-debuffs/major-heroism';
const ESOHUB_IMPLACABLE = 'https://eso-hub.com/en/skills/arcanist/soldier-of-apocrypha/implacable-outcome';
const ESOHUB_CORPSE = 'https://eso-hub.com/en/skills/necromancer/living-death/corpse-consumption';
const ESOHUB_POWERSTONE = 'https://eso-hub.com/en/skills/sorcerer/daedric-summoning/power-stone';
const ESOHUB_RESTORING_SPIRIT = 'https://eso-hub.com/en/skills/templar/dawns-wrath/restoring-spirit';
const ESOHUB_CRYPTCANON = 'https://eso-hub.com/en/sets/cryptcanon-vestments';
const ESOHUB_PILLAGERS = 'https://eso-hub.com/en/sets/pillagers-profit';
const ESOHUB_MINOR_HEROISM_POTION = 'https://eso-hub.com/en/buffs-debuffs/minor-heroism';

/**
 * The catalog of toggleable ultimate-generation sources.
 *
 * `instancesPerSecond` and `amountPerInstance` are chosen so each source's
 * expected ult/s matches its real in-game rate. `uptime` defaults reflect a
 * typical optimized build (tune in the UI). `defaultEnabled` marks what a normal
 * build of that context/class would actually be running.
 */
export const ULTIMATE_SOURCE_CATALOG: readonly CatalogSource[] = [
  // ---- Universal base income ------------------------------------------------
  {
    id: 'base-light-attack',
    label: 'Light/Heavy-attack income',
    category: 'base',
    kind: 'periodic',
    amountPerInstance: 3,
    instancesPerSecond: 1, // 3 ult/sec while weaving
    uptime: 0.95,
    rollsDecisive: true,
    availableIn: ['soloPve', 'groupPve', 'pvp'],
    defaultEnabled: true,
    provenance: UESP_ULTIMATE,
    confidence: 'high',
    description:
      'The hidden buff from landing light/heavy attacks on a non-trivial enemy in combat: 3 ultimate/sec for 9s, refreshed each light attack. This is ESO base income — there is no passive ultimate regen.',
  },

  // ---- Heroism --------------------------------------------------------------
  {
    id: 'minor-heroism',
    label: 'Minor Heroism',
    category: 'heroism',
    kind: 'periodic',
    amountPerInstance: 1,
    instancesPerSecond: 1 / 1.5, // 1 ult / 1.5s
    uptime: 0.95,
    rollsDecisive: true,
    availableIn: ['soloPve', 'groupPve', 'pvp'],
    defaultEnabled: true,
    provenance: ESOHUB_MINOR_HEROISM,
    confidence: 'high',
    description:
      '1 ultimate every 1.5s (0.67/s) in combat. From Heroism potions, Cryptcanon Vestments, Saxhleel/various sets, or scribing.',
  },
  {
    id: 'major-heroism',
    label: 'Major Heroism',
    category: 'heroism',
    kind: 'periodic',
    amountPerInstance: 3,
    instancesPerSecond: 1 / 1.5, // 3 ult / 1.5s
    uptime: 0.7,
    rollsDecisive: true,
    availableIn: ['groupPve', 'pvp'],
    defaultEnabled: false,
    provenance: ESOHUB_MAJOR_HEROISM,
    confidence: 'high',
    description:
      '3 ultimate every 1.5s (2.0/s) in combat — the strongest sustained source. Usually a group buff (Warden U50 class scrip, certain sets) rather than self-applied.',
  },

  // ---- Class passives -------------------------------------------------------
  {
    id: 'arcanist-implacable-outcome',
    label: 'Implacable Outcome (Crux)',
    category: 'classPassive',
    kind: 'triggered',
    amountPerInstance: 4,
    instancesPerSecond: 1 / 8, // +4 ult, max once / 8s on Crux consume
    uptime: 1,
    rollsDecisive: true,
    classes: ['arcanist'],
    availableIn: ['soloPve', 'groupPve', 'pvp'],
    defaultEnabled: true,
    provenance: ESOHUB_IMPLACABLE,
    confidence: 'high',
    description:
      'Arcanist Soldier of Apocrypha passive: +4 ultimate when you consume Crux, once every 8 seconds.',
  },
  {
    id: 'necromancer-corpse-consumption',
    label: 'Corpse Consumption',
    category: 'classPassive',
    kind: 'triggered',
    amountPerInstance: 10,
    instancesPerSecond: 1 / 16, // +10 ult, once / 16s
    uptime: 0.6,
    rollsDecisive: true,
    classes: ['necromancer'],
    availableIn: ['soloPve', 'groupPve', 'pvp'],
    defaultEnabled: false,
    provenance: ESOHUB_CORPSE,
    confidence: 'high',
    description:
      'Necromancer Living Death passive: +10 ultimate when you consume a corpse, once every 16 seconds. Uptime depends on corpse availability.',
  },

  // ---- Mythic ---------------------------------------------------------------
  {
    id: 'cryptcanon-vestments',
    label: 'Cryptcanon Vestments (Minor Heroism)',
    category: 'mythic',
    kind: 'periodic',
    amountPerInstance: 1,
    instancesPerSecond: 1 / 1.5,
    uptime: 0.98,
    rollsDecisive: true,
    availableIn: ['soloPve', 'groupPve', 'pvp'],
    defaultEnabled: false,
    provenance: ESOHUB_CRYPTCANON,
    confidence: 'high',
    description:
      'Mythic that grants Minor Heroism in combat. CAVEAT: while equipped you cannot cast your own ultimate — casting transfers your ult to group members. A support/battery item, not a self-ult enabler.',
  },

  // ---- Group support (external) --------------------------------------------
  {
    id: 'pillagers-profit-external',
    label: "Pillager's Profit (from healer)",
    category: 'external',
    kind: 'perCast',
    amountPerInstance: 50,
    instancesPerSecond: 1 / 12, // batteried to allies in bursts
    uptime: 1,
    rollsDecisive: false, // externally granted — does not roll the wearer's Decisive
    roles: ['dps'],
    availableIn: ['groupPve'],
    defaultEnabled: false,
    provenance: ESOHUB_PILLAGERS,
    confidence: 'medium',
    description:
      "When a group healer wears Pillager's Profit, 2% of ultimate they spend is granted to nearby group members. Modeled as an external trickle to a DPS; exact rate varies with the healer's ultimate usage.",
  },
];

/** Ultimate-cost reductions the user can toggle (multiplicative). */
export const COST_REDUCTION_CATALOG: readonly CatalogCostReduction[] = [
  {
    id: 'sorcerer-power-stone',
    label: 'Power Stone',
    category: 'classPassive',
    fraction: 0.15,
    enabled: false,
    classes: ['sorcerer'],
    availableIn: ['soloPve', 'groupPve', 'pvp'],
    defaultEnabled: true,
    provenance: ESOHUB_POWERSTONE,
    confidence: 'high',
    description: 'Sorcerer Daedric Summoning passive: reduces the cost of your ultimate abilities by 15%.',
  },
  {
    id: 'templar-restoring-spirit',
    label: 'Restoring Spirit',
    category: 'classPassive',
    fraction: 0.05,
    enabled: false,
    classes: ['templar'],
    availableIn: ['soloPve', 'groupPve', 'pvp'],
    defaultEnabled: true,
    provenance: ESOHUB_RESTORING_SPIRIT,
    confidence: 'high',
    description: 'Templar Dawn\'s Wrath passive: reduces all ability costs, including ultimate, by 5%.',
  },
];

/**
 * Known ultimates and their base costs, for the time-to-ultimate picker.
 * A representative (not exhaustive) list of commonly-run raid/dungeon ultimates.
 */
export const ULTIMATE_ABILITIES: readonly UltimateAbility[] = [
  {
    id: 'generic-250',
    label: 'Typical ultimate (250)',
    baseCost: 250,
    owner: 'global',
    provenance: UESP_ULTIMATE,
    confidence: 'high',
  },
  {
    id: 'dawnbreaker',
    label: 'Dawnbreaker (Fighters Guild)',
    baseCost: 125,
    owner: 'weapon',
    provenance: 'https://eso-hub.com/en/skills/guild/fighters-guild/dawnbreaker',
    confidence: 'high',
  },
  {
    id: 'standard-of-might',
    label: 'Standard of Might (Dragonknight)',
    baseCost: 250,
    owner: 'dragonknight',
    provenance: 'https://eso-hub.com/en/skills/dragonknight/ardent-flame/standard-of-might',
    confidence: 'high',
  },
  {
    id: 'permafrost',
    label: 'Permafrost (Warden)',
    baseCost: 200,
    owner: 'warden',
    provenance: 'https://eso-hub.com/en/skills/warden/winters-embrace/permafrost',
    confidence: 'medium',
  },
];

export { ESOHUB_MINOR_HEROISM_POTION, UESP_DECISIVE };

/**
 * The practical sustainable ultimate-per-second ceiling (≈ Warden's best). Used
 * only as a sanity flag in the UI — there is no hard per-second cap in game, but
 * a sustained rate above this almost certainly means the inputs are unrealistic.
 */
export const SANITY_MAX_ULT_PER_SECOND = 7;

/** Maximum ultimate that can be banked (hard pool cap). */
export const MAX_ULTIMATE_POOL = 500;
