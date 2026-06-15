/**
 * Ultimate-source CATALOG — the research-sourced data layer.
 *
 * Every entry carries a `provenance` URL and `confidence`. Numbers are from
 * Update 50 / June 2026 research (see .scratch/ult-research-2026.md). Provenance
 * links point to UESP and ESO-Skillbook (the authoritative community references
 * this project allows); values were cross-checked across multiple sources.
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

import type { CatalogCostReduction, CatalogSource, UltimateAbility } from '../types/catalog';

// Provenance links — UESP (authoritative) and ESO-Skillbook only.
const UESP_ULTIMATE = 'https://en.uesp.net/wiki/Online:Ultimate';
const UESP_DECISIVE = 'https://en.uesp.net/wiki/Online:Decisive';
const SRC_MINOR_HEROISM = 'https://en.uesp.net/wiki/Online:Heroism';
const SRC_MAJOR_HEROISM = 'https://en.uesp.net/wiki/Online:Heroism';
const SRC_IMPLACABLE = 'https://eso-skillbook.com/skill/implacable-outcome';
const SRC_CORPSE = 'https://eso-skillbook.com/skill/corpse-consumption';
const SRC_POWERSTONE = 'https://eso-skillbook.com/skill/power-stone';
const SRC_RESTORING_SPIRIT = 'https://eso-skillbook.com/skill/restoring-spirit';
const SRC_PILLAGERS = "https://en.uesp.net/wiki/Online:Pillager's_Profit";
const SRC_MINOR_HEROISM_POTION = 'https://en.uesp.net/wiki/Online:Heroism';
const SRC_BLOODSPAWN = 'https://en.uesp.net/wiki/Online:Bloodspawn_(set)';
const SRC_MOUNTAINS_BLESSING = "https://en.uesp.net/wiki/Online:Mountain's_Blessing";
const SRC_CATALYST = 'https://eso-skillbook.com/skill/catalyst';
const SRC_PRISM = 'https://en.uesp.net/wiki/Online:Prism';
const SRC_KRAGLENS = "https://en.uesp.net/wiki/Online:Kraglen's_Howl";
const SRC_ARKASIS = "https://en.uesp.net/wiki/Online:Arkasis's_Genius";
const SRC_ARKAYS = "https://en.uesp.net/wiki/Online:Arkay's_Charity";
const SRC_COLOVIAN = 'https://en.uesp.net/wiki/Online:Colovian_Highlands_General';

// SEARCHED-AND-EMPTY (documented so the gaps read as deliberate, not missing):
//  - MYTHIC items: no mythic generates ultimate via a distinct, not-already-modeled
//    mechanic. Cryptcanon Vestments grants Minor Heroism but blocks self-casting
//    ult (excluded above); the Oakensoul Ring's Minor Heroism folds into the
//    generic `minor-heroism` entry. Adding either would double-count.
//  - CHAMPION POINTS: no CP star generates flat ultimate via a distinct mechanic
//    (CP ult interactions are cost-style effects, already covered elsewhere).
//  - PER-CLASS ULT-COST REDUCTIONS beyond Sorcerer Power Stone (-15%) and Templar
//    Restoring Spirit (-5%): none exist (UESP's "Reduce Ultimate Cost" taxonomy
//    lists only item sets). DK/Warden/NB/Necro/Arcanist have no such passive.

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
    uptime: 0.9,
    rollsDecisive: true,
    availableIn: ['soloPve', 'groupPve', 'pvp'],
    // Off by default: Minor Heroism is an opt-in build choice (Heroism potions,
    // Cryptcanon, certain sets, scribing) — not every DPS runs it. Leaving it off
    // keeps the out-of-box estimate close to a plain weaving build; toggle it on
    // if your build actually provides it. (Validated against a real trial log: a
    // baseline Arcanist measured ~3.4 ult/s, matching base income + Decisive.)
    defaultEnabled: false,
    provenance: SRC_MINOR_HEROISM,
    confidence: 'high',
    // Minor Heroism is a single non-stacking buff, so it is modeled as ONE entry
    // representing whatever provides it (potions, sets, scribing). Adding a second
    // toggle per provider would double-count the same buff. Set the uptime to
    // match your source — e.g. an Essence of Heroism potion is only ~33% uptime
    // over its 45s cooldown, whereas a set that maintains it can approach 100%.
    description:
      '1 ultimate every 1.5s (0.67/s at full uptime) in combat. From Essence of Heroism potions (~33% uptime on the 45s potion cooldown), Minor-Heroism sets (Champion of the Hist, Daring Corsair, Shalk Exoskeleton, etc.), the Oakensoul Ring mythic, or scribing — enable it and set the uptime to match. (Cryptcanon Vestments also grants it but blocks casting your own ultimate, so it is not modeled here.)',
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
    // Available in every context: in a group it comes from a support's buff
    // (Warden scrip, Drake's Rush bash set); solo it comes from a self-applied
    // source like the Dragonknight Basalt-Blooded Warrior class set. Modeled as
    // ONE entry (Major Heroism is a single non-stacking buff — a separate toggle
    // per provider would double-count it); set the uptime to match your provider.
    availableIn: ['soloPve', 'groupPve', 'pvp'],
    defaultEnabled: false,
    provenance: SRC_MAJOR_HEROISM,
    confidence: 'high',
    description:
      '3 ultimate every 1.5s (2.0/s at full uptime) in combat — the strongest sustained source. From a group buff (Warden U50 class scrip, Drake’s Rush on Bash) or a self-applied source (Dragonknight Basalt-Blooded Warrior set, ~50% front-bar uptime). Set the uptime to match how reliably your build holds it.',
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
    provenance: SRC_IMPLACABLE,
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
    provenance: SRC_CORPSE,
    confidence: 'high',
    description:
      'Necromancer Living Death passive: +10 ultimate when you consume a corpse, once every 16 seconds. Uptime depends on corpse availability.',
  },
  {
    id: 'dragonknight-mountains-blessing',
    label: "Mountain's Blessing (Earthen Heart cast)",
    category: 'classPassive',
    kind: 'triggered',
    amountPerInstance: 3,
    instancesPerSecond: 1 / 6, // +3 ult per Earthen Heart cast, once / 6s ICD
    uptime: 0.5, // ~one Earthen Heart cast per ~12s rotation
    rollsDecisive: true,
    classes: ['dragonknight'],
    availableIn: ['soloPve', 'groupPve', 'pvp'],
    defaultEnabled: false,
    provenance: SRC_MOUNTAINS_BLESSING,
    confidence: 'high',
    description:
      'Dragonknight Earthen Heart passive: +3 ultimate when you cast an Earthen Heart ability in combat, at most once every 6s. Uptime reflects how often you actually cast one (~0.25 ult/s at one cast / 12s).',
  },
  {
    id: 'templar-prism',
    label: "Prism (Dawn's Wrath cast)",
    category: 'classPassive',
    kind: 'triggered',
    amountPerInstance: 3,
    instancesPerSecond: 1 / 6, // +3 ult per Dawn's Wrath cast, once / 6s ICD
    uptime: 0.9, // a Dawn's Wrath DPS procs this nearly every 6s window
    rollsDecisive: true,
    classes: ['templar'],
    availableIn: ['soloPve', 'groupPve', 'pvp'],
    // Default-on for Templar: a Templar weaving Dawn's Wrath abilities procs this
    // almost every window, so it is near-always-on income (like the Arcanist's
    // Implacable Outcome). The tests assert Arcanist defaults, so this is safe.
    defaultEnabled: true,
    provenance: SRC_PRISM,
    confidence: 'high',
    description:
      "Templar Dawn's Wrath passive: +3 ultimate when you cast a Dawn's Wrath ability in combat, once every 6s (~0.45 ult/s for a Dawn's Wrath build).",
  },
  {
    id: 'nightblade-catalyst',
    label: 'Catalyst (potion drink)',
    category: 'classPassive',
    kind: 'triggered',
    amountPerInstance: 22,
    instancesPerSecond: 1 / 45, // gated by the 45s base potion cooldown
    uptime: 1,
    rollsDecisive: true,
    classes: ['nightblade'],
    availableIn: ['soloPve', 'groupPve', 'pvp'],
    defaultEnabled: false,
    provenance: SRC_CATALYST,
    confidence: 'high',
    description:
      'Nightblade Siphoning passive: +22 ultimate each time you drink a potion, gated by the 45s potion cooldown (~0.49 ult/s drinking on cooldown). Medicinal Use (faster potions) is not baked in.',
  },

  // ---- Gear sets ------------------------------------------------------------
  {
    id: 'bloodspawn',
    label: 'Bloodspawn (monster set)',
    category: 'set',
    kind: 'triggered',
    // Bloodspawn 2pc: when you take damage, 6% chance to generate up to 13
    // ultimate and raise resistances for 5s, at most once every 5s. The 6% proc
    // gate (not the 5s ICD) dominates the cadence at a typical tank hit rate, so
    // the effective cycle is ~11s → ~0.09 instances/s; uptime scales with how
    // much of the fight you are actively soaking damage. ~0.7 ult/s. Tank-only in
    // practice (damage-taken trigger). rollsDecisive=false: a gear proc, not your
    // own light-attack/ability income.
    amountPerInstance: 13,
    instancesPerSecond: 0.09,
    uptime: 0.6,
    rollsDecisive: false,
    roles: ['tank'],
    availableIn: ['soloPve', 'groupPve', 'pvp'],
    defaultEnabled: false,
    provenance: SRC_BLOODSPAWN,
    confidence: 'medium',
    description:
      'Bloodspawn monster set (2pc): when you take damage, 6% chance to generate up to 13 ultimate (5s cooldown). Effective rate depends on how often you are hit — modeled at ~0.7 ult/s for an actively-tanking build.',
  },

  // NOTE: Cryptcanon Vestments is intentionally NOT modeled as a self-cast
  // source. It grants Minor Heroism but PREVENTS you from casting your own
  // ultimate (casting transfers your ult to group members), so counting it in a
  // "time to YOUR ultimate / casts per fight" calculation would be misleading.
  // It belongs in a future group-battery view, not here.

  // ---- Group support (external) --------------------------------------------
  {
    id: 'pillagers-profit-external',
    label: "Pillager's Profit (from healer)",
    category: 'external',
    kind: 'perCast',
    // Pillager's Profit (Dreadsail Reef, 5pc): when the wearer casts an ultimate
    // in combat, group members gain 2% of the ultimate SPENT *per tick*, every 2s
    // over 10s (= 5 ticks → 10% of the cost total), and a member can only be
    // affected ONCE PER 45s. So one healer-cast grants a DPS 10% of the healer's
    // ult cost, capped to one bundle / 45s:
    //   250-cost ult → 25 ult / 45s ≈ 0.56 ult/s;  500 (max) → 50 ult ≈ 1.1 ult/s.
    // The per-cast amount scales with the healer's ult cost (set in the UI; see
    // PILLAGERS_PROFIT_FRACTION_PER_CAST in compileCatalog.ts). amountPerInstance
    // here is the fallback for a ~250-cost healer ult. The earlier 50/(1/12s)
    // encoding implied ~4.2 ult/s — ~10× too high — because it ignored the 45s
    // lockout and applied a flat 50 regardless of the healer's actual ult.
    amountPerInstance: 25, // 10% of a typical ~250 healer ult (overridden by UI input)
    instancesPerSecond: 1 / 45, // 45s per-target lockout dominates the cadence
    uptime: 1,
    rollsDecisive: false, // externally granted — does not roll the wearer's Decisive
    roles: ['dps'],
    availableIn: ['groupPve'],
    defaultEnabled: false,
    provenance: SRC_PILLAGERS,
    confidence: 'medium',
    description:
      "When a group healer wears Pillager's Profit, casting their ultimate grants you 2% of its cost every 2s for 10s (10% of the cost total) — but only once per 45s. Set your healer's ult cost below; e.g. a 250-cost ult ≈ 25 per cast (~0.55 ult/s), a 500 ult ≈ 50.",
  },
  {
    id: 'arkasis-genius-external',
    label: "Arkasis's Genius (from ally)",
    category: 'external',
    kind: 'triggered',
    // When an ally wearing Arkasis's Genius (Stone Garden, 5pc) drinks a potion in
    // combat, up to 3 group members each gain a flat 44 ultimate. The binding gate
    // is the ally's ~45s potion cooldown (NOT the set's 30s ICD), so ~1/45 → ~0.98
    // ult/s if the ally pots on cooldown. Each recipient gets the full 44.
    amountPerInstance: 44,
    instancesPerSecond: 1 / 45,
    uptime: 1,
    rollsDecisive: false,
    availableIn: ['groupPve'],
    defaultEnabled: false,
    provenance: SRC_ARKASIS,
    confidence: 'medium',
    description:
      "When a group member wears Arkasis's Genius (Stone Garden) and drinks a potion in combat, you gain a flat 44 ultimate — gated by their ~45s potion cooldown (~1 ult/s if they pot on cooldown).",
  },
  {
    id: 'arkays-charity-external',
    label: "Arkay's Charity (ally cleanse)",
    category: 'external',
    kind: 'triggered',
    // When an ally wearing Arkay's Charity cleanses a negative effect from you, you
    // gain 13 ultimate, once every 9s per target. Highly fight-dependent — only
    // when you actually have a removable debuff that gets purged. Conservative 25%
    // realization of the 9s window → ~0.36 ult/s; near-zero with no debuffs.
    amountPerInstance: 13,
    instancesPerSecond: 1 / 9,
    uptime: 0.25,
    rollsDecisive: false,
    availableIn: ['groupPve', 'pvp'],
    defaultEnabled: false,
    provenance: SRC_ARKAYS,
    confidence: 'low',
    description:
      "When an ally wearing Arkay's Charity cleanses a negative effect from you, you gain 13 ultimate (9s per-target cooldown). Highly situational — only when you have a removable debuff that gets purged; near-zero in fights with no debuffs.",
  },
  {
    id: 'colovian-highlands-general-external',
    label: 'Colovian Highlands General (from ally)',
    category: 'external',
    kind: 'perCast',
    // PvP Elite set (Cyrodiil, 2pc). When an ally wearing it kills a Player nearby,
    // you gain a flat 15 ultimate (no ICD — bounded only by kill cadence). Modeled
    // at ~one shared kill / 72s ≈ 0.21 ult/s averaged; far higher in an active
    // burst, near-zero during downtime. PvP-only.
    amountPerInstance: 15,
    instancesPerSecond: 1 / 72,
    uptime: 1,
    rollsDecisive: false,
    availableIn: ['pvp'],
    defaultEnabled: false,
    provenance: SRC_COLOVIAN,
    confidence: 'low',
    description:
      'PvP Cyrodiil Elite set: when an ally wearing it kills a Player near you, you gain a flat 15 ultimate (no cooldown — bounded by kill cadence). Modeled at ~0.2 ult/s over a session; spikes during active fights. Tune the uptime to your engagement.',
  },

  // ---- Group synergies ------------------------------------------------------
  {
    id: 'kraglens-howl-heed-the-call',
    label: 'Heed the Call (Kraglen’s Howl synergy)',
    category: 'synergy',
    kind: 'triggered',
    // Kraglen's Howl (Stone Garden, 5pc): after a recently-damaged enemy dies, you
    // grant allies the Heed the Call synergy; activating it gives you and the
    // activator 12 ultimate, once every 20s. Distinct flat-ult synergy (not
    // Heroism). Death-gated + depends on an ally pressing it → ~0.3 ult/s in
    // add-heavy pulls, up to 0.6 at a perfect 20s cadence, near-zero on clean ST.
    amountPerInstance: 12,
    instancesPerSecond: 1 / 20,
    uptime: 0.5,
    rollsDecisive: false,
    availableIn: ['groupPve', 'pvp'],
    defaultEnabled: false,
    provenance: SRC_KRAGLENS,
    confidence: 'medium',
    description:
      'Kraglen’s Howl set (Stone Garden, 5pc): after a damaged enemy dies you grant allies the Heed the Call synergy; activating it gives you 12 ultimate, once every 20s. Add-death-gated — ~0.3 ult/s in add-heavy pulls, near-zero on a clean single-target boss.',
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
    provenance: SRC_POWERSTONE,
    confidence: 'high',
    description:
      'Sorcerer Daedric Summoning passive: reduces the cost of your ultimate abilities by 15%.',
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
    provenance: SRC_RESTORING_SPIRIT,
    confidence: 'high',
    description:
      "Templar Dawn's Wrath passive: reduces all ability costs, including ultimate, by 5%.",
  },
];

/**
 * Known ultimates and their base costs (max rank), for the time-to-ultimate
 * picker. A representative set of commonly-run raid/dungeon ultimates across all
 * classes plus the popular guild/weapon-line ults. Costs are U50-current; morphs
 * of the same base share a cost, so one representative morph is listed per base.
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
  // Guild / weapon lines (available to every class)
  {
    id: 'dawnbreaker',
    label: 'Dawnbreaker / Flawless (Fighters Guild)',
    baseCost: 125,
    owner: 'weapon',
    provenance: 'https://eso-skillbook.com/skill/flawless-dawnbreaker',
    confidence: 'high',
  },
  // Dragonknight
  {
    id: 'standard-of-might',
    label: 'Standard of Might (Dragonknight)',
    baseCost: 200,
    owner: 'dragonknight',
    provenance: 'https://eso-skillbook.com/skill/standard-of-might',
    confidence: 'high',
  },
  {
    id: 'shifting-standard',
    label: 'Shifting Standard (Dragonknight)',
    baseCost: 200,
    owner: 'dragonknight',
    provenance: 'https://eso-skillbook.com/skill/shifting-standard',
    confidence: 'high',
  },
  {
    id: 'corrosive-armor',
    label: 'Corrosive Armor / Magma Shell (Dragonknight)',
    baseCost: 200,
    owner: 'dragonknight',
    provenance: 'https://eso-skillbook.com/skill/corrosive-armor',
    confidence: 'high',
  },
  // Sorcerer
  {
    id: 'storm-atronach',
    label: 'Greater Storm Atronach (Sorcerer)',
    baseCost: 200,
    owner: 'sorcerer',
    provenance: 'https://eso-skillbook.com/skill/greater-storm-atronach',
    confidence: 'high',
  },
  {
    id: 'negate-magic',
    label: 'Negate Magic / Suppression Field (Sorcerer)',
    baseCost: 225,
    owner: 'sorcerer',
    provenance: 'https://eso-skillbook.com/skill/suppression-field',
    confidence: 'high',
  },
  // Nightblade
  {
    id: 'incapacitating-strike',
    label: 'Incapacitating Strike / Soul Harvest (Nightblade)',
    baseCost: 70,
    owner: 'nightblade',
    provenance: 'https://eso-skillbook.com/skill/incapacitating-strike',
    confidence: 'high',
  },
  // Templar
  {
    id: 'nova',
    label: 'Nova / Solar Disturbance (Templar)',
    baseCost: 225,
    owner: 'templar',
    provenance: 'https://eso-skillbook.com/skill/solar-disturbance',
    confidence: 'high',
  },
  // Warden
  {
    id: 'permafrost',
    label: 'Permafrost / Northern Storm (Warden)',
    baseCost: 200,
    owner: 'warden',
    provenance: 'https://eso-skillbook.com/skill/permafrost',
    confidence: 'high',
  },
  // Necromancer
  {
    id: 'colossus',
    label: 'Pestilent / Glacial Colossus (Necromancer)',
    baseCost: 175,
    owner: 'necromancer',
    provenance: 'https://eso-skillbook.com/skill/pestilent-colossus',
    confidence: 'high',
  },
  // Arcanist
  {
    id: 'the-unblinking-eye',
    label: 'The Unblinking Eye (Arcanist)',
    baseCost: 175,
    owner: 'arcanist',
    provenance: 'https://eso-skillbook.com/skill/the-unblinking-eye',
    confidence: 'high',
  },
  {
    id: 'gibbering-shield',
    label: 'Gibbering Shield / Sanctum of the Abyssal Sea (Arcanist)',
    baseCost: 200,
    owner: 'arcanist',
    provenance: 'https://eso-skillbook.com/skill/gibbering-shield',
    confidence: 'high',
  },
  {
    id: 'vitalizing-glyphic',
    label: 'Vitalizing Glyphic / Glyphic of the Tides (Arcanist)',
    baseCost: 200,
    owner: 'arcanist',
    provenance: 'https://eso-skillbook.com/skill/vitalizing-glyphic',
    confidence: 'high',
  },
  // Dragonknight (additional)
  {
    id: 'dragon-leap',
    label: 'Dragon Leap / Take Flight (Dragonknight)',
    baseCost: 125,
    owner: 'dragonknight',
    provenance: 'https://eso-skillbook.com/skill/dragon-leap',
    confidence: 'high',
  },
  // Nightblade (additional)
  {
    id: 'consuming-darkness',
    label: 'Consuming Darkness / Veil of Blades (Nightblade)',
    baseCost: 200,
    owner: 'nightblade',
    provenance: 'https://eso-skillbook.com/skill/consuming-darkness',
    confidence: 'high',
  },
  {
    id: 'soul-shred',
    label: 'Soul Shred / Soul Tether / Soul Siphon (Nightblade)',
    baseCost: 150,
    owner: 'nightblade',
    provenance: 'https://eso-skillbook.com/skill/soul-shred',
    confidence: 'high',
  },
  // Templar (additional)
  {
    id: 'radial-sweep',
    label: 'Radial Sweep / Crescent Sweep (Templar)',
    baseCost: 75,
    owner: 'templar',
    provenance: 'https://eso-skillbook.com/skill/radial-sweep',
    confidence: 'high',
  },
  {
    id: 'rite-of-passage',
    label: 'Rite of Passage / Remembrance (Templar)',
    baseCost: 125,
    owner: 'templar',
    provenance: 'https://eso-skillbook.com/skill/rite-of-passage',
    confidence: 'high',
  },
  // Warden (additional)
  {
    id: 'feral-guardian',
    label: "Feral Guardian / Wild Guardian (Warden, Guardian's Wrath)",
    baseCost: 75,
    owner: 'warden',
    provenance: 'https://eso-skillbook.com/skill/feral-guardian',
    confidence: 'medium',
  },
  {
    id: 'secluded-grove',
    label: 'Secluded Grove / Healing Thicket (Warden)',
    baseCost: 90,
    owner: 'warden',
    provenance: 'https://eso-skillbook.com/skill/secluded-grove',
    confidence: 'high',
  },
  // Necromancer (additional)
  {
    id: 'bone-goliath-transformation',
    label: 'Bone Goliath / Pummeling Goliath / Ravenous Goliath (Necromancer)',
    baseCost: 250,
    owner: 'necromancer',
    provenance: 'https://eso-skillbook.com/skill/bone-goliath-transformation',
    confidence: 'high',
  },
  {
    id: 'reanimate',
    label: 'Reanimate / Animate Blastbones / Renewing Animation (Necromancer)',
    baseCost: 335,
    owner: 'necromancer',
    provenance: 'https://eso-skillbook.com/skill/reanimate',
    confidence: 'high',
  },
  // Weapon lines (available to every class)
  {
    id: 'lacerate',
    label: 'Lacerate / Rend / Thrive in Chaos (Dual Wield)',
    baseCost: 150,
    owner: 'weapon',
    provenance: 'https://eso-skillbook.com/skill/lacerate',
    confidence: 'high',
  },
  {
    id: 'rapid-fire',
    label: 'Rapid Fire / Toxic Barrage / Ballista (Bow)',
    baseCost: 175,
    owner: 'weapon',
    provenance: 'https://eso-skillbook.com/skill/rapid-fire',
    confidence: 'high',
  },
  {
    id: 'elemental-storm',
    label: 'Elemental Storm / Elemental Rage / Eye of the Storm (Destruction Staff)',
    baseCost: 250,
    owner: 'weapon',
    provenance: 'https://eso-skillbook.com/skill/elemental-storm',
    confidence: 'high',
  },
  {
    id: 'panacea',
    label: "Panacea / Life Giver / Light's Champion (Restoration Staff)",
    baseCost: 125,
    owner: 'weapon',
    provenance: 'https://eso-skillbook.com/skill/panacea',
    confidence: 'high',
  },
  // Guild / world / Alliance War lines (available to every class)
  {
    id: 'meteor',
    label: 'Meteor / Shooting Star / Ice Comet (Mages Guild)',
    baseCost: 200,
    owner: 'global',
    provenance: 'https://eso-skillbook.com/skill/meteor',
    confidence: 'high',
  },
  {
    id: 'soul-strike',
    label: 'Soul Strike / Soul Assault / Shatter Soul (Soul Magic)',
    baseCost: 175,
    owner: 'global',
    provenance: 'https://eso-skillbook.com/skill/soul-strike',
    confidence: 'high',
  },
  {
    id: 'undo-psijic',
    label: 'Precognition / Temporal Guard (Psijic Order)',
    baseCost: 150,
    owner: 'global',
    provenance: 'https://en.uesp.net/wiki/Online:Undo',
    confidence: 'high',
  },
  {
    id: 'war-horn',
    label: 'War Horn / Aggressive Horn / Sturdy Horn (Alliance War)',
    baseCost: 250,
    owner: 'global',
    provenance: 'https://eso-skillbook.com/skill/war-horn',
    confidence: 'high',
  },
  {
    id: 'barrier',
    label: 'Barrier / Reviving Barrier / Replenishing Barrier (Support)',
    baseCost: 200,
    owner: 'global',
    provenance: 'https://en.uesp.net/wiki/Online:Barrier',
    confidence: 'medium',
  },
];

export { SRC_MINOR_HEROISM_POTION, UESP_DECISIVE };

/**
 * The practical sustainable ultimate-per-second ceiling (≈ Warden's best). Used
 * only as a sanity flag in the UI — there is no hard per-second cap in game, but
 * a sustained rate above this almost certainly means the inputs are unrealistic.
 */
export const SANITY_MAX_ULT_PER_SECOND = 7;

/** Maximum ultimate that can be banked (hard pool cap). */
export const MAX_ULTIMATE_POOL = 500;
